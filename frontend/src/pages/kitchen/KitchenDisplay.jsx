


import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuthStore } from '../../store/authStore';
import api, { getToken } from '../../api/client';

import {
  KDS_ITEM_STATUS,
  KDS_STAGE,
  ORDER_STATUS,
  SOCKET_EVENTS
} from '../../constants/orders';

import toast from 'react-hot-toast';

import {
  Coffee,
  Flame,
  Clock,
  CheckCircle2,
  User,
  LogOut,
  ChevronDown,
  Utensils,
  Loader2,
  Check,
  AlertCircle,
  AlertTriangle,
  Volume2,
  VolumeX,
  Play,
  StickyNote,
  ShoppingBag,
  RotateCcw,
  ChefHat,
  BedDouble,
  Bell,
  Truck
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────── */

const STAGES = Object.values(KDS_STAGE);

const STAGE_META = {
  [KDS_STAGE.TO_COOK]: {
    label: 'To Cook',
    color: '#F43F5E',
    bg: 'bg-rose-500',
    border: 'border-rose-200',
    ring: 'ring-rose-500',
    next: 'Preparing',
    icon: Flame
  },

  [KDS_STAGE.PREPARING]: {
    label: 'Preparing',
    color: '#EAB308',
    bg: 'bg-amber-500',
    border: 'border-amber-200',
    ring: 'ring-amber-500',
    next: 'Completed',
    icon: Clock
  },

  [KDS_STAGE.COMPLETED]: {
    label: 'Completed',
    color: '#10B981',
    bg: 'bg-emerald-500',
    border: 'border-emerald-200',
    ring: 'ring-emerald-500',
    next: null,
    icon: CheckCircle2
  }
};


const useOrderTimer = (createdAt) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const created = new Date(createdAt).getTime();

    const update = () => {
      const diff = Math.floor(
        (Date.now() - created) / 1000
      );

      setElapsed(diff);
    };

    update();

    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, [createdAt]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  const display = `${String(minutes).padStart(2, '0')}:${String(
    seconds
  ).padStart(2, '0')}`;

  const color =
    minutes < 10
      ? 'text-emerald-600'
      : minutes < 15
        ? 'text-amber-500 font-bold'
        : 'text-rose-500 font-extrabold animate-pulse';

  const urgentBorder =
    minutes >= 15
      ? 'border-rose-500'
      : minutes >= 10
        ? 'border-amber-500'
        : 'border-slate-800';

  return {
    display,
    color,
    urgentBorder,
    minutes
  };
};

/* ─────────────────────────────────────────────────────────
   TICKET CARD
───────────────────────────────────────────────────────── */

