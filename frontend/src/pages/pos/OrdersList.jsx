
// import { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import api from '../../api/client';
// import toast from 'react-hot-toast';
// import StatusBadge from '../../components/ui/StatusBadge';
// import { TableSkeleton } from '../../components/ui/SkeletonLoader';
// import ConfirmDialog from '../../components/ui/ConfirmDialog';
// import {
//   Armchair,
//   ShoppingBag,
//   ClipboardList,
//   Ticket,
//   CheckCircle2,
//   Edit3,
//   Trash2,
//   RefreshCw,
//   ChevronDown,
//   IndianRupee,
//   ShoppingCart,
//   ChefHat,
//   XCircle,
//   BellRing,
//   Truck,
//   Home,
//   MapPin,
//   Phone,
//   User,
//   Clock,
//   UserCheck,
// } from 'lucide-react';

// const BG      = '#FFFDF5';
// const WHITE   = '#FFFFFF';
// const FG      = '#1E293B';
// const MUTED   = '#64748B';
// const BORDER  = '#E2E8F0';
// const ACCENT  = '#8B5CF6';
// const AMBER   = '#FBBF24';
// const EMERALD = '#34D399';
// const PINK    = '#F472B6';
// const FONT_H  = "'Outfit', system-ui, sans-serif";
// const FONT_B  = "'Plus Jakarta Sans', system-ui, sans-serif";

// const fmt = (n) =>
//   `ETB ${Number(n || 0).toLocaleString('en-US', {
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2,
//   })}`;

// const STATUS_CONFIG = {
//   READY: {
//     color: '#7C3AED',
//     bg: '#EDE9FE',
//     border: '#C4B5FD',
//     label: 'Kitchen Ready',
//     accent: '#8B5CF6',
//     icon: BellRing,
//   },
//   SENT_TO_KITCHEN: {
//     color: '#2563EB',
//     bg: '#EFF6FF',
//     border: '#BFDBFE',
//     label: 'In Kitchen',
//     accent: '#60A5FA',
//     icon: ChefHat,
//   },
//   PAID: {
//     color: '#059669',
//     bg: `${EMERALD}20`,
//     border: `${EMERALD}60`,
//     label: 'Paid',
//     accent: EMERALD,
//     icon: CheckCircle2,
//   },
//   DRAFT: {
//     color: MUTED,
//     bg: '#F8FAFC',
//     border: BORDER,
//     label: 'Draft',
//     accent: MUTED,
//     icon: ShoppingCart,
//   },
//   CANCELLED: {
//     color: '#DC2626',
//     bg: '#FEF2F2',
//     border: '#FECACA',
//     label: 'Cancelled',
//     accent: '#F87171',
//     icon: XCircle,
//   },
// };

// const ORDER_STATUS_GROUPS = [
//   { id: 'READY', title: 'Kitchen Ready' },
//   { id: 'SENT_TO_KITCHEN', title: 'In Kitchen' },
//   { id: 'DRAFT', title: 'Draft / In Progress' },
//   { id: 'PAID', title: 'Paid' },
//   { id: 'CANCELLED', title: 'Cancelled' },
// ];

// export default function OrdersList({ session }) {
//   const navigate = useNavigate();

//   const [orders, setOrders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [cancelTarget, setCancelTarget] = useState(null);
//   const [cancelLoading, setCancelLoading] = useState(false);

//   const fetchOrders = async () => {
//     if (!session?.id) return;

//     try {
//       setLoading(true);
//       const data = await api.get(`/orders?sessionId=${session.id}`);
//       setOrders(data || []);
//     } catch {
//       toast.error('Failed to load orders');
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchOrders();
//   }, [session?.id]);

//   const handleCancel = async () => {
//     if (!cancelTarget) return;

//     setCancelLoading(true);

//     try {
//       await api.put(`/orders/${cancelTarget}/cancel`);
//       toast.success('Order cancelled');
//       fetchOrders();
//     } catch {
//       toast.error('Failed to cancel order');
//     } finally {
//       setCancelLoading(false);
//       setCancelTarget(null);
//     }
//   };

//   const handleEditOrder = (order) => {
//     const cartItems =
//       order.lines?.map((line) => ({
//         productId: line.productId,
//         name: line.product?.name,
//         unitPrice: parseFloat(line.unitPrice),
//         price: parseFloat(line.unitPrice),
//         quantity: line.quantity,
//         lineTotal: parseFloat(line.lineTotal),
//         categoryColor: line.product?.category?.color || ACCENT,
//         color: line.product?.category?.color || ACCENT,
//         tax: parseFloat(line.product?.tax || 0),
//       })) || [];

