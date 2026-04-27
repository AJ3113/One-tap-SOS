import { auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Mail, ShieldCheck } from 'lucide-react';

export default function StaffLogin() {
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error("Login failed", e);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white/[0.03] border border-white/10 rounded-[40px] space-y-8 backdrop-blur-xl">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto border border-red-500/20">
          <ShieldCheck className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-3xl font-black uppercase tracking-tighter italic">Secured Access</h2>
        <p className="text-white/40 text-xs font-mono uppercase tracking-widest">Authorized Staff Only</p>
      </div>

      <div className="space-y-6">
        <p className="text-center text-sm text-white/60 leading-relaxed">
          Please sign in with your corporate Google account to access the emergency dashboard and management tools.
        </p>

        <button
          onClick={handleGoogleLogin}
          className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-red-500 hover:text-white transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3 group"
        >
          <Mail className="w-4 h-4 group-hover:scale-110 transition-transform" />
          Continue with Email Identify
        </button>
      </div>

      <p className="text-[9px] text-center text-white/20 uppercase font-mono leading-relaxed px-4">
        By accessing this terminal you agree to the <span className="text-white/40">Security Matrix Protocols</span>. 
        All actions and response times are monitored in real-time.
      </p>
    </div>
  );
}
