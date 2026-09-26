import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getHomePath } from '../constants/access';
import { setToken } from '../api/client';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Coffee, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';

/* ── Floating decorative shapes ── */
function Shape({ className }) {
  return <div className={`absolute pointer-events-none select-none ${className}`} />;
}

export default function Login() {
  const [form, setForm]     = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { setAuth }         = useAuthStore();
  const navigate            = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      setToken(res.accessToken);
      setAuth(res.user, res.accessToken);
      toast.success(`Welcome back, ${res.user.name}!`);
      navigate(getHomePath(res.user.role), { replace: true });
    } catch (err) {
      toast.error(err.error || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden flex items-center justify-center p-4"
      style={{ background: 'var(--brand-bg)', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      {/* ── Dot grid background ── */}
      <div className="absolute inset-0 dot-grid opacity-60" />

      {/* ── Floating decorative shapes ── */}
      <Shape className="w-64 h-64 rounded-full top-[-80px] left-[-80px] opacity-30"
             style={{ background: 'var(--brand-accent)' }} />
      <Shape className="w-48 h-48 rounded-full bottom-[-60px] right-[10%] opacity-25"
             style={{ background: 'var(--brand-secondary)' }} />
      <Shape className="w-32 h-32 rounded-2xl top-[15%] right-[5%] rotate-12 opacity-20"
             style={{ background: 'var(--brand-tertiary)' }} />
      <Shape className="w-20 h-20 rounded-full top-[45%] left-[4%] opacity-20"
             style={{ background: 'var(--brand-quaternary)' }} />
      {/* small confetti triangles */}
      <svg className="absolute top-[20%] left-[15%] opacity-40" width="24" height="24" viewBox="0 0 24 24">
        <polygon points="12,2 22,22 2,22" fill="#FBBF24" />
      </svg>
      <svg className="absolute bottom-[25%] right-[18%] opacity-30 rotate-45" width="18" height="18" viewBox="0 0 18 18">
        <rect width="18" height="18" fill="#F472B6" rx="2" />
      </svg>
      <svg className="absolute top-[70%] left-[12%] opacity-25" width="16" height="16" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="8" fill="#8B5CF6" />
      </svg>

      {/* ── Card ── */}
      <div className="relative z-10 w-full max-w-md animate-popIn">
        <div className="bg-white border-2 border-[#1E293B] rounded-2xl p-8" style={{ boxShadow: '8px 8px 0px 0px #1E293B' }}>

          {/* Logo */}
          <div className="text-center mb-8">
            {/* <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-[#1E293B]"
              style={{ background: 'var(--brand-accent)', boxShadow: '4px 4px 0px 0px #1E293B' }}
            >
              <Coffee size={28} strokeWidth={2.5} color="#fff" />
            </div> */}
            <h1
              className="text-3xl font-bold"
              style={{ fontFamily: "'Outfit', system-ui, sans-serif", color: 'var(--brand-fg)' }}
            >
             Safina  Cafe POS
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--brand-muted-fg)' }}>Sign in to your workspace</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                className="block text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: 'var(--brand-fg)', fontFamily: "'Outfit', system-ui, sans-serif" }}
              >
                Email
              </label>
              <div className="relative">
                <Mail size={16} strokeWidth={2.5} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--brand-muted-fg)' }} />
                <input
                  type="email" required value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="input-brand pl-10"
                  placeholder="admin@cafe.com"
                />
              </div>
            </div>

            <div>
              <label
                className="block text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: 'var(--brand-fg)', fontFamily: "'Outfit', system-ui, sans-serif" }}
              >
                Password
              </label>
              <div className="relative">
                <Lock size={16} strokeWidth={2.5} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--brand-muted-fg)' }} />
                <input
                  type="password" required value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="input-brand pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="btn-candy w-full text-base disabled:opacity-60"
              style={loading ? { cursor: 'not-allowed' } : {}}
            >
              {loading ? (
                <span>Signing in…</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
                    <ArrowRight size={14} strokeWidth={2.5} style={{ color: 'var(--brand-accent)' }} />
                  </span>
                </>
              )}
            </button>
          </form>

          <p className="text-center mt-5 text-sm" style={{ color: 'var(--brand-muted-fg)' }}>
            No account?{' '}
            <Link to="/signup" className="font-bold" style={{ color: 'var(--brand-accent)' }}>
              Sign up
            </Link>
          </p>

          {/* Demo credentials */}
          {/* <div
            className="mt-5 p-4 rounded-xl border-2"
            style={{ background: 'var(--brand-muted)', borderColor: 'var(--brand-border)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} strokeWidth={2.5} style={{ color: 'var(--brand-accent)' }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: "'Outfit', system-ui, sans-serif", color: 'var(--brand-fg)' }}>
                Demo Credentials
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--brand-muted-fg)' }}>Admin: <span className="font-semibold" style={{ color: 'var(--brand-fg)' }}>admin@cafe.com / Admin@123</span></p>
            <p className="text-xs mt-1" style={{ color: 'var(--brand-muted-fg)' }}>Employee: <span className="font-semibold" style={{ color: 'var(--brand-fg)' }}>rahul@cafe.com / Rahul@123</span></p>
          </div> */}
        </div>
      </div>
    </div>
  );
}
