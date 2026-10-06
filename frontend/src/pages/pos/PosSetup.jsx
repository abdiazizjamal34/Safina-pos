import { useState, useEffect } from 'react';
import {
  Coffee, Server, Save, Wifi, Loader2,
  AlertTriangle, CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { loadConfig, saveConfig, validateConfig } from '../../services/configService';

export default function PosSetup({ onSaved }) {
  const [serverUrl, setServerUrl] = useState('');
  const [errors, setErrors] = useState({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    const cfg = loadConfig();
    if (cfg.serverUrl) setServerUrl(cfg.serverUrl);
  }, []);

  const testConnection = async () => {
    setTestResult(null);

    const check = validateConfig({ serverUrl });
    if (!check.ok) {
      setErrors(check.errors);
      toast.error('Fix the field first');
      return;
    }
    setErrors({});

    setTesting(true);
    try {
      const base = serverUrl.replace(/\/$/, '');
      const res = await fetch(`${base}/api/health`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      if (data.status !== 'ok') throw new Error('Unexpected response');
      setTestResult({ ok: true, message: 'Connected successfully' });
      toast.success('Connected');
    } catch (e) {
      setTestResult({
        ok: false,
        message: e.message || 'Connection failed',
      });
      toast.error('Connection failed');
    } finally {
      setTesting(false);
    }
  };

  const submit = (ev) => {
    ev.preventDefault();

    const check = validateConfig({ serverUrl });
    if (!check.ok) {
      setErrors(check.errors);
      toast.error('Please fix the error');
      return;
    }
    setErrors({});

    saveConfig({ serverUrl, orgId: '', secret: '' });
    toast.success('Saved!');
    onSaved?.();
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
              Safina POS Setup
            </h1>
            <p className="text-xs font-semibold" style={{ color: '#64748B' }}>
              Point this device to your POS server
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
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
                setErrors({});
                setTestResult(null);
              }}
              placeholder="http://192.168.1.17:5000"
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
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}