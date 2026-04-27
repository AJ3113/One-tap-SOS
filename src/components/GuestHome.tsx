import { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { EmergencyType } from '../types';
import { Flame, Activity, ShieldAlert, CircleHelp, MapPin, Send, CheckCircle2, Info, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/utils';

const EMERGENCY_TYPES: { type: EmergencyType; label: string; icon: any; color: string; description: string }[] = [
  { type: 'Fire', label: 'Fire Incident', icon: Flame, color: 'text-red-500', description: 'Immediate threat from fire or smoke' },
  { type: 'Medical', label: 'Medical Emergency', icon: Activity, color: 'text-blue-500', description: 'Illness or injury requiring first-aid/doctor' },
  { type: 'Threat', label: 'Security Threat', icon: ShieldAlert, color: 'text-yellow-500', description: 'Human threat, harassment, or violent behavior' },
  { type: 'Other', label: 'Other Urgent Assistance', icon: CircleHelp, color: 'text-gray-400', description: 'Service needs requiring immediate staff safety intervention' },
];

const ADVICE_LIBRARY: Record<EmergencyType, string[]> = {
  Fire: [
    "Stay low to the ground to avoid smoke inhalation.",
    "Do not use elevators. Use the nearest marked stairs level.",
    "Touch doors with the back of your hand before opening.",
    "If trapped, seal door gaps with wet towels."
  ],
  Medical: [
    "Stay with the patient until help arrives.",
    "Do not move the person unless they are in immediate danger.",
    "Keep the person warm and speak calmly to them.",
    "Clear the area of bystanders to allow teams access."
  ],
  Threat: [
    "Run: If there is a safe path, exit immediately.",
    "Hide: If you cannot escape, find a room and lock/barricade the door.",
    "Fight: As a last resort, defend yourself with any available objects.",
    "Silence your mobile device and turn off lights."
  ],
  Other: [
    "Remain in a safe location until staff contact you.",
    "Keep your mobile device active for follow-up questions.",
    "Do not attempt to resolve the situation personally.",
    "Wait level-headed for the security team arrival."
  ]
};

export default function GuestHome({ user }: { user: any }) {
  const [step, setStep] = useState<'type' | 'location' | 'sending' | 'confirmed'>('type');
  const [selectedType, setSelectedType] = useState<EmergencyType | null>(null);
  const [location, setLocation] = useState('');
  const [floor, setFloor] = useState<number>(1);

  const handleSelectType = (type: EmergencyType) => {
    setSelectedType(type);
    setStep('location');
  };

  const sendSOS = async () => {
    if (!selectedType || !location) return;
    setStep('sending');

    const incidentId = `sos-${Date.now()}`;
    const reporterId = user?.uid || `guest-${Math.random().toString(36).substr(2, 9)}`;

    const newIncident: any = {
      type: selectedType,
      guestLocation: location,
      floor: floor,
      status: 'reported',
      staffId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      reporterId: reporterId,
    };

    try {
      await setDoc(doc(db, 'incidents', incidentId), newIncident);
      setStep('confirmed');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `incidents/${incidentId}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-black tracking-tighter uppercase italic italic">How can we assist?</h2>
        <p className="text-white/50 text-sm">Select an emergency type for immediate priority response.</p>
      </div>

      <AnimatePresence mode="wait">
        {step === 'type' && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {EMERGENCY_TYPES.map((item) => (
              <button
                key={item.type}
                onClick={() => handleSelectType(item.type)}
                className="group relative flex flex-col items-start p-6 bg-white/[0.03] border border-white/10 rounded-3xl hover:bg-white/[0.08] hover:border-white/30 transition-all text-left"
              >
                <div className={`p-3 rounded-2xl bg-black border border-white/5 mb-4 group-hover:scale-110 transition-transform ${item.color}`}>
                  <item.icon className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold uppercase tracking-tight mb-2">{item.label}</h3>
                <p className="text-sm text-white/50">{item.description}</p>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className={`w-2 h-2 rounded-full animate-ping ${item.color.replace('text', 'bg')}`} />
                </div>
              </button>
            ))}
          </motion.div>
        )}

        {step === 'location' && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="p-8 bg-white/[0.03] border border-white/10 rounded-3xl space-y-8"
          >
            <div className="flex items-center gap-4 text-red-500">
              <MapPin className="w-10 h-10" />
              <h3 className="text-2xl font-bold uppercase">Confirm Location</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-mono">Floor Level</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFloor(f)}
                      className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${
                        floor === f ? 'bg-red-500 border-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'border-white/10 hover:border-white/30 text-white/50'
                      }`}
                    >
                      {f}F
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-mono">Room / Area Description</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Room 402, Lobby Bar, Gym..."
                  className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:border-red-500 transition-colors"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep('type')}
                className="flex-1 py-4 rounded-2xl border border-white/10 text-white/50 font-bold uppercase tracking-widest hover:bg-white/5 transition-colors"
              >
                Back
              </button>
              <button
                disabled={!location}
                onClick={sendSOS}
                className="flex-[2] bg-red-600 hover:bg-red-500 text-white py-4 rounded-2xl text-lg font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(239,68,68,0.3)] disabled:opacity-50 disabled:cursor-not-allowed group transition-all"
              >
                SEND SOS ALERT
                <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 'sending' && (
          <motion.div
            key="sending"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 space-y-8"
          >
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-4 border-red-500/20" />
              <div className="absolute inset-0 w-32 h-32 rounded-full border-t-4 border-red-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <ShieldAlert className="w-12 h-12 text-red-500 animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-tighter">Transmitting SOS...</h3>
              <p className="text-white/50 font-mono text-xs uppercase tracking-widest">Establishing secure satellite link</p>
            </div>
          </motion.div>
        )}

        {step === 'confirmed' && (
          <motion.div
            key="confirmed"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="p-10 bg-green-500/10 border border-green-500/30 rounded-[40px] text-center space-y-6 flex flex-col items-center">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.4)]">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black uppercase italic tracking-tighter">ALERT RECEIVED</h3>
                <p className="text-green-500/80 font-bold uppercase tracking-widest text-[10px]">Security and Medical teams dispatched.</p>
              </div>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 10, ease: 'linear' }}
                  className="h-full bg-green-500"
                />
              </div>
            </div>

            <div className="p-8 bg-white/[0.03] border border-white/10 rounded-[40px] space-y-6">
              <div className="flex items-center gap-3 text-white/40">
                <Info className="w-5 h-5 text-red-500" />
                <h4 className="text-xs font-black uppercase tracking-widest">Immediate Safety Protocol</h4>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {selectedType && ADVICE_LIBRARY[selectedType].map((advice, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * idx }}
                    key={idx} 
                    className="flex items-start gap-4 p-4 bg-black/40 rounded-2xl border border-white/5"
                  >
                    <div className="w-6 h-6 bg-white/5 rounded-full flex items-center justify-center text-[10px] font-bold text-white/50 shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <p className="text-sm font-medium text-white/80 leading-relaxed">{advice}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setStep('type');
                setSelectedType(null);
                setLocation('');
              }}
              className="w-full py-4 text-[10px] text-white/30 hover:text-white uppercase tracking-[0.3em] font-mono transition-colors border border-white/5 rounded-2xl"
            >
              Back to Home
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
