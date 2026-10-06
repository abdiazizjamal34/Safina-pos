import { useState, useEffect } from 'react';
import {
  Coffee, Server, Key, Hash, Save, Wifi, Loader2,
  AlertTriangle, CheckCircle2, Eye, EyeOff, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  loadConfig, saveConfig, validateConfig,
} from '../../services/configService';

export default function WaiterSetup({ onSaved, onCancel, allowCancel = false }) {
  const [serverUrl, setServerUrl] = useState('');
  const [orgId, setOrgId] = useState('');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [errors, setErrors] = useState({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  /* Load existing config on mount */
  useEffect(() => {
    const cfg = loadConfig();
    if (cfg.serverUrl) setServerUrl(cfg.serverUrl);
    if (cfg.orgId) setOrgId(cfg.orgId);
    if (cfg.secret) setSecret(cfg.secret);
  }, []);

  const testConnection = async () => {
    setTestResult(null);

    const cfg = { serverUrl, orgId, secret };
    const check = validateConfig(cfg);
    if (!check.ok) {
      setErrors(check.errors);
      toast.error('Fix the highlighted fields first');
      return;
    }
    setErrors({});

    setTesting(true);
    try {
      // 1. Ping the backend health endpoint
      const base = serverUrl.replace(/\/$/, '');
      const res = await fetch(`${base}/api/health`);
      if (!res.ok) throw new Error(`Backend returned ${res.status}`);

      // 2. Try to open the waiter socket to verify org + secret
      const { io } = await import('socket.io-client');
      const testSocket = io(`${base}/waiter`, {
        transports: ['websocket'],
        auth: { organizationId: orgId, secret },
        reconnection: false,
        timeout: 5000,
      });

      await new Promise((resolve, reject) => {
        const t = setTimeout(() => {
          testSocket.disconnect();
          reject(new Error('Socket timed out'));
        }, 6000);

        testSocket.on('connect', () => {
          clearTimeout(t);
          testSocket.disconnect();
          resolve();
        });

        testSocket.on('connect_error', (err) => {
          clearTimeout(t);
          testSocket.disconnect();
          reject(err);
        });
      });

      setTestResult({ ok: true, message: 'Connected successfully' });
      toast.success('Connection successful');
    } catch (e) {
      setTestResult({
        ok: false,
        message: e?.message || 'Connection failed',
      });
      toast.error('Connection failed');
    } finally {
      setTesting(false);
    }
  };

  const submit = (ev) => {
    ev.preventDefault();

    const cfg = { serverUrl, orgId, secret };
    const check = validateConfig(cfg);
    if (!check.ok) {
      setErrors(check.errors);
      toast.error('Please fix the errors');
      return;
    }
    setErrors({});

    const saved = saveConfig(cfg);
    toast.success('Saved! Launching…');
    onSaved?.(saved);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-[#FFFDF5]"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      <div
        className="w-full max-w-lg rounded-2xl border-2 overflow-hidden"
        style={{
          background: '#FFFFFF',
          borderColor: '#1E293B',
          boxShadow: '6px 6px 0px 0px #1E293B',
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 border-b-2 flex items-center gap-3"
          style={{ borderColor: '#E2E8F0', background: '#FFFDF5' }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center border-2"
            style={{
              background: '#8B5CF6',
              borderColor: '#1E293B',
              boxShadow: '2px 2px 0px 0px #1E293B',
            }}
          >
            <Coffee size={20} color="#fff" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h1
              className="text-lg font-black leading-tight truncate"
              style={{ color: '#1E293B', fontFamily: "'Outfit', sans-serif" }}
            >
              Waiter Display Setup
            </h1>
            <p className="text-xs font-semibold" style={{ color: '#64748B' }}>
              Point this device to your POS server
            </p>
          </div>
          {allowCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-8 h-8 rounded-lg flex items-center justify-center border-2"
              style={{ borderColor: '#E2E8F0', background: '#FFF' }}
            >
              <X size={16} strokeWidth={2.5} color="#64748B" />
            </button>
          )}
        </div>

        {/* Form */}
        <form onSubmit={submit} className="p-6 space-y-4">
          {/* Server URL */}
          <div>
            <label
              className="block text-xs font-black uppercase tracking-wide mb-1.5"
              style={{ color: '#64748B', fontFamily: "'Outfit', sans-serif" }}
            >
              <Server size={12} className="inline mr-1" />
              Server URL
            </label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => {
                setServerUrl(e.target.value);
                setErrors((p) => ({ ...p, serverUrl: undefined }));
                setTestResult(null);
              }}
              placeholder="http://172.20.10.2:5000"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              className="w-full rounded-xl px-3 py-2.5 text-sm font-mono border-2 outline-none transition focus:shadow-[3px_3px_0px_0px_#8B5CF6]"
              style={{
                borderColor: errors.serverUrl ? '#EF4444' : '#1E293B',
                background: '#FFF',
                color: '#1E293B',
              }}
            />
            {errors.serverUrl && (
              <p className="mt-1 text-xs font-bold" style={{ color: '#EF4444' }}>
                {errors.serverUrl}
              </p>
            )}
            <p className="mt-1 text-[10px] font-semibold" style={{ color: '#94A3B8' }}>
              Include http:// and the port. No trailing slash.
            </p>
          </div>

          {/* Org ID */}
          <div>
            <label
              className="block text-xs font-black uppercase tracking-wide mb-1.5"
              style={{ color: '#64748B', fontFamily: "'Outfit', sans-serif" }}
            >
              <Hash size={12} className="inline mr-1" />
              Organization ID
            </label>
            <input
              type="text"
              value={orgId}
              onChange={(e) => {
                setOrgId(e.target.value);
                setErrors((p) => ({ ...p, orgId: undefined }));
                setTestResult(null);
              }}
              placeholder="b6af4279-eebc-44e9-a583-4ff9fcdddcf0"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              className="w-full rounded-xl px-3 py-2.5 text-sm font-mono border-2 outline-none transition focus:shadow-[3px_3px_0px_0px_#8B5CF6]"
              style={{
                borderColor: errors.orgId ? '#EF4444' : '#1E293B',
                background: '#FFF',
                color: '#1E293B',
              }}
            />
            {errors.orgId && (
              <p className="mt-1 text-xs font-bold" style={{ color: '#EF4444' }}>
                {errors.orgId}
              </p>
            )}
            <p className="mt-1 text-[10px] font-semibold" style={{ color: '#94A3B8' }}>
              The organization UUID (Prisma Studio → Organization → id).
            </p>
          </div>

          {/* Secret */}
          <div>
            <label
              className="block text-xs font-black uppercase tracking-wide mb-1.5"
              style={{ color: '#64748B', fontFamily: "'Outfit', sans-serif" }}
            >
              <Key size={12} className="inline mr-1" />
              Kiosk Secret
            </label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={secret}
                onChange={(e) => {
                  setSecret(e.target.value);
                  setErrors((p) => ({ ...p, secret: undefined }));
                  setTestResult(null);
                }}
                placeholder="••••••••••••"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                className="w-full rounded-xl px-3 py-2.5 pr-10 text-sm font-mono border-2 outline-none transition focus:shadow-[3px_3px_0px_0px_#8B5CF6]"
                style={{
                  borderColor: errors.secret ? '#EF4444' : '#1E293B',
                  background: '#FFF',
                  color: '#1E293B',
                }}
              />
              <button
                type="button"
                onClick={() => setShowSecret((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md flex items-center justify-center hover:bg-slate-100"
                tabIndex={-1}
              >
                {showSecret ? (
                  <EyeOff size={14} strokeWidth={2.5} color="#64748B" />
                ) : (
                  <Eye size={14} strokeWidth={2.5} color="#64748B" />
                )}
              </button>
            </div>
            {errors.secret && (
              <p className="mt-1 text-xs font-bold" style={{ color: '#EF4444' }}>
                {errors.secret}
              </p>
            )}
            <p className="mt-1 text-[10px] font-semibold" style={{ color: '#94A3B8' }}>
              Matches WAITER_KIOSK_SECRET in your backend .env
            </p>
          </div>

          {/* Test result */}
          {testResult && (
            <div
              className="rounded-xl px-3 py-2.5 text-xs font-bold flex items-start gap-2 border-2"
              style={
                testResult.ok
                  ? {
                      background: '#ECFDF5',
                      borderColor: '#A7F3D0',
                      color: '#047857',
                    }
                  : {
                      background: '#FEF2F2',
                      borderColor: '#FECACA',
                      color: '#B91C1C',
                    }
              }
            >
              {testResult.ok ? (
                <CheckCircle2 size={14} strokeWidth={2.5} className="mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle size={14} strokeWidth={2.5} className="mt-0.5 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={testConnection}
              disabled={testing}
              className="flex-1 h-11 rounded-xl border-2 font-black text-xs transition hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                background: '#FFF',
                borderColor: '#1E293B',
                color: '#1E293B',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              {testing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Testing…
                </>
              ) : (
                <>
                  <Wifi size={14} strokeWidth={2.5} />
                  Test Connection
                </>
              )}
            </button>
            <button
              type="submit"
              disabled={testing}
              className="flex-1 h-11 rounded-xl border-2 font-black text-xs transition hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                background: '#8B5CF6',
                borderColor: '#1E293B',
                color: '#FFF',
                boxShadow: '3px 3px 0px 0px #1E293B',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              <Save size={14} strokeWidth={2.5} />
              Save & Launch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}