//     navigate('/pos', {
//       state: {
//         loadOrder: {
//           id: order.id,
//           orderNumber: order.orderNumber,
//           status: order.status,
//           orderType: order.orderType,
//           tableId: order.tableId,
//           table: order.table,
//           deliveryLocation: order.deliveryLocation,
//           customerNameSnapshot: order.customerNameSnapshot,
//           customerPhoneSnapshot: order.customerPhoneSnapshot,
//           customerNotes: order.customerNotes,
//           customerIds:
//             order.customers?.map((c) => c.id) ||
//             (order.customerId ? [order.customerId] : []),
//           customers:
//             order.customers ||
//             (order.customer ? [order.customer] : []),
//           couponCode: order.couponCode,
//           cartItems,
//         },
//       },
//     });
//   };

//   const revenue = orders
//     .filter((o) => o.status === 'PAID')
//     .reduce((s, o) => s + parseFloat(o.total || 0), 0);

//   const getOrderTypeDetails = (order) => {
//     let label = 'Takeaway';
//     let Icon = ShoppingBag;

//     if (order.orderType === 'TABLE') {
//       label = order.table?.tableNumber
//         ? `Table ${order.table.tableNumber.toUpperCase()}`
//         : 'Table';
//       Icon = Armchair;
//     } else if (order.orderType === 'ROOM') {
//       label = order.deliveryLocation || 'Room';
//       Icon = Home;
//     } else if (order.orderType === 'DELIVERY') {
//       label = order.deliveryLocation || 'Delivery';
//       Icon = Truck;
//     }

//     return { label, Icon };
//   };

//   return (
//     <div
//       className="h-full flex flex-col overflow-hidden"
//       style={{ background: BG, fontFamily: FONT_B }}
//     >
//       {/* ── Header ── */}
//       <div
//         className="px-5 py-4 shrink-0 flex items-center justify-between"
//         style={{
//           borderBottom: `2px solid ${BORDER}`,
//           background: WHITE,
//         }}
//       >
//         <div>
//           <h2
//             className="font-black text-xl"
//             style={{
//               color: FG,
//               fontFamily: FONT_H,
//             }}
//           >
//             Orders Grid
//           </h2>

//           <p
//             className="text-xs mt-0.5 font-semibold"
//             style={{ color: MUTED }}
//           >
//             {session
//               ? `Session started ${new Date(session.openedAt).toLocaleTimeString(
//                   'en-IN',
//                   { hour: '2-digit', minute: '2-digit' }
//                 )}`
//               : 'No active session'}
//           </p>
//         </div>

//         <button
//           onClick={fetchOrders}
//           className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl transition-all duration-200 border-2"
//           style={{
//             background: WHITE,
//             color: MUTED,
//             borderColor: BORDER,
//             boxShadow: `2px 2px 0px 0px ${BORDER}`,
//           }}
//           onMouseEnter={(e) => {
//             e.currentTarget.style.background = '#F1F5F9';
//             e.currentTarget.style.color = FG;
//           }}
//           onMouseLeave={(e) => {
//             e.currentTarget.style.background = WHITE;
//             e.currentTarget.style.color = MUTED;
//           }}
//         >
//           <RefreshCw
//             size={14}
//             strokeWidth={2.5}
//             className={loading ? 'animate-spin' : ''}
//           />
//           Refresh
//         </button>
//       </div>

//       {/* ── Stats Summary Bar ── */}
//       {!loading && orders.length > 0 && (
//         <div
//           className="px-5 py-3 shrink-0 flex items-center gap-2 flex-wrap"
//           style={{
//             borderBottom: `2px solid ${BORDER}`,
//             background: WHITE,
//           }}
//         >
//           {ORDER_STATUS_GROUPS.map(({ id, title }) => {
//             const count = orders.filter((o) => o.status === id).length;
//             const cfg = STATUS_CONFIG[id];
//             if (!count || !cfg) return null;
//             const Icon = cfg.icon;

//             return (
//               <div
//                 key={id}
//                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2"
//                 style={{
//                   background: cfg.bg,
//                   borderColor: cfg.border,
//                   color: cfg.color,
//                 }}
//               >
//                 <Icon size={12} strokeWidth={2.5} />
//                 {title}: {count}
//               </div>
//             );
//           })}

//           <div
//             className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border-2"
//             style={{
//               background: `${ACCENT}12`,
//               borderColor: `${ACCENT}50`,
//               color: '#6D28D9',
//             }}
//           >
//             <IndianRupee size={12} strokeWidth={2.5} />
//             Revenue: {fmt(revenue)}
//           </div>
//         </div>
//       )}

//       {/* ── Status Grid Container ── */}
//       <div
//         className="flex-1 overflow-y-auto px-5 py-4"
//         style={{ background: BG }}
//       >
//         {loading ? (
//           <TableSkeleton rows={6} />
//         ) : orders.length === 0 ? (
//           <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-4 text-center">
//             <div
//               className="w-20 h-20 rounded-2xl flex items-center justify-center border-2"
//               style={{
//                 background: WHITE,
//                 borderColor: BORDER,
//                 boxShadow: `4px 4px 0px 0px ${BORDER}`,
//               }}
//             >
//               <ClipboardList size={36} style={{ color: BORDER }} />
//             </div>

