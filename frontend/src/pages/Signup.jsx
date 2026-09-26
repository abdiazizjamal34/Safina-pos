import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getHomePath } from '../constants/access';
import { setToken } from '../api/client';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Coffee, User, Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

function Shape({ className, style }) {
  return <div className={`absolute pointer-events-none select-none ${className}`} style={style} />;
}

export default function Signup() {
  const [form, setForm]       = useState({ name: '', email: '', password: '', businessName: '' });
  const [loading, setLoading] = useState(false);
  const { setAuth }           = useAuthStore();
  const navigate              = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters');
    if (!form.businessName.trim()) return toast.error('Cafe / Hotel name is required');
    setLoading(true);
    try {
      const res = await api.post('/auth/signup', form);
      setToken(res.accessToken);
      setAuth(res.user, res.accessToken);
      toast.success(`Welcome, ${res.user.name}!`);
      navigate(getHomePath(res.user.role), { replace: true });
    } catch (err) {
      toast.error(err.error || 'Signup failed');
    } finally { setLoading(false); }
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden flex items-center justify-center p-4"
      style={{ background: 'var(--brand-bg)', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      {/* Dot grid */}
      <div className="absolute inset-0 dot-grid opacity-60" />

      {/* Decorative shapes */}
      <Shape className="w-72 h-72 rounded-full top-[-100px] right-[-100px] opacity-25"
             style={{ background: 'var(--brand-secondary)' }} />
      <Shape className="w-48 h-48 rounded-full bottom-[-60px] left-[5%] opacity-20"
             style={{ background: 'var(--brand-quaternary)' }} />
      <Shape className="w-28 h-28 rounded-2xl top-[20%] left-[6%] -rotate-12 opacity-20"
             style={{ background: 'var(--brand-tertiary)' }} />
      <svg className="absolute top-[15%] right-[12%] opacity-35" width="24" height="24" viewBox="0 0 24 24">
        <polygon points="12,2 22,22 2,22" fill="#8B5CF6" />
      </svg>
      <svg className="absolute bottom-[20%] left-[15%] opacity-30" width="20" height="20" viewBox="0 0 20 20">
        <rect width="20" height="20" fill="#FBBF24" rx="3" />
      </svg>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md animate-popIn">
        <div className="bg-white border-2 border-[#1E293B] rounded-2xl p-8" style={{ boxShadow: '8px 8px 0px 0px #1E293B' }}>

          {/* Logo */}
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-[#1E293B]"
              style={{ background: 'var(--brand-secondary)', boxShadow: '4px 4px 0px 0px #1E293B' }}
            >
              <Coffee size={28} strokeWidth={2.5} color="#fff" />
            </div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'Outfit', system-ui, sans-serif", color: 'var(--brand-fg)' }}>
              Cafe POS
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--brand-muted-fg)' }}>Create your admin account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2"
                     style={{ color: 'var(--brand-fg)', fontFamily: "'Outfit', system-ui, sans-serif" }}>
                Full Name
              </label>
              <div className="relative">
                <User size={16} strokeWidth={2.5} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--brand-muted-fg)' }} />
                <input type="text" required value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="input-brand pl-10" placeholder="John Doe" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2"
                     style={{ color: 'var(--brand-fg)', fontFamily: "'Outfit', system-ui, sans-serif" }}>
                Cafe / Hotel Name
              </label>
              <div className="relative">
                <Coffee size={16} strokeWidth={2.5} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--brand-muted-fg)' }} />
                <input type="text" required value={form.businessName}
                  onChange={e => setForm({ ...form, businessName: e.target.value })}
                  className="input-brand pl-10" placeholder="My Awesome Cafe" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2"
                     style={{ color: 'var(--brand-fg)', fontFamily: "'Outfit', system-ui, sans-serif" }}>
                Email
              </label>
              <div className="relative">
                <Mail size={16} strokeWidth={2.5} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--brand-muted-fg)' }} />
                <input type="email" required value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="input-brand pl-10" placeholder="admin@cafe.com" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2"
                     style={{ color: 'var(--brand-fg)', fontFamily: "'Outfit', system-ui, sans-serif" }}>
                Password
              </label>
              <div className="relative">
                <Lock size={16} strokeWidth={2.5} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--brand-muted-fg)' }} />
                <input type="password" required value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="input-brand pl-10" placeholder="Min 8 characters" />
              </div>
            </div>

            {/* Admin badge */}
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border-2"
                 style={{ background: 'var(--brand-muted)', borderColor: 'var(--brand-border)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                   style={{ background: 'var(--brand-accent)' }}>
                <ShieldCheck size={14} strokeWidth={2.5} color="#fff" />
              </div>
              <p className="text-xs" style={{ color: 'var(--brand-muted-fg)' }}>
                This account will be created as{' '}
                <span className="font-bold" style={{ color: 'var(--brand-accent)' }}>Admin</span>
              </p>
            </div>

            <button type="submit" disabled={loading}
                    className="btn-candy w-full text-base disabled:opacity-60"
                    style={loading ? { cursor: 'not-allowed' } : {}}>
              {loading ? (
                <span>Creating account…</span>
              ) : (
                <>
                  <span>Create Account</span>
                  <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
                    <ArrowRight size={14} strokeWidth={2.5} style={{ color: 'var(--brand-accent)' }} />
                  </span>
                </>
              )}
            </button>
          </form>

          <p className="text-center mt-5 text-sm" style={{ color: 'var(--brand-muted-fg)' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-bold" style={{ color: 'var(--brand-accent)' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
