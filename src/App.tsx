/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import GuestHome from './components/GuestHome';
import StaffDashboard from './components/StaffDashboard';
import StaffLogin from './components/StaffLogin';
import { Staff } from './types';
import { Shield, Loader2, LogOut, AlertOctagon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<'guest' | 'staff' | 'login'>('guest');
  const [loading, setLoading] = useState(true);
  const [staffProfile, setStaffProfile] = useState<Staff | null>(null);
  const [globalAlert, setGlobalAlert] = useState<{ isActive: boolean; sirenActive: boolean; type: string; message: string; timestamp?: any } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Global Alert Listener
    const statusRef = doc(db, 'system', 'status');
    const unsubStatus = onSnapshot(statusRef, (snap) => {
      if (snap.exists() && snap.data().isActive) {
        const data = snap.data();
        setGlobalAlert(prev => {
          if (!prev || prev.timestamp?.toMillis() !== data.timestamp?.toMillis()) {
            setIsMuted(false);
            setIsDismissed(false);
          }
          return data as any;
        });
      } else {
        setGlobalAlert(null);
        setIsMuted(false);
        setIsDismissed(false);
      }
    }, (err) => {
      console.error("Global status error", err);
    });

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const staffRef = doc(db, 'staff', u.uid);
          const snap = await getDoc(staffRef);
          if (snap.exists()) {
            setStaffProfile({ id: snap.id, ...snap.data() } as Staff);
            setView('staff');
          } else {
            if (u.email === 'aj5662528@gmail.com' && u.emailVerified) {
              const newStaff: Staff = {
                id: u.uid,
                name: u.displayName || u.email?.split('@')[0] || 'Manager',
                role: 'Manager',
                status: 'available',
                email: u.email || ''
              };
              await setDoc(staffRef, newStaff);
              setStaffProfile(newStaff);
              setView('staff');
            } else {
              setStaffProfile(null);
              setView('guest');
            }
          }
        } catch (e) {
          console.error("Error fetching staff profile", e);
          setView('guest');
        }
      } else {
        setStaffProfile(null);
        if (view === 'staff') setView('guest');
      }
      setLoading(false);
    });
    return () => {
      unsub();
      unsubStatus();
    };
  }, []);

  const handleLogout = () => {
    signOut(auth);
    setView('guest');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-red-500/30">
      {/* Global Crisis Overlay */}
      <AnimatePresence>
        {globalAlert && !isDismissed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-red-600/20 backdrop-blur-3xl flex items-center justify-center p-6"
          >
            {/* Hidden audio element for the alarm */}
            {!isMuted && globalAlert.sirenActive && (
              <audio autoPlay loop src="https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3" />
            )}
            
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.4)_0%,transparent_70%)] pointer-events-none animate-pulse" />
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="relative max-w-lg w-full bg-black border-4 border-red-600 p-10 rounded-[60px] text-center space-y-6 shadow-[0_0_100px_rgba(220,38,38,0.5)] overflow-hidden"
            >
              <div className="scan-line" />
              <div className="relative z-10 space-y-6">
                <div className="w-24 h-24 bg-red-600 rounded-full mx-auto flex items-center justify-center animate-bounce">
                  <AlertOctagon className="w-12 h-12 text-white" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-5xl font-black uppercase tracking-tighter italic text-red-600 animate-pulse">EMERGENCY ALERT</h2>
                  <h3 className="text-2xl font-bold uppercase">{globalAlert.type} IN PROGRESS</h3>
                </div>
                <div className="p-6 bg-red-600/10 border border-red-600/30 rounded-3xl">
                  <p className="text-xl font-bold text-red-500">{globalAlert.message}</p>
                </div>
                <div className="flex flex-col gap-4">
                  <p className="text-[10px] text-white/30 font-mono uppercase tracking-[0.3em]">Follow evacuation protocols immediately. Response teams deployed.</p>
                  
                  {!isMuted && globalAlert.sirenActive && (
                    <button 
                      onClick={() => setIsMuted(true)}
                      className="w-full py-4 bg-red-600 text-white rounded-2xl text-[10px] uppercase tracking-widest font-black hover:bg-red-700 transition-all"
                    >
                      Mute Alarm & Acknowledge
                    </button>
                  )}

                  <button 
                    onClick={() => {
                      setIsMuted(true);
                      setIsDismissed(true);
                    }}
                    className="w-full py-4 border border-white/10 rounded-2xl text-[10px] uppercase tracking-widest font-black hover:bg-white hover:text-black transition-all"
                  >
                    Dismiss & Return to Interface
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-red-500/20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('guest')}>
          <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.5)]">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tighter uppercase italic">One-Tap SOS</h1>
            <p className="text-[10px] text-red-500/70 font-mono tracking-widest uppercase">Crisis Coordination System</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <AnimatePresence mode="wait">
            {!user ? (
               view === 'login' ? (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setView('guest')}
                  className="text-[10px] uppercase tracking-widest font-bold text-white/50 px-4 py-2 hover:text-white transition-colors"
                >
                  Cancel
                </motion.button>
               ) : (
                <motion.button
                  key="login-btn"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setView('login')}
                  className="text-xs uppercase tracking-widest font-bold bg-white text-black px-4 py-2 rounded-full hover:bg-red-500 hover:text-white transition-colors"
                >
                  Staff Portal
                </motion.button>
               )
            ) : (
              <motion.div
                key="user-box"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-4"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-white uppercase">{staffProfile?.name || user.displayName || user.email?.split('@')[0]}</p>
                  <p className="text-[10px] text-red-500 uppercase tracking-widest">{staffProfile?.role || 'User'}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 bg-red-500/10 border border-red-500/20 rounded-full hover:bg-red-500/20 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <main className="pt-24 pb-12 px-6 max-w-7xl mx-auto min-h-screen">
        <AnimatePresence mode="wait">
          {view === 'guest' && (
            <motion.div
              key="guest"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <GuestHome user={user} />
            </motion.div>
          )}
          {view === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center justify-center py-12"
            >
              <StaffLogin />
            </motion.div>
          )}
          {view === 'staff' && (
            <motion.div
              key="staff"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <StaffDashboard staff={staffProfile!} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Persistent Footer */}
      <footer className="py-8 bg-black border-t border-white/5 text-center">
        <p className="text-[10px] text-white/30 tracking-[0.2em] font-mono uppercase">
          &copy; 2026 Hospitality Security Matrix | All Operations Logged
        </p>
      </footer>
    </div>
  );
}
