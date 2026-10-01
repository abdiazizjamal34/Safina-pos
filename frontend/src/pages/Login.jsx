// import { useState } from 'react';
// import { useNavigate, Link } from 'react-router-dom';
// import { useAuthStore } from '../store/authStore';
// import { getHomePath } from '../constants/access';
// import { setToken } from '../api/client';
// import api from '../api/client';
// import toast from 'react-hot-toast';
// import { Coffee, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';

// /* ── Floating decorative shapes ── */
// function Shape({ className }) {
//   return <div className={`absolute pointer-events-none select-none ${className}`} />;
// }

// export default function Login() {
//   const [form, setForm]     = useState({ email: '', password: '' });
//   const [loading, setLoading] = useState(false);
//   const { setAuth }         = useAuthStore();
//   const navigate            = useNavigate();

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     try {
//       const res = await api.post('/auth/login', form);
//       setToken(res.accessToken);
//       setAuth(res.user, res.accessToken);
//       toast.success(`Welcome back, ${res.user.name}!`);
//       navigate(getHomePath(res.user.role), { replace: true });
//     } catch (err) {
//       toast.error(err.error || 'Login failed');
//     } finally { setLoading(false); }
//   };

//   return (
//     <div
//       className="min-h-screen relative overflow-hidden flex items-center justify-center p-4"
//       style={{ background: 'var(--brand-bg)', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
//     >
//       {/* ── Dot grid background ── */}
//       <div className="absolute inset-0 dot-grid opacity-60" />

//       {/* ── Floating decorative shapes ── */}
//       <Shape className="w-64 h-64 rounded-full top-[-80px] left-[-80px] opacity-30"
//              style={{ background: 'var(--brand-accent)' }} />
//       <Shape className="w-48 h-48 rounded-full bottom-[-60px] right-[10%] opacity-25"
//              style={{ background: 'var(--brand-secondary)' }} />
//       <Shape className="w-32 h-32 rounded-2xl top-[15%] right-[5%] rotate-12 opacity-20"
//              style={{ background: 'var(--brand-tertiary)' }} />
//       <Shape className="w-20 h-20 rounded-full top-[45%] left-[4%] opacity-20"
//              style={{ background: 'var(--brand-quaternary)' }} />
//       {/* small confetti triangles */}
//       <svg className="absolute top-[20%] left-[15%] opacity-40" width="24" height="24" viewBox="0 0 24 24">
//         <polygon points="12,2 22,22 2,22" fill="#FBBF24" />
//       </svg>
//       <svg className="absolute bottom-[25%] right-[18%] opacity-30 rotate-45" width="18" height="18" viewBox="0 0 18 18">
//         <rect width="18" height="18" fill="#F472B6" rx="2" />
//       </svg>
//       <svg className="absolute top-[70%] left-[12%] opacity-25" width="16" height="16" viewBox="0 0 16 16">
//         <circle cx="8" cy="8" r="8" fill="#8B5CF6" />
//       </svg>

//       {/* ── Card ── */}
//       <div className="relative z-10 w-full max-w-md animate-popIn">
//         <div className="bg-white border-2 border-[#1E293B] rounded-2xl p-8" style={{ boxShadow: '8px 8px 0px 0px #1E293B' }}>

//           {/* Logo */}
//           <div className="text-center mb-8">
//             {/* <div
//               className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-[#1E293B]"
//               style={{ background: 'var(--brand-accent)', boxShadow: '4px 4px 0px 0px #1E293B' }}
//             >
//               <Coffee size={28} strokeWidth={2.5} color="#fff" />
//             </div> */}
//             <h1
//               className="text-3xl font-bold"
//               style={{ fontFamily: "'Outfit', system-ui, sans-serif", color: 'var(--brand-fg)' }}
//             >
//              Safina  Cafe POS
//             </h1>
//             <p className="mt-1 text-sm" style={{ color: 'var(--brand-muted-fg)' }}>Sign in to your workspace</p>
//           </div>

//           {/* Form */}
//           <form onSubmit={handleSubmit} className="space-y-5">
//             <div>
//               <label
//                 className="block text-xs font-bold uppercase tracking-widest mb-2"
//                 style={{ color: 'var(--brand-fg)', fontFamily: "'Outfit', system-ui, sans-serif" }}
//               >
//                 Email
//               </label>
//               <div className="relative">
//                 <Mail size={16} strokeWidth={2.5} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--brand-muted-fg)' }} />
//                 <input
//                   type="email" required value={form.email}
//                   onChange={e => setForm({ ...form, email: e.target.value })}
//                   className="input-brand pl-10"
//                   placeholder="admin@cafe.com"
//                 />
//               </div>
//             </div>

//             <div>
//               <label
//                 className="block text-xs font-bold uppercase tracking-widest mb-2"
//                 style={{ color: 'var(--brand-fg)', fontFamily: "'Outfit', system-ui, sans-serif" }}
//               >
//                 Password
//               </label>
//               <div className="relative">
//                 <Lock size={16} strokeWidth={2.5} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--brand-muted-fg)' }} />
//                 <input
//                   type="password" required value={form.password}
//                   onChange={e => setForm({ ...form, password: e.target.value })}
//                   className="input-brand pl-10"
//                   placeholder="••••••••"
//                 />
//               </div>
//             </div>

//             <button
//               type="submit" disabled={loading}
//               className="btn-candy w-full text-base disabled:opacity-60"
//               style={loading ? { cursor: 'not-allowed' } : {}}
//             >
//               {loading ? (
//                 <span>Signing in…</span>
//               ) : (
//                 <>
//                   <span>Sign In</span>
//                   <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
//                     <ArrowRight size={14} strokeWidth={2.5} style={{ color: 'var(--brand-accent)' }} />
//                   </span>
//                 </>
//               )}
//             </button>
//           </form>

//           <p className="text-center mt-5 text-sm" style={{ color: 'var(--brand-muted-fg)' }}>
//             No account?{' '}
//             <Link to="/signup" className="font-bold" style={{ color: 'var(--brand-accent)' }}>
//               Sign up
//             </Link>
//           </p>

//           {/* Demo credentials */}
//           {/* <div
//             className="mt-5 p-4 rounded-xl border-2"
//             style={{ background: 'var(--brand-muted)', borderColor: 'var(--brand-border)' }}
//           >
//             <div className="flex items-center gap-2 mb-2">
//               <Sparkles size={14} strokeWidth={2.5} style={{ color: 'var(--brand-accent)' }} />
//               <span className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: "'Outfit', system-ui, sans-serif", color: 'var(--brand-fg)' }}>
//                 Demo Credentials
//               </span>
//             </div>
//             <p className="text-xs" style={{ color: 'var(--brand-muted-fg)' }}>Admin: <span className="font-semibold" style={{ color: 'var(--brand-fg)' }}>admin@cafe.com / Admin@123</span></p>
//             <p className="text-xs mt-1" style={{ color: 'var(--brand-muted-fg)' }}>Employee: <span className="font-semibold" style={{ color: 'var(--brand-fg)' }}>rahul@cafe.com / Rahul@123</span></p>
//           </div> */}
//         </div>
//       </div>
//     </div>
//   );
// }



/// after the admin set pin  the  un un comment this 
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getHomePath } from '../constants/access';
import { setToken } from '../api/client';
import api from '../api/client';
import toast from 'react-hot-toast';
import {
  User,
  ArrowLeft,
  Delete,
  Loader2,
  LogIn,
} from 'lucide-react';

