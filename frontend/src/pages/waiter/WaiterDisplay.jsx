import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  Bell, BellOff, CheckCircle2, ChefHat, Volume2, VolumeX,
  Loader2, X, AlertTriangle, Maximize2, User,
} from 'lucide-react';

const SOCKET_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
).replace(/\/api\/?$/, '');

/* ─────────────────────────────────────────────
   A tiny base64 "bell" chime as data URL
   (~3s, looping-friendly)
───────────────────────────────────────────── */
const BELL_DATA_URL =
  'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

export default function WaiterDisplay() {
  const [params] = useSearchParams();
  const org = params.get('org');
  const secret = params.get('k');

  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [calls, setCalls] = useState([]);
  const [soundReady, setSoundReady] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [ackName, setAckName] = useState(
    () => localStorage.getItem('waiter_ack_name') || ''
  );
  const [promptFor, setPromptFor] = useState(null);

  const socketRef = useRef(null);
  const audioRef = useRef(null);
  const loopRef = useRef(null);
  const ringTimerRef = useRef(null);
  const wakeLockRef = useRef(null);
  const [titleFlash, setTitleFlash] = useState(false);

  /* ── Title flash + favicon when calls pending ── */
  useEffect(() => {
    if (calls.length === 0) {
      document.title = 'Waiter Display';
      return;
    }
    document.title = `🔔 ${calls.length} CALL${calls.length > 1 ? 'S' : ''}`;

    const id = setInterval(() => {
      setTitleFlash((f) => !f);
    }, 700);

    return () => clearInterval(id);
  }, [calls.length]);

  useEffect(() => {
    document.title = titleFlash && calls.length > 0
      ? `🔔 ${calls.length} CALL${calls.length > 1 ? 'S' : ''}`
      : 'Waiter Display';
  }, [titleFlash, calls.length]);

  /* ── Wake lock (keeps screen on) ── */
  useEffect(() => {
    const acquire = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        }
      } catch {}
    };
    acquire();

    const onVis = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) acquire();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      document.removeEventListener('visibilitychange', onVis);
      wakeLockRef.current?.release?.().catch(() => {});
      wakeLockRef.current = null;
    };
  }, []);

  /* ── Socket connect ── */
  useEffect(() => {
    if (!org || !secret) {
      setError('Missing organization or secret in URL');
      return;
    }

    const socket = io(`${SOCKET_URL}/waiter`, {
      transports: ['websocket', 'polling'],
      auth: { organizationId: org, secret },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setError('');
      setConnected(true);
    });

    socket.on('connect_error', (err) => {
      setConnected(false);
      setError(err.message || 'Connection failed');
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('waiter-call', (call) => {
      setCalls((prev) => {
        // dedupe
        if (prev.some((c) => c.orderId === call.orderId)) return prev;
        return [...prev, call];
      });
      startBellLoop();
    });

    socket.on('waiter-ack', ({ orderId }) => {
      setCalls((prev) => prev.filter((c) => c.orderId !== orderId));
    });

    return () => {
      socket.disconnect();
      stopBellLoop();
    };
  }, [org, secret]);

/* ── Bell loop ── */
/* ── Bell loop — plays once every RING_INTERVAL_MS ── */
const RING_INTERVAL_MS = 50000;   // 👈 change this to your preferred gap (ms)


const playBellOnce = () => {
  try {
    if (!audioRef.current) {
      audioRef.current = new Audio('/notify.mp3');
      audioRef.current.preload = 'auto';
      audioRef.current.volume = 1.0;
    }
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch((e) => {
      console.warn('Bell blocked:', e);
    });
  } catch (e) {
    console.warn('Bell error:', e);
  }
};

const startBellLoop = () => {
  if (soundMuted) return;
  if (ringTimerRef.current) return; // already running

  // Play immediately on first call
  playBellOnce();

  // Then keep re-ringing every RING_INTERVAL_MS
  ringTimerRef.current = setInterval(() => {
    playBellOnce();
  }, RING_INTERVAL_MS);

  loopRef.current = true;
};

const stopBellLoop = () => {
  if (ringTimerRef.current) {
    clearInterval(ringTimerRef.current);
    ringTimerRef.current = null;
  }
  if (audioRef.current) {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  }
  loopRef.current = false;
};

  /* Stop loop when no calls */
  useEffect(() => {
    if (calls.length === 0) stopBellLoop();
  }, [calls.length]);

  /* ── First-click "enable sound" ── */
  const enableSound = async () => {
    try {
      const a = new Audio(BELL_DATA_URL);
      a.volume = 0.9;
      await a.play();
      a.pause();
      setSoundReady(true);
      localStorage.setItem('waiter_sound_ready', 'true');
    } catch (e) {
      console.warn('Cannot enable sound', e);
      setSoundReady(true); // still mark ready so user isn't stuck
    }
  };

  /* Auto-detect prior unlock */
  useEffect(() => {
    if (localStorage.getItem('waiter_sound_ready') === 'true') {
      setSoundReady(true);
    }
  }, []);

  /* ── Acknowledge a call ── */
  const confirmAck = () => {
    if (!ackName.trim()) return;
    localStorage.setItem('waiter_ack_name', ackName.trim());

    const target = promptFor;
    setPromptFor(null);

    socketRef.current?.emit('waiter-ack', {
      orderId: target.orderId,
      ackName: ackName.trim(),
    });

    setCalls((prev) => prev.filter((c) => c.orderId !== target.orderId));
  };

  /* ── Fullscreen ── */
  const goFullscreen = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  };

  /* ── UI ── */
  if (error && !connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFDF5] p-6 text-center font-jakarta">
        <div className="max-w-md rounded-2xl border-2 border-slate-800 bg-white p-8 shadow-[4px_4px_0px_0px_#1E293B]">
          <AlertTriangle size={40} className="text-rose-500 mx-auto mb-3" />
          <h1 className="font-outfit text-xl font-black text-slate-800">
            Waiter Display Offline
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            {error}
          </p>
          <p className="mt-3 text-xs text-slate-400">
            Verify the URL has the correct organization ID and secret.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col font-jakarta bg-[#FFFDF5] ${
        calls.length > 0 ? 'ring-8 ring-rose-500 ring-inset animate-pulse' : ''
      }`}
    >
      {/* Header */}
      <header className="bg-white border-b-2 border-slate-800 px-6 py-3 flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-violet-600 border-2 border-slate-800 shadow-[3px_3px_0px_0px_#1E293B] flex items-center justify-center">
          <Bell size={18} color="#fff" strokeWidth={2.5} />
        </div>
        <div>
          <div className="font-outfit font-black text-lg text-slate-800 leading-tight">
            Waiter Display
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {connected ? 'Live' : 'Reconnecting…'} · {calls.length} call{calls.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {!soundReady && (
            <button
              onClick={enableSound}
              className="h-10 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 border-2 border-slate-800 font-black text-xs shadow-[2px_2px_0px_0px_#1E293B] active:scale-95 transition flex items-center gap-2"
            >
              <Volume2 size={14} strokeWidth={2.5} />
              Enable Sound
            </button>
          )}

          {soundReady && (
            <button
              onClick={() => {
                setSoundMuted((m) => !m);
                if (!soundMuted) stopBellLoop();
              }}
              className={`h-10 px-3 rounded-xl border-2 border-slate-800 font-black text-xs shadow-[2px_2px_0px_0px_#1E293B] active:scale-95 transition flex items-center gap-2 ${
                soundMuted
                  ? 'bg-slate-100 text-slate-600'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {soundMuted ? (
                <VolumeX size={14} strokeWidth={2.5} />
              ) : (
                <Volume2 size={14} strokeWidth={2.5} />
              )}
              <span className="hidden md:inline">
                {soundMuted ? 'Muted' : 'Sound On'}
              </span>
            </button>
          )}

          <button
            onClick={goFullscreen}
            className="h-10 px-3 rounded-xl bg-white border-2 border-slate-800 font-black text-xs shadow-[2px_2px_0px_0px_#1E293B] active:scale-95 transition flex items-center gap-2"
          >
            <Maximize2 size={14} strokeWidth={2.5} />
            <span className="hidden md:inline">Fullscreen</span>
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {calls.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-3xl bg-emerald-100 border-2 border-slate-800 shadow-[4px_4px_0px_0px_#1E293B] flex items-center justify-center mb-4">
              <CheckCircle2 size={40} className="text-emerald-600" strokeWidth={2.5} />
            </div>
            <div className="font-outfit font-black text-2xl text-slate-800">
              All caught up!
            </div>
            <div className="text-sm text-slate-500 mt-1">
              No pending waiter calls.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {calls.map((call) => (
              <div
                key={call.orderId}
                className="bg-white rounded-2xl border-2 border-slate-800 p-5 shadow-[5px_5px_0px_0px_#1E293B] flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-outfit font-black text-2xl text-slate-800 leading-tight">
                      #{call.orderNumber}
                    </div>
                    <div className="text-xs font-bold text-slate-500 mt-0.5">
                      {call.orderType === 'TABLE' && call.tableNumber
                        ? `Table ${String(call.tableNumber).toUpperCase()}`
                        : call.orderType === 'ROOM'
                        ? call.orderType
                        : call.orderType === 'DELIVERY'
                        ? 'Delivery'
                        : 'Takeaway'}
                    </div>
                  </div>
                  <div className="text-2xl animate-pulse">🔔</div>
                </div>

                <div className="text-[11px] font-bold text-slate-500">
                  {call.items?.length || 0} item{(call.items?.length || 0) !== 1 ? 's' : ''} ·{' '}
                  {new Date(call.calledAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>

                {call.items?.length > 0 && (
                  <ul className="text-sm text-slate-700 space-y-0.5 border-t border-dashed border-slate-200 pt-2 max-h-40 overflow-y-auto">
                    {call.items.map((it, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span className="truncate">{it.name}</span>
                        <span className="font-black shrink-0">×{it.qty}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  onClick={() => setPromptFor(call)}
                  className="mt-auto w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white border-2 border-slate-800 font-black shadow-[3px_3px_0px_0px_#1E293B] active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_#1E293B] transition flex items-center justify-center gap-2"
                >
                  <User size={16} strokeWidth={2.5} />
                  I'm On It
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ack prompt */}
      {promptFor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl border-2 border-slate-800 shadow-[6px_6px_0px_0px_#1E293B] overflow-hidden">
            <div className="p-4 border-b-2 border-slate-200 flex items-center justify-between">
              <div className="font-outfit font-black text-slate-800">
                Who's going?
              </div>
              <button
                onClick={() => setPromptFor(null)}
                className="w-8 h-8 rounded-lg border-2 border-slate-200 flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-xs font-bold text-slate-500">
                Order #{promptFor.orderNumber}
              </div>
              <input
                autoFocus
                value={ackName}
                onChange={(e) => setAckName(e.target.value)}
                placeholder="Your name (e.g. Ahmed)"
                className="w-full rounded-xl border-2 border-slate-300 px-3 py-2.5 focus:outline-none focus:border-slate-800 font-semibold"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmAck();
                }}
              />
              <button
                onClick={confirmAck}
                disabled={!ackName.trim()}
                className="w-full h-11 rounded-xl bg-violet-600 text-white border-2 border-slate-800 font-black shadow-[3px_3px_0px_0px_#1E293B] disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} strokeWidth={2.5} />
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}