function TicketCard({
  ticket,
  station,
  onStageUpdate,
  onItemToggle,
   onNotifyWaiter,
  isNew,
  isUpdated
}) {
  const timer = useOrderTimer(ticket.createdAt);

  const order = ticket.order || {};
  const lines = order.lines || [];

  const kdsLines = lines.filter(
    (line) => line.kdsStation === station
  );

  const totalItems = kdsLines.length;

  const completedItems = kdsLines.filter(
    (line) =>
      line.kdsStatus === KDS_ITEM_STATUS.DONE
  ).length;

  const progressPercent =
    totalItems > 0
      ? (completedItems / totalItems) * 100
      : 0;

  return (
    <div
      className={`
        bg-white rounded-xl border-2 overflow-hidden
        transition-all duration-300 flex flex-col
        relative
        ${
          isNew
            ? 'new-ticket-highlight border-orange-500'
            : isUpdated
              ? 'updated-ticket-highlight border-amber-500'
              : ''
        }
      `}
      style={{
        borderColor: isNew
          ? '#F97316'
          : isUpdated
            ? '#F59E0B'
            : timer.minutes >= 15
              ? '#EF4444'
              : timer.minutes >= 10
                ? '#F59E0B'
                : '#1E293B',

        boxShadow: isNew
          ? '0 0 0 4px rgba(249,115,22,0.20), 6px 6px 0px 0px #F97316'
          : isUpdated
            ? '0 0 0 4px rgba(245,158,11,0.25), 6px 6px 0px 0px #F59E0B'
            : timer.minutes >= 15
              ? '6px 6px 0px 0px #EF4444'
              : timer.minutes >= 10
                ? '5px 5px 0px 0px #F59E0B'
                : 'var(--pop-shadow-sm)'
      }}
    >

      {/* ─────────────────────────────────────────────
          NEW ORDER BADGE
      ───────────────────────────────────────────── */}
      {isNew && (
        <div className="absolute top-2 right-2 z-10">
          <div className="flex items-center gap-1.5 bg-orange-500 text-white border-2 border-slate-800 px-2.5 py-1 rounded-lg shadow-pop-sm text-[10px] font-black uppercase tracking-wide animate-bounce">
            <Volume2
              size={12}
              strokeWidth={3}
            />

            NEW ORDER
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          UPDATED ORDER BADGE
      ───────────────────────────────────────────── */}
      {isUpdated && !isNew && (
        <div className="absolute top-2 right-2 z-10">
          <div className="flex items-center gap-1.5 bg-amber-500 text-white border-2 border-slate-800 px-2.5 py-1 rounded-lg shadow-pop-sm text-[10px] font-black uppercase tracking-wide animate-bounce">
            <AlertCircle
              size={12}
              strokeWidth={3}
            />

            UPDATED
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          TICKET HEADER
      ───────────────────────────────────────────── */}
      <div className="p-4 border-b-2 border-slate-100 font-jakarta bg-slate-50/50">

        <div className="flex items-start justify-between gap-2">

          <div>

            <div className="flex items-center gap-2 flex-wrap pr-20">

              <span className="text-slate-800 font-black text-xl font-outfit">
                #{order.orderNumber || '—'}
              </span>

              {order.orderType === 'DINE_IN' ? (
                <span className="flex items-center gap-1 bg-violet-100 border border-violet-300 text-violet-800 text-xs font-black px-2 py-0.5 rounded-lg font-outfit">
                  <Utensils
                    size={10}
                    strokeWidth={3}
                  />

                  Table{' '}
                  {order.table?.tableNumber
                    ?.toUpperCase() || 'N/A'}
                </span>
              ) : order.orderType === 'ROOM' ? (
                <span className="flex items-center gap-1 bg-blue-100 border border-blue-300 text-blue-800 text-xs font-black px-2 py-0.5 rounded-lg font-outfit">
                  <BedDouble
                    size={10}
                    strokeWidth={3}
                  />

                  {order.deliveryLocation ||
                    'Room'}
                </span>
              ) : order.orderType === 'DELIVERY' ? (
                <span className="flex items-center gap-1 bg-green-100 border border-green-300 text-green-800 text-xs font-black px-2 py-0.5 rounded-lg font-outfit">
                  <Truck
                    size={10}
                    strokeWidth={3}
                  />

                  Delivery
                </span>
              ) : (
                <span className="flex items-center gap-1 bg-orange-100 border border-orange-300 text-orange-800 text-xs font-black px-2 py-0.5 rounded-lg font-outfit">
                  <ShoppingBag
                    size={10}
                    strokeWidth={3}
                  />

                  Takeaway
                </span>
              )}

            </div>

            {(order.customer ||
              order.customers?.[0]) && (
              <div className="text-xs text-slate-500 font-bold mt-1">
                For:{' '}
                {order.customer?.name ||
                  order.customers?.[0]?.name}
              </div>
            )}

          </div>

          <div className="text-right flex-shrink-0">

            <div
              className={`font-mono font-black text-2xl leading-none ${timer.color}`}
            >
              {timer.display}
            </div>

            <div className="text-[10px] text-slate-400 font-bold mt-1 flex items-center justify-end gap-1">

              {timer.minutes < 10 ? (
                <>
                  <Check
                    size={12}
                    className="text-emerald-500"
                  />

                  <span className="text-emerald-600">
                    On time
                  </span>
                </>
              ) : timer.minutes < 15 ? (
                <>
                  <AlertTriangle
                    size={12}
                    className="text-amber-500"
                  />

                  <span className="text-amber-600">
                    Getting late
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle
                    size={12}
                    className="text-rose-500 animate-pulse"
                  />

                  <span className="text-rose-600 font-extrabold animate-pulse">
                    Urgent!
                  </span>
                </>
              )}

            </div>

          </div>

        </div>

      </div>

      {/* ─────────────────────────────────────────────
          PROGRESS BAR
      ───────────────────────────────────────────── */}
      {totalItems > 0 && (
        <div className="w-full bg-slate-100 h-1.5 border-b border-slate-200">

          <div
            className="h-full bg-violet-600 transition-all duration-300"
            style={{
              width: `${progressPercent}%`
            }}
          />

        </div>
      )}

      {/* ─────────────────────────────────────────────
          PROGRESS STATS
      ───────────────────────────────────────────── */}
      <div className="px-4 py-1.5 bg-slate-50/20 border-b border-slate-100 flex justify-between items-center text-[11px] font-bold text-slate-500 font-outfit">

        <span>
          ITEMS PREPARED
        </span>

        <span className="text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
          {completedItems}/{totalItems}
        </span>

      </div>

      {/* ─────────────────────────────────────────────
          CUSTOMER NOTE
      ───────────────────────────────────────────── */}
      {order.customerNotes?.trim() && (
        <div className="mx-3 mt-3 flex items-start gap-2 bg-amber-50 border-2 border-amber-300 rounded-lg px-3 py-2">

          <StickyNote
            size={14}
            className="text-amber-600 flex-shrink-0 mt-0.5"
            strokeWidth={2.5}
          />

          <div className="min-w-0">

            <div className="text-[10px] font-black uppercase tracking-wide text-amber-700">
              Order Note
            </div>

            <div className="text-xs font-bold text-slate-700 mt-0.5 break-words">
              {order.customerNotes}
            </div>

          </div>

        </div>
      )}

      {/* ─────────────────────────────────────────────
          ITEMS
      ───────────────────────────────────────────── */}
      <div className="border-t border-slate-100 mt-3">

        {kdsLines.map((line) => {

          const isDone =
            line.kdsStatus ===
            KDS_ITEM_STATUS.DONE;

          return (
            <div
              key={line.id}
              onClick={() =>
                onItemToggle(
                  ticket.id,
                  line.id
                )
              }
              className={`
                flex items-center gap-3 px-4 py-2.5
                transition border-b border-slate-100
                font-jakarta select-none
                ${
                  isDone
                    ? 'opacity-45 bg-slate-50/50 cursor-pointer hover:opacity-75'
                    : 'hover:bg-violet-50/30 cursor-pointer'
                }
              `}
            >

              <div
                className={`
                  w-5 h-5 rounded border-2 flex-shrink-0
                  flex items-center justify-center transition
                  ${
                    isDone
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'bg-white border-slate-800'
                  }
                `}
              >

                {isDone && (
                  <svg
                    width="10"
                    height="8"
                    viewBox="0 0 10 8"
                    fill="none"
                  >
                    <path
                      d="M1 4L3.5 6.5L9 1"
                      stroke="white"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}

              </div>

              <span
                className={`
                  flex-1 text-sm font-bold transition
                  ${
                    isDone
                      ? 'line-through text-slate-400 font-medium'
                      : 'text-slate-700'
                  }
                `}
              >
                {line.product?.name || '—'}
              </span>

              <span
                className={`
                  font-black text-sm font-outfit
                  ${
                    isDone
                      ? 'text-slate-400'
                      : 'text-violet-600'
                  }
                `}
              >
                ×{line.quantity}
              </span>

            </div>
          );
        })}

      </div>

      {/* ─────────────────────────────────────────────
          ACTIONS
      ───────────────────────────────────────────── */}
      <div className="p-3 bg-slate-50/60 border-t border-slate-100 flex items-center gap-2">

        {ticket.stage === KDS_STAGE.TO_COOK && (
          <button
            onClick={() =>
              onStageUpdate(
                ticket.id,
                KDS_STAGE.PREPARING
              )
            }
            className="w-full flex items-center justify-center gap-1.5 bg-amber-400 hover:bg-amber-500 text-slate-900 border-2 border-slate-800 py-1.5 px-3 rounded-xl font-black text-xs shadow-pop-sm transition active:scale-95 font-outfit"
          >
            <ChefHat
              size={14}
              strokeWidth={2.5}
            />

            Start Preparing
          </button>
        )}

        {ticket.stage === KDS_STAGE.PREPARING && (
          <>
            <button
              onClick={() =>
                onStageUpdate(
                  ticket.id,
                  KDS_STAGE.TO_COOK
                )
              }
              title="Move back to To Cook"
              className="flex items-center justify-center bg-white hover:bg-rose-50 text-rose-600 border-2 border-slate-800 p-2 rounded-xl text-xs shadow-pop-sm transition active:scale-95"
            >
              <RotateCcw
                size={14}
                strokeWidth={2.5}
              />
            </button>

            <button
              onClick={() =>
                onStageUpdate(
                  ticket.id,
                  KDS_STAGE.COMPLETED
                )
              }
              className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white border-2 border-slate-800 py-1.5 px-3 rounded-xl font-black text-xs shadow-pop-sm transition active:scale-95 font-outfit"
            >
              <Check
                size={14}
                strokeWidth={3}
              />

              Mark Completed
            </button>
          </>
        )}

        {/* {ticket.stage === KDS_STAGE.COMPLETED && (
          <button
            onClick={() =>
              onStageUpdate(
                ticket.id,
                KDS_STAGE.PREPARING
              )
            }
            className="w-full flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 border-2 border-slate-800 py-1.5 px-3 rounded-xl font-black text-xs shadow-pop-sm transition active:scale-95 font-outfit"
          >
            <RotateCcw
              size={14}
              strokeWidth={2.5}
            />

            Recall to Preparing
          </button>
        )} */}

        {ticket.stage === KDS_STAGE.COMPLETED && (
  <div className="w-full grid grid-cols-2 gap-2">
    <button
      onClick={() =>
        onStageUpdate(
          ticket.id,
          KDS_STAGE.PREPARING
        )
      }
      className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 border-2 border-slate-800 py-1.5 px-2 rounded-xl font-black text-xs shadow-pop-sm transition active:scale-95 font-outfit"
    >
      <RotateCcw
        size={14}
        strokeWidth={2.5}
      />
      Recall
    </button>

    <button
      onClick={() => onNotifyWaiter(ticket)}
      className="flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white border-2 border-slate-800 py-1.5 px-2 rounded-xl font-black text-xs shadow-pop-sm transition active:scale-95 font-outfit"
    >
      <Bell
        size={14}
        strokeWidth={2.5}
      />
      Notify Waiter
    </button>
  </div>
)}

      </div>

    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   KITCHEN DISPLAY — MAIN
───────────────────────────────────────────────────────── */

export default function KitchenDisplay({
  station = 'KITCHEN'
}) {

  const { user } = useAuthStore();

  /* Profile menu */
  const [showProfileMenu, setShowProfileMenu] =
    useState(false);

  const [tickets, setTickets] =
    useState([]);

  const [clock, setClock] =
    useState(new Date());

  const [loading, setLoading] =
    useState(true);

  const [searchTerm, setSearchTerm] =
    useState('');

  const [filterCategory, setFilterCategory] =
    useState('');

  const [categories, setCategories] =
    useState([]);

  /* ─────────────────────────────────────────────
     SOUND
  ───────────────────────────────────────────── */

  const [soundEnabled, setSoundEnabled] =
    useState(() => {

      const saved =
        localStorage.getItem(
          'kds_sound_enabled'
        );

      return saved !== null
        ? saved === 'true'
        : true;
    });

  /*
   * Tickets currently highlighted as NEW.
   */
  const [newTicketIds, setNewTicketIds] =
    useState(() => new Set());

  /*
   * Tickets currently highlighted as UPDATED.
   */
  const [updatedTicketIds, setUpdatedTicketIds] =
    useState(() => new Set());

  const socketRef = useRef(null);

  const audioRef = useRef(null);

  const tickTimer = useRef(null);

  /*
   * Synchronous ticket copy.
   */
  const ticketsRef = useRef([]);

  /* ── Keep tickets ref synchronized ── */
  useEffect(() => {
    ticketsRef.current = tickets;
  }, [tickets]);

  /* ── Clock ticker ── */
  useEffect(() => {

    const id = setInterval(
      () => setClock(new Date()),
      1000
    );

    tickTimer.current = setInterval(
      () => setTickets((t) => [...t]),
      60000
    );

    return () => {
      clearInterval(id);
      clearInterval(
        tickTimer.current
      );
    };

  }, []);

  /* ─────────────────────────────────────────────
     NOTIFICATION SOUND
  ───────────────────────────────────────────── */

  const playNotify = useCallback(() => {

    if (!soundEnabled) return;

    try {

      if (!audioRef.current) {

        audioRef.current =
          new Audio('/notify.mp3');

        audioRef.current.preload =
          'auto';

        audioRef.current.volume = 1.0;
      }

      audioRef.current.currentTime = 0;

      const playPromise =
        audioRef.current.play();

      if (
        playPromise !== undefined
      ) {

        playPromise.catch((error) => {

          console.warn(
            'KDS notification sound blocked:',
            error
          );

        });

      }

    } catch (error) {

      console.warn(
        'Failed to play KDS notification sound:',
        error
      );

    }

  }, [soundEnabled]);

  /* ── Toggle sound ── */
  const toggleSound = () => {

    setSoundEnabled((prev) => {

      const next = !prev;

      localStorage.setItem(
        'kds_sound_enabled',
        String(next)
      );

      if (next) {

        try {

          if (!audioRef.current) {

            audioRef.current =
              new Audio('/notify.mp3');

            audioRef.current.preload =
              'auto';

            audioRef.current.volume = 1.0;
          }

        } catch {}

      }

      return next;
    });
  };

  /* ── Test sound ── */
  const handleTestSound = async () => {

    try {

      if (!audioRef.current) {

        audioRef.current =
          new Audio('/notify.mp3');

        audioRef.current.preload =
          'auto';

        audioRef.current.volume = 1.0;
      }

      audioRef.current.currentTime = 0;

      await audioRef.current.play();

      toast.success(
        'Sound check successful!'
      );

    } catch (error) {

      console.warn(
        'Test sound failed:',
        error
      );

      toast.error(
        'Sound could not play. Check that notify.mp3 exists and browser audio is allowed.'
      );

    }

  };

  /* ─────────────────────────────────────────────
     NEW TICKET HIGHLIGHT
  ───────────────────────────────────────────── */

  const highlightNewTickets =
    useCallback(
      (ticketIds) => {

        if (!ticketIds.length) return;

        setNewTicketIds((prev) => {

          const next = new Set(prev);

          ticketIds.forEach((id) => {

            if (id) {
              next.add(id);
            }

          });

          return next;
        });

        /*
         * Remove NEW highlight after 10 seconds.
         */
        setTimeout(() => {

          setNewTicketIds((prev) => {

            const next = new Set(prev);

            ticketIds.forEach((id) => {
              next.delete(id);
            });

            return next;
          });

        }, 10000);

      },
      []
    );

  /* ─────────────────────────────────────────────
     UPDATED TICKET HIGHLIGHT
  ───────────────────────────────────────────── */

  const highlightUpdatedTickets =
    useCallback(
      (ticketIds) => {

        if (!ticketIds?.length) {
          return;
        }

        setUpdatedTicketIds((prev) => {

          const next = new Set(prev);

          ticketIds.forEach((id) => {

            if (id) {
              next.add(id);
            }

          });

          return next;
        });

        /*
         * Remove UPDATED highlight after
         * 7 seconds.
         */
        setTimeout(() => {

          setUpdatedTicketIds((prev) => {

            const next = new Set(prev);

            ticketIds.forEach((id) => {
              next.delete(id);
            });

            return next;
          });

        }, 300000);

      },
      []
    );

  /* ─────────────────────────────────────────────
     ADD NEW TICKETS
  ───────────────────────────────────────────── */

  const addNewTickets =
    useCallback(
      (incoming) => {

        const stationTickets =
          incoming.filter(
            (ticket) =>
              ticket?.station === station &&
              ticket?.id
          );

        if (
          stationTickets.length === 0
        ) {
          return;
        }

        const existingIds =
          new Set(
            ticketsRef.current.map(
              (ticket) =>
                ticket.id
            )
          );

        const fresh =
          stationTickets.filter(
            (ticket) =>
              !existingIds.has(
                ticket.id
              )
          );

        /*
         * Ignore duplicate socket events.
         */
        if (fresh.length === 0) {
          return;
        }

        const nextTickets = [
          ...fresh,
          ...ticketsRef.current
        ];

        ticketsRef.current =
          nextTickets;

        setTickets(nextTickets);

        /* Highlight new tickets */
        highlightNewTickets(
          fresh.map(
            (ticket) =>
              ticket.id
          )
        );

        /* Play sound once */
        playNotify();

        toast(
          `${fresh.length} new ${
            fresh.length === 1
              ? 'order'
              : 'orders'
          } received!`,
          {
            icon: (
              <Utensils
                size={18}
                className="text-orange-400"
              />
            ),

            duration: 4000,

            style: {
              background: '#1F2937',
              color: '#fff',
              border:
                '1px solid #F97316'
            }
          }
        );

      },
      [
        station,
        playNotify,
        highlightNewTickets
      ]
    );

  /* ─────────────────────────────────────────────
     FETCH INITIAL TICKETS
  ───────────────────────────────────────────── */

  useEffect(() => {

    setLoading(true);

    api.get('/kds/tickets')

      .then((data) => {

        const stationTickets =
          (data || []).filter(
            (ticket) =>
              ticket.station === station
          );

        ticketsRef.current =
          stationTickets;

        setTickets(
          stationTickets
        );

      })

      .catch(() =>
        toast.error(
          'Failed to load tickets'
        )
      )

      .finally(() =>
        setLoading(false)
      );

  }, [station]);

  /* ─────────────────────────────────────────────
     FETCH CATEGORIES
  ───────────────────────────────────────────── */

  useEffect(() => {

    api.get('/categories')

      .then((data) =>
        setCategories(data || [])
      )

      .catch(() =>
        toast.error(
          'Failed to load categories'
        )
      );

  }, []);

  /* ─────────────────────────────────────────────
     SOCKET.IO
  ───────────────────────────────────────────── */

  useEffect(() => {

    const socketUrl = (
      import.meta.env.VITE_API_URL ||
      'http://localhost:5000/api'
    ).replace(
      /\/api\/?$/,
      ''
    );

    const socket = io(
      socketUrl,
      {
        transports: [
          'websocket',
          'polling'
        ],

        auth: {
          token: getToken()
        }
      }
    );

    socketRef.current = socket;

    socket.emit(
      SOCKET_EVENTS.JOIN_KDS,
      user?.organizationId
    );

    /* ─────────────────────────────────────
       NEW ORDER
    ───────────────────────────────────── */

    socket.on(
      SOCKET_EVENTS.NEW_ORDER,
      (payload) => {

        const incoming =
          Array.isArray(payload)
            ? payload
            : [payload];

        addNewTickets(
          incoming
        );

      }
    );

    /* ─────────────────────────────────────
       TICKET UPDATED
    ───────────────────────────────────── */

    // socket.on(
    //   SOCKET_EVENTS.TICKET_UPDATED,
    //   (payload) => {

    //     const updates =
    //       Array.isArray(payload)
    //         ? payload
    //         : [payload];

    //     /*
    //      * Only process updates relevant
    //      * to this station.
    //      */
    //     const stationUpdates =
    //       updates.filter((ticket) => {

    //         if (!ticket?.id) {
    //           return false;
    //         }

    //         const hasStationItems =
    //           ticket.order?.lines?.some(
    //             (line) =>
    //               line.kdsStation ===
    //               station
    //           );

    //         return (
    //           ticket.station ===
    //             station ||
    //           hasStationItems
    //         );

    //       });

    //     if (
    //       stationUpdates.length === 0
    //     ) {
    //       return;
    //     }

    //     /* Update existing tickets
    //        or add new station ticket */
    //     setTickets((prev) => {

    //       const next = [...prev];

    //       stationUpdates.forEach(
    //         (updated) => {

    //           const existingIndex =
    //             next.findIndex(
    //               (ticket) =>
    //                 ticket.id ===
    //                 updated.id
    //             );

    //           /*
    //            * Existing ticket
    //            */
    //           if (
    //             existingIndex !== -1
    //           ) {

    //             const existing =
    //               next[
    //                 existingIndex
    //               ];

    //             next[
    //               existingIndex
    //             ] = {

    //               ...existing,

    //               ...updated,

    //               order: {
    //                 ...existing.order,
    //                 ...updated.order,

    //                 lines:
    //                   updated.order
    //                     ?.lines ||
    //                   existing.order
    //                     ?.lines ||
    //                   []
    //               }

    //             };

    //             return;
    //           }

    //           /*
    //            * New ticket created for
    //            * this station.
    //            */
    //           next.unshift(
    //             updated
    //           );

    //         }
    //       );

    //       ticketsRef.current =
    //         next;

    //       return next;

    //     });

    //     /*
    //      * Highlight updated cards.
    //      */
    //     const ticketIds =
    //       stationUpdates
    //         .map(
    //           (ticket) =>
    //             ticket.id
    //         )
    //         .filter(Boolean);

    //     highlightUpdatedTickets(
    //       ticketIds
    //     );

    //     /*
    //      * Play sound.
    //      */
    //     playNotify();

    //     /*
    //      * Show toast.
    //      */
    //     toast(
    //       stationUpdates.length ===
    //         1
    //         ? `Order #${
    //             stationUpdates[0]
    //               ?.order
    //               ?.orderNumber ||
    //             '—'
    //           } updated`
    //         : `${stationUpdates.length} orders updated`,
    //       {
    //         icon: (
    //           <AlertCircle
    //             size={18}
    //             className="text-amber-400"
    //           />
    //         ),

    //         duration: 4000,

    //         style: {
    //           background:
    //             '#1F2937',

    //           color: '#fff',

    //           border:
    //             '1px solid #F59E0B'
    //         }
    //       }
    //     );

    //   }
    // );


    socket.on('waiter-ack', ({ orderId, ackName }) => {
  toast.success(`${ackName || 'Waiter'} is on it!`, { icon: '✅' });
});

    socket.on(
  SOCKET_EVENTS.TICKET_UPDATED,
  (payload) => {

    // New backend payload:
    // {
    //   source: 'POS' | 'KDS',
    //   reason: 'ORDER_UPDATED' | 'STAGE_UPDATED',
    //   tickets: [...]
    // }

    const isStructuredPayload =
      payload &&
      !Array.isArray(payload) &&
      Array.isArray(payload.tickets);

    // Old payloads are treated as POS updates
    const source = isStructuredPayload
      ? payload.source
      : 'POS';

    const updates = isStructuredPayload
      ? payload.tickets
      : Array.isArray(payload)
        ? payload
        : [payload];

    // Only POS / waiter updates should
    // trigger UPDATED + sound + toast.
    const showUpdateNotification =
      source !== 'KDS';

    /*
     * Only process updates relevant
     * to this station.
     */
    const stationUpdates =
      updates.filter((ticket) => {

        if (!ticket?.id) {
          return false;
        }

        const hasStationItems =
          ticket.order?.lines?.some(
            (line) =>
              line.kdsStation === station
          );

        return (
          ticket.station === station ||
          hasStationItems
        );

      });

    if (stationUpdates.length === 0) {
      return;
    }

    /*
     * Update existing tickets
     * or add a new station ticket.
     */
    setTickets((prev) => {

      const next = [...prev];

      stationUpdates.forEach(
        (updated) => {

          const existingIndex =
            next.findIndex(
              (ticket) =>
                ticket.id === updated.id
            );

          /*
           * Existing ticket
           */
          if (existingIndex !== -1) {

            const existing =
              next[existingIndex];

            next[existingIndex] = {
              ...existing,
              ...updated,

              order: {
                ...existing.order,
                ...updated.order,

                lines:
                  updated.order?.lines ||
                  existing.order?.lines ||
                  []
              }
            };

            return;
          }

          /*
           * New ticket created for
           * this station.
           */
          next.unshift(updated);

        }
      );

      ticketsRef.current = next;

      return next;

    });

    /*
     * IMPORTANT:
     *
     * KDS stage changes update the ticket,
     * but they do NOT show UPDATED,
     * do NOT play sound,
     * and do NOT show the update toast.
     */
    if (!showUpdateNotification) {
      return;
    }

    /*
     * Highlight updated cards.
     */
    const ticketIds =
      stationUpdates
        .map(
          (ticket) => ticket.id
        )
        .filter(Boolean);

    highlightUpdatedTickets(
      ticketIds
    );

    /*
     * Play sound.
     */
    playNotify();

    /*
     * Show toast.
     */
    toast(
      stationUpdates.length === 1
        ? `Order #${
            stationUpdates[0]
              ?.order
              ?.orderNumber || '—'
          } updated`
        : `${stationUpdates.length} orders updated`,
      {
        icon: (
          <AlertCircle
            size={18}
            className="text-amber-400"
          />
        ),

        duration: 4000,

        style: {
          background: '#1F2937',
          color: '#fff',
          border: '1px solid #F59E0B'
        }
      }
    );

  }
);


    /* ─────────────────────────────────────
       ITEM DONE
    ───────────────────────────────────── */

    socket.on(
      SOCKET_EVENTS.ITEM_DONE,
      ({
        ticketId,
        lineId
      }) => {

        setTickets((prev) => {

          const next =
            prev.map(
              (ticket) => {

                if (
                  ticket.id !==
                  ticketId
                ) {
                  return ticket;
                }

                return {

                  ...ticket,

                  order: {

                    ...ticket.order,

                    lines:
                      (
                        ticket.order
                          ?.lines ||
                        []
                      ).map(
                        (line) =>
                          line.id ===
                          lineId
                            ? {
                                ...line,
                                kdsStatus:
                                  KDS_ITEM_STATUS.DONE
                              }
                            : line
                      )

                  }

                };

              }
            );

          ticketsRef.current =
            next;

          return next;

        });

      }
    );

    /* ─────────────────────────────────────
       ITEM STATUS UPDATED
    ───────────────────────────────────── */

    socket.on(
      SOCKET_EVENTS.ITEM_STATUS_UPDATED,
      ({
        ticketId,
        lineId,
        kdsStatus
      }) => {

        setTickets((prev) => {

          const next =
            prev.map(
              (ticket) => {

                if (
                  ticket.id !==
                  ticketId
                ) {
                  return ticket;
                }

                return {

                  ...ticket,

                  order: {

                    ...ticket.order,

                    lines:
                      (
                        ticket.order
                          ?.lines ||
                        []
                      ).map(
                        (line) =>
                          line.id ===
                          lineId
                            ? {
                                ...line,
                                kdsStatus
                              }
                            : line
                      )

                  }

                };

              }
            );

          ticketsRef.current =
            next;

          return next;

        });

      }
    );

    /* ─────────────────────────────────────
       ORDER PAID
    ───────────────────────────────────── */

    socket.on(
      SOCKET_EVENTS.ORDER_PAID,
      ({ orderId }) => {

        setTickets((prev) => {

          const next =
            prev.map(
              (ticket) =>
                ticket.orderId ===
                orderId
                  ? {
                      ...ticket,
                      _paid: true
                    }
                  : ticket
            );

          ticketsRef.current =
            next;

          return next;

        });

        setTimeout(() => {

          setTickets((prev) => {

            const next =
              prev.filter(
                (ticket) =>
                  ticket.orderId !==
                  orderId
              );

            ticketsRef.current =
              next;

            return next;

          });

        }, 3000);

      }
    );

    /* ─────────────────────────────────────
       ORDER CANCELLED
    ───────────────────────────────────── */

    socket.on(
      SOCKET_EVENTS.ORDER_CANCELLED,
      ({ orderId }) => {

        setTickets((prev) => {

          const next =
            prev.filter(
              (ticket) =>
                ticket.orderId !==
                orderId
            );

          ticketsRef.current =
            next;

          return next;

        });

        toast(
          'Order cancelled',
          {
            icon: (
              <AlertCircle
                size={18}
                className="text-rose-400"
              />
            ),

            duration: 3000,

            style: {
              background:
                '#1F2937',

              color: '#fff',

              border:
                '1px solid #374151'
            }
          }
        );

      }
    );

    return () => {
      socket.disconnect();
    };

  }, [
    addNewTickets,
    station,
    user?.organizationId,
    highlightUpdatedTickets,
    playNotify
  ]);

  /* ─────────────────────────────────────────────
     STAGE UPDATE
  ───────────────────────────────────────────── */

  const handleStageUpdate =
    async (
      ticketId,
      stage
    ) => {

      try {

        const updated =
          await api.put(
            `/kds/tickets/${ticketId}/stage`,
            {
              stage
            }
          );

        setTickets((prev) => {

          const next =
            prev.map(
              (ticket) =>
                ticket.id ===
                ticketId
                  ? {
                      ...ticket,
                      ...updated
                    }
                  : ticket
            );

          ticketsRef.current =
            next;

          return next;

        });

        /*
         * Remove NEW highlight.
         */
        setNewTicketIds((prev) => {

          const next =
            new Set(prev);

          next.delete(ticketId);

          return next;

        });

        /*
         * Remove UPDATED highlight.
         */
        setUpdatedTicketIds(
          (prev) => {

            const next =
              new Set(prev);

            next.delete(ticketId);

            return next;

          }
        );

      } catch {

        toast.error(
          'Failed to update stage'
        );

      }

    };

  /* ─────────────────────────────────────────────
     ITEM DONE TOGGLE
  ───────────────────────────────────────────── */

  const handleItemToggle =
    async (
      ticketId,
      lineId
    ) => {

      try {

        const updatedLine =
          await api.put(
            `/kds/tickets/${ticketId}/items/${lineId}/done`
          );

        setTickets((prev) => {

          const next =
            prev.map(
              (ticket) => {

                if (
                  ticket.id !==
                  ticketId
                ) {
                  return ticket;
                }

                return {

                  ...ticket,

                  order: {

                    ...ticket.order,

                    lines:
                      (
                        ticket.order
                          ?.lines ||
                        []
                      ).map(
                        (line) =>
                          line.id ===
                          lineId
                            ? {
                                ...line,

                                kdsStatus:
                                  updatedLine.kdsStatus ||
                                  (
                                    line.kdsStatus ===
                                    KDS_ITEM_STATUS.DONE
                                      ? KDS_ITEM_STATUS.PENDING
                                      : KDS_ITEM_STATUS.DONE
                                  )
                              }
                            : line
                      )

                  }

                };

              }
            );

          ticketsRef.current =
            next;

          return next;

        });

      } catch {

        toast.error(
          'Failed to toggle item status'
        );

      }

    };

    /* ─────────────────────────────────────────────
   NOTIFY WAITER
   Sends a call to the waiter display kiosks.
───────────────────────────────────────────── */

const handleNotifyWaiter = (ticket) => {
  const socket = socketRef.current;

  if (!socket) {
    toast.error('Not connected — cannot notify waiter');
    return;
  }

  const order = ticket.order || {};

  // Only send items that belong to this station
  const lines = (order.lines || []).filter(
    (line) => line.kdsStation === station
  );

  socket.emit('waiter-call', {
    orderId: ticket.orderId,
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    tableNumber: order.table?.tableNumber || null,
    items: lines.map((line) => ({
      name: line.product?.name || '—',
      qty: line.quantity,
    })),
  });

  toast.success(
    `Waiter notified for #${order.orderNumber || '—'}`,
    { icon: '🔔' }
  );
};

  /* ─────────────────────────────────────────────
     TICKET GROUPS
  ───────────────────────────────────────────── */

  const toCookTickets =
    tickets.filter(
      (ticket) =>
        ticket.stage ===
          KDS_STAGE.TO_COOK &&
        !ticket._paid
    );

  const preparingTickets =
    tickets.filter(
      (ticket) =>
        ticket.stage ===
          KDS_STAGE.PREPARING &&
        !ticket._paid
    );

  const completedTickets =
    tickets.filter(
      (ticket) =>
        ticket.stage ===
          KDS_STAGE.COMPLETED &&
        !ticket._paid &&
        ticket.order?.status !==
          ORDER_STATUS.PAID
    );

  /* ─────────────────────────────────────────────
     FILTERED TICKETS
  ───────────────────────────────────────────── */

  const filteredTickets =
    (ticketsList) => {

      return ticketsList.filter(
        (ticket) => {

          const lines =
            ticket.order?.lines ||
            [];

          const matchesSearch =
            searchTerm === '' ||
            lines.some(
              (line) =>
                line.product?.name
                  ?.toLowerCase()
                  .includes(
                    searchTerm
                      .toLowerCase()
                  )
            );

          const matchesCategory =
            filterCategory === '' ||
            lines.some(
              (line) =>
                line.product
                  ?.category
                  ?.name ===
                filterCategory
            );

          return (
            matchesSearch &&
            matchesCategory
          );

        }
      );

    };

  const totalActive =
    tickets.filter(
      (ticket) =>
        ticket.stage !==
          KDS_STAGE.COMPLETED &&
        !ticket._paid
    ).length;

  /* ─────────────────────────────────────────────
     NAVIGATION
  ───────────────────────────────────────────── */

  const navigate = useNavigate();

  /* ─────────────────────────────────────────────
     LOGOUT
  ───────────────────────────────────────────── */

  const handleLogout = () => {

    useAuthStore
      .getState()
      .logout();

    setShowProfileMenu(false);

    navigate(
      '/login',
      {
        replace: true
      }
    );

  };

  return (
    <div className="min-h-screen flex flex-col font-jakarta text-slate-800 bg-[#FFFDF5]">

      {/* ─────────────────────────────────────────
          TOP BAR
      ───────────────────────────────────────── */}

      <header className="bg-white border-b-2 border-slate-800 px-6 py-3 flex items-center gap-4 shrink-0 shadow-[0_2px_0px_0px_#E2E8F0]">

        {/* Page title */}
        <div className="flex items-center gap-3">

          <span className="flex items-center gap-2 text-2xl font-black text-slate-800 font-outfit">

            <Coffee
              size={24}
              strokeWidth={2.5}
              className="text-violet-600"
            />

            {station === 'BAR'
              ? 'Bar Display'
              : 'Kitchen Display'}

          </span>

          {totalActive > 0 && (
            <span className="bg-rose-500 border-2 border-slate-800 text-white text-xs font-black px-2.5 py-1 rounded-full animate-pulse shadow-pop-sm">
              {totalActive} active
            </span>
          )}

        </div>

        {/* Ticket counts */}
        <div className="flex items-center gap-3 font-outfit">

          <span className="bg-rose-100 border-2 border-slate-800 text-rose-800 text-xs font-black px-2.5 py-1.5 rounded-xl shadow-pop-sm">
            {toCookTickets.length} to cook
          </span>

          <span className="bg-amber-100 border-2 border-slate-800 text-amber-800 text-xs font-black px-2.5 py-1.5 rounded-xl shadow-pop-sm">
            {preparingTickets.length} preparing
          </span>

        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">

          {/* Sound controls */}
          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={toggleSound}
              title={
                soundEnabled
                  ? 'Turn notification sound OFF'
                  : 'Turn notification sound ON'
              }
              className={`
                flex items-center gap-2
                border-2 border-slate-800
                px-3 py-2 rounded-xl
                shadow-pop-sm
                transition
                active:scale-95
                font-outfit
                font-black text-xs
                ${
                  soundEnabled
                    ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }
              `}
            >

              {soundEnabled ? (
                <Volume2 size={16} />
              ) : (
                <VolumeX size={16} />
              )}

              <span className="hidden lg:inline">
                {soundEnabled
                  ? 'Sound ON'
                  : 'Sound OFF'}
              </span>

            </button>

            <button
              type="button"
              onClick={
                handleTestSound
              }
              title="Test notification sound"
              className="flex items-center gap-2 bg-orange-100 hover:bg-orange-200 text-orange-800 border-2 border-slate-800 px-3 py-2 rounded-xl shadow-pop-sm transition active:scale-95 font-outfit font-black text-xs"
            >

              <Play
                size={15}
                fill="currentColor"
              />

              <span className="hidden lg:inline">
                Test Sound
              </span>

            </button>

          </div>

          {/* Clock */}
          <div className="text-right hidden md:block">

            <div className="text-slate-800 font-mono text-lg font-bold font-outfit">
              {clock.toLocaleTimeString(
                'en-IN',
                {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                }
              )}
            </div>

            <div className="text-slate-500 text-xs mt-0.5">
              {clock.toLocaleDateString(
                'en-IN',
                {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short'
                }
              )}
            </div>

          </div>

          {/* User profile */}
          <div className="relative">

            <button
              type="button"
              onClick={() =>
                setShowProfileMenu(
                  (prev) => !prev
                )
              }
              className="flex items-center gap-2 bg-white hover:bg-slate-50 border-2 border-slate-800 px-3 py-2 rounded-xl shadow-pop-sm transition"
            >

              <div className="w-8 h-8 rounded-lg bg-violet-100 border-2 border-violet-300 flex items-center justify-center">

                <User
                  size={17}
                  className="text-violet-700"
                  strokeWidth={2.5}
                />

              </div>

              <div className="text-left hidden sm:block">

                <div className="text-sm font-black text-slate-800 font-outfit">
                  {user?.name || 'User'}
                </div>

                <div className="text-[10px] font-bold text-slate-500 uppercase">
                  {user?.role || station}
                </div>

              </div>

              <ChevronDown
                size={16}
                className={`text-slate-600 transition-transform ${
                  showProfileMenu
                    ? 'rotate-180'
                    : ''
                }`}
              />

            </button>

            {/* Profile dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white border-2 border-slate-800 rounded-xl shadow-[4px_4px_0px_0px_#1E293B] z-50 overflow-hidden">

                <div className="p-4 border-b-2 border-slate-200 bg-slate-50">

                  <div className="flex items-center gap-3">

                    <div className="w-11 h-11 rounded-xl bg-violet-100 border-2 border-violet-300 flex items-center justify-center">

                      <User
                        size={22}
                        className="text-violet-700"
                        strokeWidth={2.5}
                      />

                    </div>

                    <div className="min-w-0">

                      <div className="font-black text-slate-800 truncate font-outfit">
                        {user?.name ||
                          'User'}
                      </div>

                      <div className="text-xs text-slate-500 truncate">
                        {user?.email ||
                          'No email'}
                      </div>

                    </div>

                  </div>

                  <div className="mt-3">

                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-violet-100 border border-violet-300 text-violet-800 text-xs font-black uppercase">
                      {user?.role ||
                        station}
                    </span>

                  </div>

                </div>

                <button
                  type="button"
                  onClick={
                    handleLogout
                  }
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-rose-50 text-rose-600 transition font-bold text-sm border-t border-slate-200"
                >

                  <LogOut size={17} />

                  Logout

                </button>

              </div>
            )}

          </div>

        </div>

      </header>

      {/* ─────────────────────────────────────────
          FILTER BAR
      ───────────────────────────────────────── */}

      <div className="flex gap-3 p-4 bg-white border-b-2 border-slate-800 font-jakarta shadow-[0_2px_0px_0px_#E2E8F0]">

        <input
          type="text"
          value={searchTerm}
          onChange={(e) =>
            setSearchTerm(
              e.target.value
            )
          }
          placeholder="Search by product name..."
          className="flex-1 bg-white border-2 border-slate-800 text-slate-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-violet-600 focus:shadow-[2px_2px_0px_0px_rgba(139,92,246,1)] transition-all font-medium"
        />

        <select
          value={filterCategory}
          onChange={(e) =>
            setFilterCategory(
              e.target.value
            )
          }
          className="bg-white border-2 border-slate-800 text-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-600 focus:shadow-[2px_2px_0px_0px_rgba(139,92,246,1)] transition-all font-bold"
        >

          <option value="">
            All Categories
          </option>

          {categories.map(
            (cat) => (
              <option
                key={cat.id}
                value={cat.name}
              >
                {cat.name}
              </option>
            )
          )}

        </select>

        {(searchTerm ||
          filterCategory) && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setFilterCategory('');
            }}
            className="bg-white hover:bg-slate-50 border-2 border-slate-800 text-slate-800 px-3 py-2 rounded-xl text-sm font-bold shadow-pop-sm transition font-outfit"
          >
            Clear
          </button>
        )}

      </div>

      {/* ─────────────────────────────────────────
          STAGE COLUMNS
      ───────────────────────────────────────── */}

      {loading ? (

        <div className="flex-1 flex items-center justify-center text-slate-500 bg-[#FFFDF5] font-jakarta">

          <div className="text-center">

            <div className="flex justify-center mb-3">

              <Loader2
                size={40}
                className="animate-spin text-slate-400"
              />

            </div>

            <div className="font-bold">
              Loading kitchen orders…
            </div>

          </div>

        </div>

      ) : (

        <div className="flex-1 overflow-hidden p-4 grid grid-cols-3 gap-6 bg-[#FFFDF5]">

          {STAGES.map(
            (stage) => {

              const meta =
                STAGE_META[
                  stage
                ];

              let stageTickets =
                [];

              if (
                stage ===
                KDS_STAGE.TO_COOK
              ) {

                stageTickets =
                  filteredTickets(
                    toCookTickets
                  );

              }

              if (
                stage ===
                KDS_STAGE.PREPARING
              ) {

                stageTickets =
                  filteredTickets(
                    preparingTickets
                  );

              }

              if (
                stage ===
                KDS_STAGE.COMPLETED
              ) {

                stageTickets =
                  filteredTickets(
                    completedTickets
                  );

              }

              return (

                <div
                  key={stage}
                  className="flex flex-col min-h-0"
                >

                  {/* Column header */}
                  <div
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl border-2 border-slate-800 mb-3 text-white ${meta.bg}`}
                    style={{
                      boxShadow:
                        'var(--pop-shadow-sm)'
                    }}
                  >

                    <div className="flex items-center gap-2">

                      <meta.icon
                        size={18}
                        className="text-white"
                      />

                      <span className="text-white font-bold text-sm uppercase tracking-wide font-outfit">
                        {meta.label}
                      </span>

                    </div>

                    <span className="bg-white border border-slate-800 text-slate-800 text-xs font-black w-6 h-6 rounded-full flex items-center justify-center font-outfit">
                      {
                        stageTickets.length
                      }
                    </span>

                  </div>

                  {/* Tickets list */}
                  <div className="flex-1 overflow-y-auto space-y-4 pr-0.5 pb-4">

                    {stageTickets.length ===
                      0 && (

                      <div className="border-2 border-dashed bg-white rounded-xl p-8 text-center border-slate-200 text-slate-400">

                        <div className="flex justify-center mb-2 text-slate-300">

                          <meta.icon
                            size={32}
                          />

                        </div>

                        <div className="text-sm font-semibold">

                          No{' '}
                          {meta.label.toLowerCase()}{' '}
                          orders

                        </div>

                      </div>

                    )}

                    {stageTickets.map(
                      (ticket) => (

                        <div
                          key={
                            ticket.id
                          }
                          className={`
                            transition-all
                            duration-500
                            ease-in-out
                            ${
                              newTicketIds.has(
                                ticket.id
                              )
                                ? 'new-ticket-wrapper'
                                : ''
                            }
                          `}
                        >

                          <TicketCard
                            ticket={
                              ticket
                            }

                            station={
                              station
                            }

                            isNew={
                              newTicketIds.has(
                                ticket.id
                              )
                            }

                            isUpdated={
                              updatedTicketIds.has(
                                ticket.id
                              )
                            }

                            onStageUpdate={
                              handleStageUpdate
                            }

                            onItemToggle={
                              handleItemToggle
                            }

                            onNotifyWaiter={handleNotifyWaiter} 
                          />

                        </div>

                      )
                    )}

                  </div>

                </div>

              );

            }
          )}

        </div>

      )}

      {/* ─────────────────────────────────────────
          EMPTY STATE
      ───────────────────────────────────────── */}

      {!loading &&
        totalActive === 0 &&
        filteredTickets(
          completedTickets
        ).length === 0 && (

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none font-jakarta">

            <div className="text-center">

              <div className="flex justify-center mb-4 text-emerald-500">

                <Utensils
                  size={48}
                />

              </div>

              <div className="text-emerald-600 text-2xl font-black font-outfit">

                {station === 'BAR'
                  ? 'Bar is clear!'
                  : 'Kitchen is clear!'}

              </div>

              <div className="text-slate-500 mt-2 font-medium">

                No active orders.
                Waiting for new
                orders…

              </div>

            </div>

          </div>

        )}

      {/* ─────────────────────────────────────────
          KEYFRAME STYLES
      ───────────────────────────────────────── */}

      <style>{`

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-12px) scale(0.97);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes pulse-border {
          0%, 100% {
            border-color: rgba(239,68,68,0.7);
            box-shadow:
              0 0 0 0 rgba(239,68,68,0.3);
          }

          50% {
            border-color: rgba(239,68,68,1);
            box-shadow:
              0 0 0 6px rgba(239,68,68,0);
          }
        }

        .animate-pulse-border {
          animation:
            pulse-border 1.5s ease-in-out infinite;
        }

        /* ─────────────────────────────
           NEW TICKET ANIMATION
        ───────────────────────────── */

        @keyframes new-ticket-pulse {

          0% {
            transform: scale(1);
            box-shadow:
              0 0 0 0 rgba(249,115,22,0.55);
          }

          50% {
            transform: scale(1.015);
            box-shadow:
              0 0 0 8px rgba(249,115,22,0.15);
          }

          100% {
            transform: scale(1);
            box-shadow:
              0 0 0 0 rgba(249,115,22,0);
          }

        }

        .new-ticket-highlight {
          animation:
            new-ticket-pulse 1.2s ease-in-out infinite;
        }

        /* ─────────────────────────────
           NEW TICKET WRAPPER
        ───────────────────────────── */

        @keyframes new-ticket-wrapper {

          0% {
            opacity: 0;
            transform:
              translateY(-18px)
              scale(0.96);
          }

          100% {
            opacity: 1;
            transform:
              translateY(0)
              scale(1);
          }

        }

        .new-ticket-wrapper {
          animation:
            new-ticket-wrapper 0.45s ease-out;
        }

        /* ─────────────────────────────
           UPDATED TICKET ANIMATION
        ───────────────────────────── */

        @keyframes updated-ticket-pulse {

          0% {
            transform: scale(1);
            box-shadow:
              0 0 0 0
              rgba(245,158,11,0.55);
          }

          50% {
            transform: scale(1.012);
            box-shadow:
              0 0 0 8px
              rgba(245,158,11,0.15);
          }

          100% {
            transform: scale(1);
            box-shadow:
              0 0 0 0
              rgba(245,158,11,0);
          }

        }

        .updated-ticket-highlight {
          animation:
            updated-ticket-pulse
            1.2s
            ease-in-out
            infinite;
        }

      `}</style>

    </div>
  );
}