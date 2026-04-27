import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Incident, Staff } from '../types';
import { handleFirestoreError, OperationType } from '../lib/utils';
import IncidentCard from './IncidentCard';
import { AlertTriangle, ListFilter, Bell, Clock, Activity, Users, Megaphone, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function StaffDashboard({ staff }: { staff: Staff }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [globalStatus, setGlobalStatus] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'my' | 'pending'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'incidents'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Incident));
      setIncidents(data);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'incidents');
    });

    const statusRef = doc(db, 'system', 'status');
    const unsubStatus = onSnapshot(statusRef, (snap) => {
      setGlobalStatus(snap.exists() ? snap.data() : null);
    });

    return () => {
      unsub();
      unsubStatus();
    };
  }, []);

  const triggerBroadcast = async (type: 'Fire' | 'Threat' | 'Clear') => {
    try {
      const statusRef = doc(db, 'system', 'status');
      if (type === 'Clear') {
        await updateDoc(statusRef, { isActive: false, sirenActive: false, type: 'Clear', timestamp: serverTimestamp() });
      } else {
        await setDoc(statusRef, {
          isActive: true,
          sirenActive: true,
          type,
          message: type === 'Fire' ? "EVACUATE IMMEDIATELY. Smoke detected in sector 4. Do not use elevators." : "SECURITY THREAT. Lock all doors and stay away from windows. Wait for further instructions.",
          timestamp: serverTimestamp()
        });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'system/status');
    }
  };

  const filteredIncidents = incidents.filter(inc => {
    if (filter === 'my') return inc.staffId === staff.id;
    if (filter === 'pending') return inc.status === 'reported';
    return true;
  });

  // Calculate some quick stats
  const activeAlerts = incidents.filter(i => i.status !== 'resolved').length;
  const criticalThreats = incidents.filter(i => i.type === 'Threat' && i.status !== 'resolved').length;
  
  const resolved = incidents.filter(i => i.status === 'resolved' && i.resolvedAt && i.createdAt);
  const avgResponse = resolved.length > 0
    ? (resolved.reduce((acc, i) => acc + (i.resolvedAt.toMillis() - i.createdAt.toMillis()), 0) / resolved.length / 60000).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-8 pb-20">
      {/* Manager Controls: Global Broadcast */}
      {staff.role === 'Manager' && (
        <div className="p-8 bg-red-600/5 border border-red-600/20 rounded-[40px] space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-600 rounded-2xl shadow-[0_0_20px_rgba(220,38,38,0.4)]">
                <Megaphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black italic uppercase tracking-tight">Emergency Broadcast Matrix</h3>
                <p className="text-[10px] text-white/40 uppercase font-mono tracking-[0.2em]">Global Guest Notification Control</p>
              </div>
            </div>
            {globalStatus?.isActive && (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-full animate-pulse">
                <AlertTriangle className="w-4 h-4 text-white" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Broadcast Active</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <button
              onClick={() => triggerBroadcast('Fire')}
              className="group bg-red-600/10 border border-red-600/30 p-6 rounded-3xl hover:bg-red-600 hover:text-white transition-all text-left space-y-2"
            >
              <h4 className="font-black uppercase tracking-tight italic">Level 1: FIRE</h4>
              <p className="text-[10px] text-white/40 group-hover:text-white/80 uppercase font-mono">Trigger Evacuation Siren</p>
            </button>
            <button
              onClick={() => triggerBroadcast('Threat')}
              className="group bg-yellow-600/10 border border-yellow-600/30 p-6 rounded-3xl hover:bg-yellow-600 hover:text-white transition-all text-left space-y-2"
            >
              <h4 className="font-black uppercase tracking-tight italic">Level 2: THREAT</h4>
              <p className="text-[10px] text-white/40 group-hover:text-white/80 uppercase font-mono">Activate Lockdown Mode</p>
            </button>
            <button
              onClick={() => triggerBroadcast('Clear')}
              className="group bg-white/5 border border-white/10 p-6 rounded-3xl hover:bg-white hover:text-black transition-all text-left space-y-2"
            >
              <h4 className="font-black uppercase tracking-tight italic">CLEAR ALL</h4>
              <p className="text-[10px] text-white/40 group-hover:text-black/50 uppercase font-mono">Reset System to Normal</p>
            </button>
            {globalStatus?.isActive && (
              <button
                onClick={async () => {
                  try {
                    await updateDoc(doc(db, 'system', 'status'), { sirenActive: !globalStatus.sirenActive });
                  } catch (e) {
                    handleFirestoreError(e, OperationType.WRITE, 'system/status');
                  }
                }}
                className={`p-6 rounded-3xl border transition-all text-left space-y-2 ${
                  globalStatus.sirenActive 
                  ? 'bg-orange-600/10 border-orange-600/30 hover:bg-orange-600 hover:text-white' 
                  : 'bg-green-600/10 border-green-600/30 hover:bg-green-600 hover:text-white'
                }`}
              >
                <h4 className="font-black uppercase tracking-tight italic">
                  {globalStatus.sirenActive ? 'SILENCE SIREN' : 'RESUME SIREN'}
                </h4>
                <p className="text-[10px] text-white/40 group-hover:text-white/80 uppercase font-mono">
                  {globalStatus.sirenActive ? 'Stop global audio alarm' : 'Restart emergency siren'}
                </p>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Active Alerts" 
          value={activeAlerts} 
          icon={AlertTriangle} 
          color={activeAlerts > 0 ? "text-red-500" : "text-white/20"}
          highlight={activeAlerts > 0} 
        />
        <StatCard 
          label="Critical Threats" 
          value={criticalThreats} 
          icon={Bell} 
          color={criticalThreats > 0 ? "text-yellow-500" : "text-white/20"} 
          highlight={criticalThreats > 0}
        />
        <StatCard 
          label="Avg Response" 
          value={`${avgResponse}m`} 
          icon={Clock} 
          color="text-blue-500" 
        />
        <StatCard 
          label="Active Staff" 
          value={4} 
          icon={Users} 
          color="text-green-500" 
        />
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20">
            <Activity className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight italic">Live Incident Feed</h2>
            <p className="text-[10px] text-white/30 font-mono tracking-widest uppercase">Encrypted Real-Time Synchronization</p>
          </div>
        </div>

        <div className="flex bg-white/[0.03] p-1 rounded-2xl border border-white/5">
          {[
            { id: 'all', label: 'All Alerts', icon: ListFilter },
            { id: 'pending', label: 'Unassigned', icon: AlertTriangle },
            { id: 'my', label: 'Assigned to me', icon: Users },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilter(btn.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                filter === btn.id ? 'bg-white/10 text-white shadow-xl' : 'text-white/40 hover:text-white/60'
              }`}
            >
              <btn.icon className="w-3 h-3" />
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Incident Grid */}
      <AnimatePresence mode="popLayout">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredIncidents.length > 0 ? (
            filteredIncidents.map((incident) => (
              <IncidentCard key={incident.id} incident={incident} staff={staff} />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[40px] space-y-4"
            >
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                <CheckCircleIcon className="w-8 h-8 text-white/20" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-bold text-white/40 uppercase tracking-tight">System Status: All Clear</p>
                <p className="text-[10px] text-white/20 font-mono uppercase tracking-[0.2em]">No active incidents reported in this zone</p>
              </div>
            </motion.div>
          )}
        </div>
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, highlight = false }: any) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`p-6 bg-white/[0.03] border rounded-[32px] space-y-1 group transition-all duration-500 ${highlight ? 'border-red-500/30' : 'border-white/5'}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-xl bg-black border border-white/5 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {highlight && (
          <div className="flex gap-1">
            <div className={`w-1 h-1 rounded-full animate-pulse ${color.replace('text', 'bg')}`} />
            <div className={`w-1 h-1 rounded-full animate-pulse delay-75 ${color.replace('text', 'bg')}`} />
            <div className={`w-1 h-1 rounded-full animate-pulse delay-150 ${color.replace('text', 'bg')}`} />
          </div>
        )}
      </div>
      <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-mono">{label}</p>
      <p className={`text-3xl font-black italic tracking-tighter ${highlight ? 'text-white' : 'text-white/80'}`}>{value}</p>
    </motion.div>
  );
}

function CheckCircleIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