//             <div>
//               <div
//                 className="font-bold text-base"
//                 style={{
//                   color: MUTED,
//                   fontFamily: FONT_H,
//                 }}
//               >
//                 No orders this session yet
//               </div>

//               <div className="text-sm mt-1" style={{ color: '#CBD5E1' }}>
//                 Go to POS Order and start taking orders!
//               </div>
//             </div>
//           </div>
//         ) : (
//           <div className="space-y-6">
//             {ORDER_STATUS_GROUPS.map((group) => {
//               const groupOrders = orders.filter(
//                 (o) => o.status === group.id
//               );

//               if (groupOrders.length === 0) return null;

//               const cfg = STATUS_CONFIG[group.id] || STATUS_CONFIG.DRAFT;
//               const StatusIcon = cfg.icon;

//               return (
//                 <div key={group.id} className="space-y-3">
//                   {/* Status Section Title */}
//                   <div className="flex items-center gap-2">
//                     <span
//                       className="flex items-center justify-center w-7 h-7 rounded-lg border-2"
//                       style={{
//                         background: cfg.bg,
//                         borderColor: cfg.border,
//                         color: cfg.color,
//                       }}
//                     >
//                       <StatusIcon size={16} strokeWidth={2.5} />
//                     </span>
//                     <h3
//                       className="font-black text-lg"
//                       style={{ color: FG, fontFamily: FONT_H }}
//                     >
//                       {group.title}
//                     </h3>
//                     <span
//                       className="text-xs font-bold px-2 py-0.5 rounded-full border"
//                       style={{
//                         background: WHITE,
//                         borderColor: BORDER,
//                         color: MUTED,
//                       }}
//                     >
//                       {groupOrders.length}
//                     </span>
//                   </div>

//                   {/* Grid of Cards */}
//                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
//                     {groupOrders.map((order) => {
//                       const { label: typeLabel, Icon: TypeIcon } =
//                         getOrderTypeDetails(order);
//                       const isEditable =
//                         order.status !== 'CANCELLED' && order.status !== 'PAID';

//                       {/* Expanded Waiter / Creator Name resolution logic */}
//                       const waiterName =
//                         order.waiter?.name ||
//                         order.createdBy?.name ||
//                         order.user?.name ||
//                         order.waiterName ||
//                         order.createdByName ||
//                         'Staff';

//                       return (
//                         <div
//                           key={order.id}
//                           onClick={() => {
//                             if (isEditable) handleEditOrder(order);
//                           }}
//                           className={`rounded-2xl flex flex-col justify-between overflow-hidden transition-all duration-200 border-2 ${
//                             isEditable
//                               ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lg'
//                               : ''
//                           }`}
//                           style={{
//                             background: WHITE,
//                             borderColor: BORDER,
//                             boxShadow: `4px 4px 0px 0px ${BORDER}`,
//                           }}
//                         >
//                           {/* Card Header */}
//                           <div
//                             className="p-3 border-b-2 flex items-center justify-between"
//                             style={{
//                               borderColor: BORDER,
//                               borderTop: `4px solid ${cfg.accent}`,
//                             }}
//                           >
//                             <div className="flex items-center gap-2">
//                               <span
//                                 className="font-black font-mono text-sm"
//                                 style={{ color: ACCENT }}
//                               >
//                                 {order.orderNumber}
//                               </span>
//                             </div>

//                             <span
//                               className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg border-2"
//                               style={{
//                                 background: cfg.bg,
//                                 borderColor: cfg.border,
//                                 color: cfg.color,
//                               }}
//                             >
//                               <StatusIcon size={12} strokeWidth={2.5} />
//                               {cfg.label}
//                             </span>
//                           </div>

//                           {/* Card Body */}
//                           <div className="p-3 flex-1 space-y-3">
//                             {/* Order Type + Time */}
//                             <div className="flex items-center justify-between text-xs font-semibold">
//                               <div
//                                 className="flex items-center gap-1 truncate"
//                                 style={{ color: MUTED }}
//                               >
//                                 <TypeIcon size={14} strokeWidth={2.5} />
//                                 <span className="truncate">{typeLabel}</span>
//                               </div>

//                               <div
//                                 className="flex items-center gap-1"
//                                 style={{ color: MUTED }}
//                               >
//                                 <Clock size={12} strokeWidth={2} />
//                                 {new Date(
//                                   order.createdAt
//                                 ).toLocaleTimeString('en-IN', {
//                                   hour: '2-digit',
//                                   minute: '2-digit',
//                                 })}
//                               </div>
//                             </div>

//                             {/* Waiter / User Badge */}
//                             <div
//                               className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold w-fit"
//                               style={{
//                                 background: '#F8FAFC',
//                                 borderColor: BORDER,
//                                 color: FG,
//                               }}
//                             >
//                               <UserCheck size={13} style={{ color: ACCENT }} strokeWidth={2.5} />
//                               <span>{waiterName}</span>
//                             </div>