/* ── Floating decorative shapes ── */
function Shape({ className, style }) {
  return (
    <div
      className={`absolute pointer-events-none select-none ${className}`}
      style={style}
    />
  );
}

export default function Login() {
  const [staff, setStaff] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState('');
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingLogin, setLoadingLogin] = useState(false);

  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  /* ─────────────────────────────────────────
     Load staff when login page opens
  ───────────────────────────────────────── */
  useEffect(() => {
    const loadStaff = async () => {
      try {
        setLoadingStaff(true);

        const res = await api.get('/auth/staff');

        setStaff(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error(err);

        toast.error(
          err?.error || 'Unable to load staff'
        );
      } finally {
        setLoadingStaff(false);
      }
    };

    loadStaff();
  }, []);

  /* ─────────────────────────────────────────
     Select staff member
  ───────────────────────────────────────── */
  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setPin('');
  };

  /* ─────────────────────────────────────────
     PIN keypad
  ───────────────────────────────────────── */
  const handlePinPress = (number) => {
    if (loadingLogin) return;

    if (pin.length >= 4) return;

    setPin((current) => current + number);
  };

  const handleDelete = () => {
    if (loadingLogin) return;

    setPin((current) => current.slice(0, -1));
  };

  const handleClear = () => {
    if (loadingLogin) return;

    setPin('');
  };

  /* ─────────────────────────────────────────
     Login with PIN
  ───────────────────────────────────────── */
  const handleLogin = async () => {
    if (!selectedUser) {
      toast.error('Please select your name');
      return;
    }

    if (pin.length < 4) {
      toast.error('Please enter your 4-digit PIN');
      return;
    }

    setLoadingLogin(true);

    try {
      const res = await api.post('/auth/pin-login', {
        userId: selectedUser.id,
        pin,
      });

      setToken(res.accessToken);
      setAuth(res.user, res.accessToken);

      toast.success(`Welcome back, ${res.user.name}!`);

      navigate(
        getHomePath(res.user.role),
        { replace: true }
      );
    } catch (err) {
      console.error(err);

      toast.error(
        err?.error || 'Incorrect PIN'
      );

      setPin('');
    } finally {
      setLoadingLogin(false);
    }
  };

  /* ─────────────────────────────────────────
     Enter key support
  ───────────────────────────────────────── */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedUser || loadingLogin) return;

      if (/^[0-9]$/.test(e.key)) {
        handlePinPress(e.key);
      }

      if (e.key === 'Backspace') {
        handleDelete();
      }

      if (e.key === 'Escape') {
        setSelectedUser(null);
        setPin('');
      }

      if (e.key === 'Enter' && pin.length === 4) {
        handleLogin();
      }
    };

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };
  }, [
    selectedUser,
    pin,
    loadingLogin,
  ]);

  return (
    <div
      className="min-h-screen relative overflow-hidden flex items-center justify-center p-4"
      style={{
        background: 'var(--brand-bg)',
        fontFamily:
          "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      {/* ── Dot grid background ── */}
      <div className="absolute inset-0 dot-grid opacity-60" />

      {/* ── Floating decorative shapes ── */}

      <Shape
        className="w-64 h-64 rounded-full top-[-80px] left-[-80px] opacity-30"
        style={{
          background: 'var(--brand-accent)',
        }}
      />

      <Shape
        className="w-48 h-48 rounded-full bottom-[-60px] right-[10%] opacity-25"
        style={{
          background: 'var(--brand-secondary)',
        }}
      />

      <Shape
        className="w-32 h-32 rounded-2xl top-[15%] right-[5%] rotate-12 opacity-20"
        style={{
          background: 'var(--brand-tertiary)',
        }}
      />

      <Shape
        className="w-20 h-20 rounded-full top-[45%] left-[4%] opacity-20"
        style={{
          background: 'var(--brand-quaternary)',
        }}
      />

      {/* ── Confetti ── */}

      <svg
        className="absolute top-[20%] left-[15%] opacity-40"
        width="24"
        height="24"
        viewBox="0 0 24 24"
      >
        <polygon
          points="12,2 22,22 2,22"
          fill="#FBBF24"
        />
      </svg>

      <svg
        className="absolute bottom-[25%] right-[18%] opacity-30 rotate-45"
        width="18"
        height="18"
        viewBox="0 0 18 18"
      >
        <rect
          width="18"
          height="18"
          fill="#F472B6"
          rx="2"
        />
      </svg>

      <svg
        className="absolute top-[70%] left-[12%] opacity-25"
        width="16"
        height="16"
        viewBox="0 0 16 16"
      >
        <circle
          cx="8"
          cy="8"
          r="8"
          fill="#8B5CF6"
        />
      </svg>

      {/* ── Login Card ── */}

      <div className="relative z-10 w-full max-w-md animate-popIn">

        <div
          className="bg-white border-2 border-[#1E293B] rounded-2xl p-8"
          style={{
            boxShadow:
              '8px 8px 0px 0px #1E293B',
          }}
        >

          {/* ── Header ── */}

          <div className="text-center mb-7">

            <h1
              className="text-3xl font-bold"
              style={{
                fontFamily:
                  "'Outfit', system-ui, sans-serif",
                color: 'var(--brand-fg)',
              }}
            >
              Safina Cafe POS
            </h1>

            <p
              className="mt-1 text-sm"
              style={{
                color:
                  'var(--brand-muted-fg)',
              }}
            >
              {selectedUser
                ? `Welcome, ${selectedUser.name}`
                : 'Select your name to continue'}
            </p>

          </div>

          {/* ═══════════════════════════════
              STEP 1 — SELECT USER
          ═══════════════════════════════ */}

          {!selectedUser && (
            <>
              {loadingStaff ? (
                <div className="flex flex-col items-center justify-center py-12">

                  <Loader2
                    size={32}
                    className="animate-spin"
                    style={{
                      color:
                        'var(--brand-accent)',
                    }}
                  />

                  <p
                    className="mt-3 text-sm"
                    style={{
                      color:
                        'var(--brand-muted-fg)',
                    }}
                  >
                    Loading staff...
                  </p>

                </div>
              ) : staff.length === 0 ? (
                <div className="text-center py-10">

                  <User
                    size={40}
                    className="mx-auto mb-3"
                    style={{
                      color:
                        'var(--brand-muted-fg)',
                    }}
                  />

                  <p
                    className="text-sm"
                    style={{
                      color:
                        'var(--brand-muted-fg)',
                    }}
                  >
                    No active staff found.
                  </p>

                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">

                  {staff.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() =>
                        handleSelectUser(user)
                      }
                      className="group p-4 rounded-xl border-2 border-[#1E293B] bg-white transition-all duration-150 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#1E293B] active:translate-y-0 active:shadow-none"
                    >

                      <div
                        className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center border-2 border-[#1E293B]"
                        style={{
                          background:
                            'var(--brand-accent)',
                        }}
                      >
                        <User
                          size={22}
                          color="#fff"
                          strokeWidth={2.5}
                        />
                      </div>

                      <p
                        className="font-bold text-sm truncate"
                        style={{
                          color:
                            'var(--brand-fg)',
                          fontFamily:
                            "'Outfit', system-ui, sans-serif",
                        }}
                      >
                        {user.name}
                      </p>

                      <p
                        className="text-[10px] uppercase tracking-wider mt-1"
                        style={{
                          color:
                            'var(--brand-muted-fg)',
                        }}
                      >
                        {user.role}
                      </p>

                    </button>
                  ))}

                </div>
              )}
            </>
          )}

          {/* ═══════════════════════════════
              STEP 2 — ENTER PIN
          ═══════════════════════════════ */}

          {selectedUser && (
            <div>

              {/* Selected user */}

              <div className="flex items-center justify-center gap-3 mb-6">

                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-[#1E293B]"
                  style={{
                    background:
                      'var(--brand-accent)',
                  }}
                >
                  <User
                    size={22}
                    color="#fff"
                    strokeWidth={2.5}
                  />
                </div>

                <div>
                  <p
                    className="font-bold"
                    style={{
                      color:
                        'var(--brand-fg)',
                      fontFamily:
                        "'Outfit', system-ui, sans-serif",
                    }}
                  >
                    {selectedUser.name}
                  </p>

                  <p
                    className="text-xs"
                    style={{
                      color:
                        'var(--brand-muted-fg)',
                    }}
                  >
                    {selectedUser.role}
                  </p>
                </div>

              </div>

              {/* PIN display */}

              <div className="flex justify-center gap-4 mb-6">

                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className="w-4 h-4 rounded-full border-2 border-[#1E293B] transition-all duration-150"
                    style={{
                      background:
                        index < pin.length
                          ? 'var(--brand-accent)'
                          : 'white',
                    }}
                  />
                ))}

              </div>

              {/* PIN keypad */}

              <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">

                {[
                  '1',
                  '2',
                  '3',
                  '4',
                  '5',
                  '6',
                  '7',
                  '8',
                  '9',
                ].map((number) => (
                  <button
                    key={number}
                    type="button"
                    onClick={() =>
                      handlePinPress(number)
                    }
                    disabled={loadingLogin}
                    className="h-14 rounded-xl border-2 border-[#1E293B] bg-white text-xl font-bold transition-all duration-100 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#1E293B] active:translate-y-0 active:shadow-none disabled:opacity-50"
                    style={{
                      color:
                        'var(--brand-fg)',
                    }}
                  >
                    {number}
                  </button>
                ))}

                {/* Clear */}

                <button
                  type="button"
                  onClick={handleClear}
                  disabled={loadingLogin}
                  className="h-14 rounded-xl border-2 border-[#1E293B] bg-white font-bold transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#1E293B] active:translate-y-0 active:shadow-none disabled:opacity-50"
                  style={{
                    color:
                      'var(--brand-accent)',
                  }}
                >
                  C
                </button>

                {/* Zero */}

                <button
                  type="button"
                  onClick={() =>
                    handlePinPress('0')
                  }
                  disabled={loadingLogin}
                  className="h-14 rounded-xl border-2 border-[#1E293B] bg-white text-xl font-bold transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#1E293B] active:translate-y-0 active:shadow-none disabled:opacity-50"
                  style={{
                    color:
                      'var(--brand-fg)',
                  }}
                >
                  0
                </button>

                {/* Delete */}

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={
                    loadingLogin ||
                    pin.length === 0
                  }
                  className="h-14 rounded-xl border-2 border-[#1E293B] bg-white flex items-center justify-center transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#1E293B] active:translate-y-0 active:shadow-none disabled:opacity-50"
                  style={{
                    color:
                      'var(--brand-fg)',
                  }}
                >
                  <Delete size={22} />
                </button>

              </div>

              {/* Login button */}

              <button
                type="button"
                onClick={handleLogin}
                disabled={
                  loadingLogin ||
                  pin.length !== 4
                }
                className="btn-candy w-full text-base mt-5 disabled:opacity-50"
                style={
                  loadingLogin
                    ? {
                        cursor:
                          'not-allowed',
                      }
                    : {}
                }
              >
                {loadingLogin ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                    <span>
                      Signing in...
                    </span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>

                    <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
                      <LogIn
                        size={14}
                        strokeWidth={2.5}
                        style={{
                          color:
                            'var(--brand-accent)',
                        }}
                      />
                    </span>
                  </>
                )}
              </button>

              {/* Change user */}

              <button
                type="button"
                onClick={() => {
                  setSelectedUser(null);
                  setPin('');
                }}
                disabled={loadingLogin}
                className="w-full mt-4 flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50"
                style={{
                  color:
                    'var(--brand-muted-fg)',
                }}
              >
                <ArrowLeft size={15} />
                Change User
              </button>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}


