import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { Incident, Staff, IncidentStatus } from '../types';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { Flame, Activity, ShieldAlert, CircleHelp, MapPin, Clock, CheckCircle2, Navigation, AlertCircle, Info, Users } from 'lucide-react';
import { motion } from 'motion/react';

const TYPE_CONFIG = {
  Fire: { icon: Flame, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  Medical: { icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  Threat: { icon: ShieldAlert, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  Other: { icon: CircleHelp, color: 'text-gray-400', bg: 'bg-gray-400/10', border: 'border-white/10' },
};

export default function IncidentCard({ incident, staff }: { incident: Incident; staff: Staff }) {
  const [elapsed, setElapsed] = useState(0);
  const config = TYPE_CONFIG[incident.type];

  useEffect(() => {
    if (incident.status === 'resolved') return;
    const interval = setInterval(() => {
      const created = incident.createdAt?.toMillis() || Date.now();
      setElapsed(Math.floor((Date.now() - created) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [incident.createdAt, incident.status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const updateStatus = async (status: IncidentStatus) => {
    try {
      const incidentRef = doc(db, 'incidents', incident.id);
      const updateData: any = { status, updatedAt: serverTimestamp() };
      
      if (status === 'accepted') updateData.staffId = staff.id;
      if (status === 'resolved') updateData.resolvedAt = serverTimestamp();
      if (status === 'escalated') updateData.escalatedAt = serverTimestamp();

      await updateDoc(incidentRef, updateData);

      // Log activity
      await addDoc(collection(db, 'incidents', incident.id, 'activity'), {
        incidentId: incident.id,
        userId: staff.id,
        userName: staff.name,
        message: `Status updated to ${status}`,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `incidents/${incident.id}`);
    }
  };

  const isAssignedToMe = incident.staffId === staff.id;
  const isPending = incident.status === 'reported';
  const isEscalated = incident.status === 'escalated';
  
  // Auto escalation simulation check (client-side trigger for Demo)
  useEffect(() => {
    if (incident.type === 'Threat' && incident.status !== 'resolved' && incident.status !== 'escalated' && elapsed > 600) {
      // 600s = 10min
      updateStatus('escalated');
    }
  }, [elapsed]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative p-6 rounded-[32px] border ${isEscalated ? 'border-red-600 bg-red-600/5 shadow-[0_0_40px_rgba(220,38,38,0.2)]' : config.border} ${config.bg} overflow-hidden group`}
    >
      {isEscalated && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-red-600 animate-pulse" />
      )}

      {/* Header Info */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl bg-black border border-white/5 ${config.color}`}>
            <config.icon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black italic uppercase tracking-tight">{incident.type} ALERT</h3>
              {isEscalated && (
                <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase animate-pulse">Escalated</span>
              )}
            </div>
            <p className="text-[10px] text-white/40 font-mono uppercase tracking-[0.2em]">{incident.id}</p>
          </div>
        </div>
        <div className="text-right">
          <div className={`flex items-center gap-1.5 text-xs font-bold font-mono ${elapsed > 300 ? 'text-red-500' : 'text-white/60'}`}>
            <Clock className="w-3 h-3" />
            {formatTime(elapsed)}
          </div>
          <p className="text-[10px] text-white/30 uppercase font-mono tracking-widest mt-1">Response Time</p>
        </div>
      </div>

      {/* Location Section */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-1">
          <p className="text-[10px] text-white/30 uppercase font-mono tracking-widest">Floor</p>
          <p className="text-xl font-black italic">{incident.floor}F</p>
        </div>
        <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-1 overflow-hidden">
          <p className="text-[10px] text-white/30 uppercase font-mono tracking-widest">Location</p>
          <div className="flex items-center gap-2 overflow-hidden">
            <MapPin className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm font-bold truncate">{incident.guestLocation}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {incident.status !== 'resolved' && (isAssignedToMe || isPending || staff.role === 'Manager') && (
          <div className="flex-1 flex gap-2">
            {isPending ? (
              <button
                onClick={() => updateStatus('accepted')}
                className="flex-1 bg-white text-black py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-xl flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Accept
              </button>
            ) : (
              <>
                {incident.status === 'accepted' && (
                  <button
                    onClick={() => updateStatus('on-the-way')}
                    className="flex-1 bg-blue-600 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl flex items-center justify-center gap-2"
                  >
                    <Navigation className="w-4 h-4" />
                    En Route
                  </button>
                )}
                {(incident.status === 'on-the-way' || isEscalated) && (
                  <button
                    onClick={() => updateStatus('resolved')}
                    className="flex-1 bg-green-600 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-green-500 transition-all shadow-xl flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Resolve
                  </button>
                )}
                {staff.role === 'Manager' && incident.staffId && (
                  <button
                    onClick={() => updateStatus('reported')} // Reset to reported for reassignment
                    className="px-4 py-4 rounded-2xl border border-white/20 text-white/40 hover:text-white hover:border-white transition-all"
                    title="Reassign Alert"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {incident.status === 'resolved' && (
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-center gap-2 py-4 text-green-500 text-center font-black uppercase tracking-widest text-xs">
              <CheckCircle2 className="w-5 h-5" />
              Situation Resolved
            </div>
            {incident.escalatedAt && (
              <p className="text-[9px] text-center text-white/30 uppercase font-mono tracking-tighter">
                Resolution verified after security escalation
              </p>
            )}
          </div>
        )}

        {incident.status !== 'resolved' && incident.status !== 'escalated' && (
          <button
            onClick={() => updateStatus('escalated')}
            className="px-4 py-4 rounded-2xl border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all shrink-0"
            title="Escalate Alert"
          >
            <AlertCircle className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Assignment Info */}
      {incident.staffId && incident.status !== 'resolved' && (
        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
              <Activity className="w-3 h-3 text-white/50" />
            </div>
            <p className="text-[10px] text-white/50 uppercase tracking-widest font-mono">
              Staff: <span className="text-white">{isAssignedToMe ? 'You' : 'Assigned'}</span>
            </p>
          </div>
          <div className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${incident.status === 'accepted' ? 'text-blue-500 border-blue-500/20' : 'text-green-500 border-green-500/20'}`}>
            {incident.status}
          </div>
        </div>
      )}

      {isEscalated && (
        <div className="mt-4 p-3 bg-red-600/20 border border-red-600/30 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-red-500">
            <Info className="w-3 h-3" />
            <p className="text-[10px] font-bold uppercase tracking-widest">Protocol Activated</p>
          </div>
          <p className="text-[9px] text-white/60 leading-relaxed uppercase font-mono">
            Police Notified. General Evacuation Protocol Pending Manager Approval.
          </p>
        </div>
      )}
    </motion.div>
  );
}