//                             {/* Customer Details for Delivery */}
//                             {order.orderType === 'DELIVERY' && (
//                               <div
//                                 className="p-2 rounded-xl border text-xs space-y-1"
//                                 style={{
//                                   background: BG,
//                                   borderColor: BORDER,
//                                 }}
//                               >
//                                 {order.customerNameSnapshot && (
//                                   <div className="flex items-center gap-1.5 font-bold" style={{ color: FG }}>
//                                     <User size={12} strokeWidth={2.5} />
//                                     {order.customerNameSnapshot}
//                                   </div>
//                                 )}
//                                 {order.customerPhoneSnapshot && (
//                                   <div className="flex items-center gap-1.5" style={{ color: MUTED }}>
//                                     <Phone size={12} strokeWidth={2.5} />
//                                     {order.customerPhoneSnapshot}
//                                   </div>
//                                 )}
//                                 {order.deliveryLocation && (
//                                   <div className="flex items-center gap-1.5" style={{ color: MUTED }}>
//                                     <MapPin size={12} strokeWidth={2.5} />
//                                     {order.deliveryLocation}
//                                   </div>
//                                 )}
//                               </div>
//                             )}

//                             {/* Items List */}
//                             <div className="space-y-1 border-t pt-2" style={{ borderColor: BORDER }}>
//                               <div className="text-xs font-bold text-slate-400">
//                                 {order.lines?.length || 0} item
//                                 {order.lines?.length !== 1 ? 's' : ''}
//                               </div>
//                               <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
//                                 {order.lines?.map((line) => (
//                                   <div
//                                     key={line.id}
//                                     className="flex items-center justify-between text-xs"
//                                   >
//                                     <span
//                                       className="font-medium truncate pr-2"
//                                       style={{ color: FG }}
//                                     >
//                                       {line.quantity}x {line.product?.name}
//                                     </span>
//                                     <span
//                                       className="font-semibold shrink-0"
//                                       style={{ color: MUTED }}
//                                     >
//                                       {fmt(line.lineTotal)}
//                                     </span>
//                                   </div>
//                                 ))}
//                               </div>
//                             </div>
//                           </div>

//                           {/* Card Footer */}
//                           <div
//                             className="p-3 border-t-2 flex items-center justify-between mt-auto"
//                             style={{
//                               borderColor: BORDER,
//                               background: '#FAFAFA',
//                             }}
//                           >
//                             <div>
//                               <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
//                                 Total
//                               </div>
//                               <div className="font-black text-sm" style={{ color: ACCENT }}>
//                                 {fmt(order.total)}
//                               </div>
//                             </div>

//                             {/* Action Buttons */}
//                             <div className="flex items-center gap-1.5">
//                               {isEditable && (
//                                 <>
//                                   <div
//                                     className="p-1.5 rounded-lg border-2 transition-colors flex items-center justify-center"
//                                     style={{
//                                       background: WHITE,
//                                       borderColor: BORDER,
//                                       color: FG,
//                                     }}
//                                     title="Click card to edit order"
//                                   >
//                                     <Edit3 size={14} strokeWidth={2.5} />
//                                   </div>

//                                   <button
//                                     onClick={(e) => {
//                                       e.stopPropagation(); // Prevent opening order on cancel
//                                       setCancelTarget(order.id);
//                                     }}
//                                     className="p-1.5 rounded-lg border-2 transition-colors text-red-500 hover:bg-red-50"
//                                     style={{
//                                       background: WHITE,
//                                       borderColor: '#FECACA',
//                                     }}
//                                     title="Cancel Order"
//                                   >
//                                     <Trash2 size={14} strokeWidth={2.5} />
//                                   </button>
//                                 </>
//                               )}
//                             </div>
//                           </div>
//                         </div>
//                       );
//                     })}
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </div>

//       {/* Confirmation Dialog for Cancellation */}
//       <ConfirmDialog
//         isOpen={!!cancelTarget}
//         title="Cancel Order"
//         message="Are you sure you want to cancel this order? This action cannot be undone."
//         confirmText="Cancel Order"
//         loading={cancelLoading}
//         onConfirm={handleCancel}
//         onClose={() => setCancelTarget(null)}
//       />
//     </div>
//   );
// }


import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/ui/StatusBadge';
import { TableSkeleton } from '../../components/ui/SkeletonLoader';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import {
  Armchair,
  ShoppingBag,
  ClipboardList,
  Ticket,
  CheckCircle2,
  Edit3,
  Trash2,
  RefreshCw,
  ChevronDown,
  IndianRupee,
  ShoppingCart,
  ChefHat,
  XCircle,
  BellRing,
  Truck,
  Home,
  MapPin,
  Phone,
  User,
  Clock,
  UserCheck,
  Printer,
} from 'lucide-react';

const BG      = '#FFFDF5';
const WHITE   = '#FFFFFF';
const FG      = '#1E293B';
const MUTED   = '#64748B';
const BORDER  = '#E2E8F0';
const ACCENT  = '#8B5CF6';
const AMBER   = '#FBBF24';
const EMERALD = '#34D399';
const PINK    = '#F472B6';
const FONT_H  = "'Outfit', system-ui, sans-serif";
const FONT_B  = "'Plus Jakarta Sans', system-ui, sans-serif";

const fmt = (n) =>
  `ETB ${Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const STATUS_CONFIG = {
  READY: {
    color: '#7C3AED',
    bg: '#EDE9FE',
    border: '#C4B5FD',
    label: 'Kitchen Ready',
    accent: '#8B5CF6',
    icon: BellRing,
  },
  SENT_TO_KITCHEN: {
    color: '#2563EB',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    label: 'In Kitchen',
    accent: '#60A5FA',
    icon: ChefHat,
  },
  PAID: {
    color: '#059669',
    bg: `${EMERALD}20`,
    border: `${EMERALD}60`,
    label: 'Paid',
    accent: EMERALD,
    icon: CheckCircle2,
  },
  DRAFT: {
    color: MUTED,
    bg: '#F8FAFC',
    border: BORDER,
    label: 'Draft',
    accent: MUTED,
    icon: ShoppingCart,
  },
  CANCELLED: {
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FECACA',
    label: 'Cancelled',
    accent: '#F87171',
    icon: XCircle,
  },
};

const ORDER_STATUS_GROUPS = [
  { id: 'READY', title: 'Kitchen Ready' },
  { id: 'SENT_TO_KITCHEN', title: 'In Kitchen' },
  { id: 'DRAFT', title: 'Draft / In Progress' },
  { id: 'PAID', title: 'Paid' },
  { id: 'CANCELLED', title: 'Cancelled' },
];

export default function OrdersList({ session }) {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchOrders = async () => {
    if (!session?.id) return;

    try {
      setLoading(true);
      const data = await api.get(`/orders?sessionId=${session.id}`);
      setOrders(data || []);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [session?.id]);

  const handleCancel = async () => {
    if (!cancelTarget) return;

    setCancelLoading(true);

    try {
      await api.put(`/orders/${cancelTarget}/cancel`);
      toast.success('Order cancelled');
      fetchOrders();
    } catch {
      toast.error('Failed to cancel order');
    } finally {
      setCancelLoading(false);
      setCancelTarget(null);
    }
  };

  const handlePrint = (order) => {
    const o = order;
    const lines = (o.lines || [])
      .map(l => {
        const rate = parseFloat(l.product?.tax || 0);
        const lineTax = parseFloat(l.lineTotal || 0) * (rate / 100);
        const taxText = rate > 0 ? `<br/><span style="font-size:10px;color:#555">${rate}% Tax: ETB ${lineTax.toFixed(2)}</span>` : '';
        return `<tr><td>${l.product?.name || 'Item'} &times; ${l.quantity}${taxText}</td><td class="amt">ETB ${Number(l.lineTotal || 0).toFixed(2)}</td></tr>`;
      })
      .join('');
    
    const discount = parseFloat(o.discountAmount || 0);
    const paymentRows = (o.payments || [])
      .map(p => `<tr><td style="font-size:11px;color:#555">Paid via ${p.paymentMethod} ${p.paymentReference ? `(${p.paymentReference})` : ''}</td><td class="amt" style="font-size:11px;color:#555">ETB ${Number(p.amount).toFixed(2)}</td></tr>`)
      .join('');
    
    const customerNames = o.customerNameSnapshot || o.customers?.map(c => c.name).join(', ') || o.customer?.name || '';

    // Calculate tax breakdown
    const taxBreakdown = {};
    (o.lines || []).forEach(l => {
      const rate = parseFloat(l.product?.tax || 0);
      const lineTotal = parseFloat(l.lineTotal || 0);
      if (!taxBreakdown[rate]) taxBreakdown[rate] = 0;
      taxBreakdown[rate] += lineTotal * (rate / 100);
    });
    const totalPreTax = Object.values(taxBreakdown).reduce((s, v) => s + v, 0);
    const actualTax = parseFloat(o.taxAmount || 0);
    const scale = totalPreTax > 0 ? (actualTax / totalPreTax) : 0;

    const taxHtmlLines = Object.keys(taxBreakdown).sort((a, b) => parseFloat(a) - parseFloat(b)).map(rateStr => {
      const rate = parseFloat(rateStr);
      const amt = taxBreakdown[rateStr] * scale;
      return `<div class="row"><span>Tax (${rate}%)</span><span>ETB ${amt.toFixed(2)}</span></div>`;
    }).join('');

    const isPaid = o.status === 'PAID';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt ${o.orderNumber}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;font-size:13px;color:#000;background:#fff;width:300px;padding:16px}
  h1{text-align:center;font-size:18px;font-weight:bold;margin-bottom:4px}
  .center{text-align:center;font-size:11px;color:#555;margin-bottom:12px}
  .row{display:flex;justify-content:space-between;margin:3px 0;font-size:12px}
  .divider{border-top:1px dashed #999;margin:8px 0}
  table{width:100%;border-collapse:collapse;margin:6px 0}
  td{padding:3px 0;font-size:12px}
  td.amt{text-align:right;white-space:nowrap}
  .total-row{display:flex;justify-content:space-between;font-weight:bold;font-size:15px;margin-top:6px;border-top:2px solid #000;padding-top:6px}
  .footer{text-align:center;font-size:11px;color:#555;margin-top:12px}
  @media print{@page{size:80mm auto;margin:0}body{width:80mm;padding:8px}}
</style></head><body>
  <h1> Safina Cafe & Bakery</h1>
  <div class="center">Thank you for your visit!</div>
  <div class="row"><span>Order #</span><span>${o.orderNumber}</span></div>
  <div class="row"><span>Type</span><span>${o.orderType || (o.table ? 'TABLE' : 'PICKUP')}</span></div>
  <div class="row"><span>Payment Status</span><span style="font-weight:bold;">${isPaid ? 'PAID' : 'UNPAID'}</span></div>
  ${o.table?.tableNumber ? `<div class="row"><span>Table</span><span>${o.table.tableNumber}</span></div>` : ''}
  ${o.deliveryLocation ? `<div class="row"><span>Location</span><span>${o.deliveryLocation}</span></div>` : ''}
  ${customerNames ? `<div class="row"><span>Customer(s)</span><span>${customerNames}</span></div>` : ''}
  <div class="row"><span>Date</span><span>${new Date(o.createdAt).toLocaleString('en-IN')}</span></div>
  <div class="divider"></div>
  <table>${lines}</table>
  <div class="divider"></div>
  <div class="row"><span>Subtotal</span><span>ETB ${Number(o.subtotal||0).toFixed(2)}</span></div>
  ${discount > 0 ? `<div class="row"><span>Discount</span><span>-ETB ${discount.toFixed(2)}</span></div>` : ''}
  ${taxHtmlLines}
  <div class="total-row"><span>TOTAL</span><span>ETB ${Number(o.total||0).toFixed(2)}</span></div>
  ${paymentRows ? `<table>${paymentRows}</table>` : ''}
  <div class="footer"> <span>see our website: wwww.safinacafe.com</span></div>
</body></html>`;

    const old = document.getElementById('__receipt_frame__');
    if (old) old.remove();
    const iframe = document.createElement('iframe');
    iframe.id = '__receipt_frame__';
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => iframe.remove(), 3000);
    }, 500);
  };

  const handleEditOrder = (order) => {
    const cartItems =
      order.lines?.map((line) => ({
        productId: line.productId,
        name: line.product?.name,
        unitPrice: parseFloat(line.unitPrice),
        price: parseFloat(line.unitPrice),
        quantity: line.quantity,
        lineTotal: parseFloat(line.lineTotal),
        categoryColor: line.product?.category?.color || ACCENT,
        color: line.product?.category?.color || ACCENT,
        tax: parseFloat(line.product?.tax || 0),
      })) || [];

    navigate('/pos', {
      state: {
        loadOrder: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          orderType: order.orderType,
          tableId: order.tableId,
          table: order.table,
          deliveryLocation: order.deliveryLocation,
          customerNameSnapshot: order.customerNameSnapshot,
          customerPhoneSnapshot: order.customerPhoneSnapshot,
          customerNotes: order.customerNotes,
          customerIds:
            order.customers?.map((c) => c.id) ||
            (order.customerId ? [order.customerId] : []),
          customers:
            order.customers ||
            (order.customer ? [order.customer] : []),
          couponCode: order.couponCode,
          cartItems,
        },
      },
    });
  };

  const revenue = orders
    .filter((o) => o.status === 'PAID')
    .reduce((s, o) => s + parseFloat(o.total || 0), 0);

  const getOrderTypeDetails = (order) => {
    let label = 'Takeaway';
    let Icon = ShoppingBag;

    if (order.orderType === 'TABLE') {
      label = order.table?.tableNumber
        ? `Table ${order.table.tableNumber.toUpperCase()}`
        : 'Table';
      Icon = Armchair;
    } else if (order.orderType === 'ROOM') {
      label = order.deliveryLocation || 'Room';
      Icon = Home;
    } else if (order.orderType === 'DELIVERY') {
      label = order.deliveryLocation || 'Delivery';
      Icon = Truck;
    }

    return { label, Icon };
  };

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ background: BG, fontFamily: FONT_B }}
    >
      {/* ── Header ── */}
      <div
        className="px-5 py-4 shrink-0 flex items-center justify-between"
        style={{
          borderBottom: `2px solid ${BORDER}`,
          background: WHITE,
        }}
      >
        <div>
          <h2
            className="font-black text-xl"
            style={{
              color: FG,
              fontFamily: FONT_H,
            }}
          >
            Orders Grid
          </h2>

          <p
            className="text-xs mt-0.5 font-semibold"
            style={{ color: MUTED }}
          >
            {session
              ? `Session started ${new Date(session.openedAt).toLocaleTimeString(
                  'en-IN',
                  { hour: '2-digit', minute: '2-digit' }
                )}`
              : 'No active session'}
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl transition-all duration-200 border-2"
          style={{
            background: WHITE,
            color: MUTED,
            borderColor: BORDER,
            boxShadow: `2px 2px 0px 0px ${BORDER}`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#F1F5F9';
            e.currentTarget.style.color = FG;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = WHITE;
            e.currentTarget.style.color = MUTED;
          }}
        >
          <RefreshCw
            size={14}
            strokeWidth={2.5}
            className={loading ? 'animate-spin' : ''}
          />
          Refresh
        </button>
      </div>

      {/* ── Stats Summary Bar ── */}
      {!loading && orders.length > 0 && (
        <div
          className="px-5 py-3 shrink-0 flex items-center gap-2 flex-wrap"
          style={{
            borderBottom: `2px solid ${BORDER}`,
            background: WHITE,
          }}
        >
          {ORDER_STATUS_GROUPS.map(({ id, title }) => {
            const count = orders.filter((o) => o.status === id).length;
            const cfg = STATUS_CONFIG[id];
            if (!count || !cfg) return null;
            const Icon = cfg.icon;

            return (
              <div
                key={id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2"
                style={{
                  background: cfg.bg,
                  borderColor: cfg.border,
                  color: cfg.color,
                }}
              >
                <Icon size={12} strokeWidth={2.5} />
                {title}: {count}
              </div>
            );
          })}

          <div
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border-2"
            style={{
              background: `${ACCENT}12`,
              borderColor: `${ACCENT}50`,
              color: '#6D28D9',
            }}
          >
            <IndianRupee size={12} strokeWidth={2.5} />
            Revenue: {fmt(revenue)}
          </div>
        </div>
      )}

      {/* ── Status Grid Container ── */}
      <div
        className="flex-1 overflow-y-auto px-5 py-4"
        style={{ background: BG }}
      >
        {loading ? (
          <TableSkeleton rows={6} />
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-4 text-center">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center border-2"
              style={{
                background: WHITE,
                borderColor: BORDER,
                boxShadow: `4px 4px 0px 0px ${BORDER}`,
              }}
            >
              <ClipboardList size={36} style={{ color: BORDER }} />
            </div>

            <div>
              <div
                className="font-bold text-base"
                style={{
                  color: MUTED,
                  fontFamily: FONT_H,
                }}
              >
                No orders this session yet
              </div>

              <div className="text-sm mt-1" style={{ color: '#CBD5E1' }}>
                Go to POS Order and start taking orders!
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {ORDER_STATUS_GROUPS.map((group) => {
              const groupOrders = orders.filter(
                (o) => o.status === group.id
              );

              if (groupOrders.length === 0) return null;

              const cfg = STATUS_CONFIG[group.id] || STATUS_CONFIG.DRAFT;
              const StatusIcon = cfg.icon;

              return (
                <div key={group.id} className="space-y-3">
                  {/* Status Section Title */}
                  <div className="flex items-center gap-2">
                    <span
                      className="flex items-center justify-center w-7 h-7 rounded-lg border-2"
                      style={{
                        background: cfg.bg,
                        borderColor: cfg.border,
                        color: cfg.color,
                      }}
                    >
                      <StatusIcon size={16} strokeWidth={2.5} />
                    </span>
                    <h3
                      className="font-black text-lg"
                      style={{ color: FG, fontFamily: FONT_H }}
                    >
                      {group.title}
                    </h3>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full border"
                      style={{
                        background: WHITE,
                        borderColor: BORDER,
                        color: MUTED,
                      }}
                    >
                      {groupOrders.length}
                    </span>
                  </div>

                  {/* Grid of Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {groupOrders.map((order) => {
                      const { label: typeLabel, Icon: TypeIcon } =
                        getOrderTypeDetails(order);
                      const isEditable =
                        order.status !== 'CANCELLED' && order.status !== 'PAID';

                      const isPaid = order.status === 'PAID';

                      const waiterName =
                        order.waiter?.name ||
                        order.createdBy?.name ||
                        order.user?.name ||
                        order.waiterName ||
                        order.createdByName ||
                        'Staff';

                      return (
                        <div
                          key={order.id}
                          onClick={() => {
                            if (isEditable) handleEditOrder(order);
                          }}
                          className={`rounded-2xl flex flex-col justify-between overflow-hidden transition-all duration-200 border-2 ${
                            isEditable
                              ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lg'
                              : ''
                          }`}
                          style={{
                            background: WHITE,
                            borderColor: BORDER,
                            boxShadow: `4px 4px 0px 0px ${BORDER}`,
                          }}
                        >
                          {/* Card Header */}
                          <div
                            className="p-3 border-b-2 flex items-center justify-between"
                            style={{
                              borderColor: BORDER,
                              borderTop: `4px solid ${cfg.accent}`,
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="font-black font-mono text-sm"
                                style={{ color: ACCENT }}
                              >
                                {order.orderNumber}
                              </span>
                            </div>

                            {/* Paid / Unpaid Status Indicator */}
                            <span
                              className="text-xs font-black px-2 py-0.5 rounded-md border"
                              style={{
                                background: isPaid ? '#DCFCE7' : '#FEF3C7',
                                borderColor: isPaid ? '#86EFAC' : '#FDE68A',
                                color: isPaid ? '#15803D' : '#B45309',
                              }}
                            >
                              {isPaid ? 'PAID' : 'UNPAID'}
                            </span>
                          </div>

                          {/* Card Body */}
                          <div className="p-3 flex-1 space-y-3">
                            {/* Order Type + Time */}
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <div
                                className="flex items-center gap-1 truncate"
                                style={{ color: MUTED }}
                              >
                                <TypeIcon size={14} strokeWidth={2.5} />
                                <span className="truncate">{typeLabel}</span>
                              </div>

                              <div
                                className="flex items-center gap-1"
                                style={{ color: MUTED }}
                              >
                                <Clock size={12} strokeWidth={2} />
                                {new Date(
                                  order.createdAt
                                ).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>

                            {/* Waiter / User Badge */}
                            <div
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold w-fit"
                              style={{
                                background: '#F8FAFC',
                                borderColor: BORDER,
                                color: FG,
                              }}
                            >
                              <UserCheck size={13} style={{ color: ACCENT }} strokeWidth={2.5} />
                              <span>{waiterName}</span>
                            </div>

                            {/* Customer Details for Delivery */}
                            {order.orderType === 'DELIVERY' && (
                              <div
                                className="p-2 rounded-xl border text-xs space-y-1"
                                style={{
                                  background: BG,
                                  borderColor: BORDER,
                                }}
                              >
                                {order.customerNameSnapshot && (
                                  <div className="flex items-center gap-1.5 font-bold" style={{ color: FG }}>
                                    <User size={12} strokeWidth={2.5} />
                                    {order.customerNameSnapshot}
                                  </div>
                                )}
                                {order.customerPhoneSnapshot && (
                                  <div className="flex items-center gap-1.5" style={{ color: MUTED }}>
                                    <Phone size={12} strokeWidth={2.5} />
                                    {order.customerPhoneSnapshot}
                                  </div>
                                )}
                                {order.deliveryLocation && (
                                  <div className="flex items-center gap-1.5" style={{ color: MUTED }}>
                                    <MapPin size={12} strokeWidth={2.5} />
                                    {order.deliveryLocation}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Items List */}
                            <div className="space-y-1 border-t pt-2" style={{ borderColor: BORDER }}>
                              <div className="text-xs font-bold text-slate-400">
                                {order.lines?.length || 0} item
                                {order.lines?.length !== 1 ? 's' : ''}
                              </div>
                              <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                                {order.lines?.map((line) => (
                                  <div
                                    key={line.id}
                                    className="flex items-center justify-between text-xs"
                                  >
                                    <span
                                      className="font-medium truncate pr-2"
                                      style={{ color: FG }}
                                    >
                                      {line.quantity}x {line.product?.name}
                                    </span>
                                    <span
                                      className="font-semibold shrink-0"
                                      style={{ color: MUTED }}
                                    >
                                      {fmt(line.lineTotal)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Card Footer */}
                          <div
                            className="p-3 border-t-2 flex items-center justify-between mt-auto"
                            style={{
                              borderColor: BORDER,
                              background: '#FAFAFA',
                            }}
                          >
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
                                Total
                              </div>
                              <div className="font-black text-sm" style={{ color: ACCENT }}>
                                {fmt(order.total)}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1.5">
                              {/* Direct Thermal Print Receipt Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrint(order);
                                }}
                                className="p-1.5 rounded-lg border-2 transition-colors text-slate-600 hover:bg-slate-100"
                                style={{
                                  background: WHITE,
                                  borderColor: BORDER,
                                }}
                                title="Print Receipt"
                              >
                                <Printer size={14} strokeWidth={2.5} />
                              </button>

                              {isEditable && (
                                <>
                                  <div
                                    className="p-1.5 rounded-lg border-2 transition-colors flex items-center justify-center"
                                    style={{
                                      background: WHITE,
                                      borderColor: BORDER,
                                      color: FG,
                                    }}
                                    title="Click card to edit order"
                                  >
                                    <Edit3 size={14} strokeWidth={2.5} />
                                  </div>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCancelTarget(order.id);
                                    }}
                                    className="p-1.5 rounded-lg border-2 transition-colors text-red-500 hover:bg-red-50"
                                    style={{
                                      background: WHITE,
                                      borderColor: '#FECACA',
                                    }}
                                    title="Cancel Order"
                                  >
                                    <Trash2 size={14} strokeWidth={2.5} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Dialog for Cancellation */}
      <ConfirmDialog
        isOpen={!!cancelTarget}
        title="Cancel Order"
        message="Are you sure you want to cancel this order? This action cannot be undone."
        confirmText="Cancel Order"
        loading={cancelLoading}
        onConfirm={handleCancel}
        onClose={() => setCancelTarget(null)}
      />
    </div>
  );
}