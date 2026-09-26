// import { useEffect, useState } from 'react';
// import { QRCodeSVG } from 'qrcode.react';
// import api from '../../api/client';
// import toast from 'react-hot-toast';
// import { Banknote, CreditCard, Smartphone, Check, Settings, AlertTriangle } from 'lucide-react';

// const METHOD_META = {
//   CASH: { icon: Banknote, color: 'text-[#34D399]', label: 'Cash', desc: 'Accept physical cash payments' },
//   CARD: { icon: CreditCard, color: 'text-[#8B5CF6]', label: 'Card / Digital', desc: 'Accept debit, credit & contactless payments' },
//   UPI: { icon: Smartphone, color: 'text-[#F472B6]', label: 'UPI', desc: 'Accept UPI payments via QR code or ID' },
// };

// function Toggle({ checked, onChange }) {
//   return (
//     <button
//       type="button"
//       onClick={onChange}
//       className={`w-12 h-7 rounded-full border-2 border-slate-800 transition-colors relative ${checked ? 'bg-[#34D399]' : 'bg-slate-200'}`}
//     >
//       <span className={`absolute top-0.5 w-5 h-5 bg-white border-2 border-slate-800 rounded-full shadow transition-all ${checked ? 'left-[calc(100%-1.375rem)]' : 'left-0.5'}`} />
//     </button>
//   );
// }

// export default function PaymentMethods() {
//   const [methods, setMethods] = useState([]);
//   const [forms, setForms] = useState({});
//   const [saving, setSaving] = useState({});
//   const [loading, setLoading] = useState(true);

//   const load = async () => {
//     try {
//       const data = await api.get('/payment-methods');
//       setMethods(data);
//       const f = {};
//       data.forEach(m => { f[m.id] = { isEnabled: m.isEnabled, upiId: m.upiId || '' }; });
//       setForms(f);
//     } finally { setLoading(false); }
//   };

//   useEffect(() => { load(); }, []);

//   const handleSave = async (method) => {
//     setSaving(s => ({ ...s, [method.id]: true }));
//     try {
//       await api.put(`/payment-methods/${method.id}`, forms[method.id]);
//       toast.success(`${METHOD_META[method.name]?.label} settings saved`);
//       load();
//     } catch { toast.error('Failed to save'); }
//     finally { setSaving(s => ({ ...s, [method.id]: false })); }
//   };

//   const update = (id, key, val) => setForms(f => ({ ...f, [id]: { ...f[id], [key]: val } }));

//   if (loading) return <div className="flex items-center justify-center h-64 text-slate-500 font-semibold">Loading...</div>;

//   return (
//     <div>
//       <div className="mb-6 flex items-center gap-2">
//         <CreditCard size={24} className="text-[#34D399]" />
//         <div>
//           <h1 className="text-2xl font-black text-slate-800 font-outfit leading-none">Payment Methods</h1>
//           <p className="text-slate-500 text-sm mt-1.5 font-medium">Configure accepted payment methods for your POS terminal</p>
//         </div>
//       </div>

//       <div className="grid gap-6">
//         {methods.map(method => {
//           const meta = METHOD_META[method.name] || {};
//           const form = forms[method.id] || {};
//           const MetaIcon = meta.icon;
//           return (
//             <div
//               key={method.id}
//               className={`bg-white border-2 rounded-2xl p-6 shadow-pop transition-all ${
//                 form.isEnabled ? 'border-slate-800' : 'border-slate-300 opacity-80'
//               }`}
//             >
//               <div className="flex items-start justify-between mb-4">
//                 <div className="flex items-center gap-4">
//                   <div className={`w-14 h-14 flex items-center justify-center bg-slate-50 border-2 border-slate-800 rounded-xl shadow-pop-sm shrink-0 ${meta.color}`}>
//                     {MetaIcon && <MetaIcon size={24} strokeWidth={2.5} />}
//                   </div>
//                   <div>
//                     <h3 className="text-slate-800 font-bold font-outfit text-lg">{meta.label}</h3>
//                     <p className="text-slate-500 text-sm font-medium">{meta.desc}</p>
//                   </div>
//                 </div>
//                 <div className="flex items-center gap-3">
//                   <span className="text-xs font-bold text-slate-500 uppercase">{form.isEnabled ? 'Enabled' : 'Disabled'}</span>
//                   <Toggle checked={form.isEnabled} onChange={() => update(method.id, 'isEnabled', !form.isEnabled)} />
//                 </div>
//               </div>

//               {method.name === 'UPI' && form.isEnabled && (
//                 <div className="border-t-2 border-slate-100 pt-4 mt-2 grid grid-cols-1 md:grid-cols-2 gap-6">
//                   <div>
//                     <label className="block text-sm font-bold text-slate-700 mb-2">UPI ID</label>
//                     <input
//                       value={form.upiId}
//                       onChange={e => update(method.id, 'upiId', e.target.value)}
//                       placeholder="yourname@ybl"
//                       className="w-full bg-white border-2 border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#34D399] font-semibold transition"
//                     />
//                     <p className="text-xs text-slate-500 mt-1.5 font-medium flex items-center gap-1.5">
//                       <Settings size={12} className="text-slate-400" />
//                       <span>Customers can use this ID to pay directly</span>
//                     </p>
//                   </div>
//                   {form.upiId ? (
//                     <div className="flex flex-col items-center gap-2">
//                       <div className="bg-white p-3 rounded-xl border-2 border-slate-800 shadow-pop-sm">
//                         <QRCodeSVG value={`upi://pay?pa=${form.upiId}&pn=Cafe+POS`} size={120} />
//                       </div>
//                       <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Live QR Preview</p>
//                     </div>
//                   ) : (
//                     <div className="flex items-center gap-2 text-amber-500 bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl text-xs h-fit self-center">
//                       <AlertTriangle size={16} />
//                       <span>Enter UPI ID to generate live checkout QR code</span>
//                     </div>
//                   )}
//                 </div>
//               )}

//               <div className="flex justify-end mt-4">
//                 <button
//                   onClick={() => handleSave(method)}
//                   disabled={saving[method.id]}
//                   className="bg-[#34D399] hover:bg-[#28b380] text-slate-900 border-2 border-slate-800 px-5 py-2.5 rounded-xl text-sm font-bold shadow-pop-sm hover:translate-y-[-2px] active:translate-y-[2px] transition-all disabled:opacity-50 flex items-center gap-1.5"
//                 >
//                   <Check size={16} strokeWidth={2.5} />
//                   <span>{saving[method.id] ? 'Saving...' : 'Save Settings'}</span>
//                 </button>
//               </div>
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }



import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import {
  Banknote,
  CreditCard,
  Smartphone,
  Check,
  Settings,
  AlertTriangle,
  Plus,
  X,
  Landmark,
  Wallet,
} from 'lucide-react';

const METHOD_META = {
  CASH: {
    icon: Banknote,
    color: 'text-[#34D399]',
    label: 'Cash',
    desc: 'Accept physical cash payments',
  },

  CARD: {
    icon: CreditCard,
    color: 'text-[#8B5CF6]',
    label: 'Card / Digital',
    desc: 'Accept debit, credit & contactless payments',
  },

  UPI: {
    icon: Smartphone,
    color: 'text-[#F472B6]',
    label: 'UPI',
    desc: 'Accept UPI payments via QR code or ID',
  },

  TELEBIRR: {
    icon: Smartphone,
    color: 'text-[#F59E0B]',
    label: 'Telebirr',
    desc: 'Accept payments through Telebirr',
  },

  CBE_BIRR: {
    icon: Smartphone,
    color: 'text-[#3B82F6]',
    label: 'CBE Birr',
    desc: 'Accept payments through CBE Birr',
  },

  BANK_TRANSFER: {
    icon: Landmark,
    color: 'text-[#6366F1]',
    label: 'Bank Transfer',
    desc: 'Accept direct bank transfer payments',
  },
};

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`w-12 h-7 rounded-full border-2 border-slate-800 transition-colors relative ${
        checked ? 'bg-[#34D399]' : 'bg-slate-200'
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white border-2 border-slate-800 rounded-full shadow transition-all ${
          checked
            ? 'left-[calc(100%-1.375rem)]'
            : 'left-0.5'
        }`}
      />
    </button>
  );
}

function getMethodMeta(name) {
  const key = String(name || '').toUpperCase();

  if (METHOD_META[key]) {
    return METHOD_META[key];
  }

  return {
    icon: Wallet,
    color: 'text-slate-500',
    label: name || 'Payment Method',
    desc: 'Custom payment method',
  };
}

export default function PaymentMethods() {
  const [methods, setMethods] = useState([]);
  const [forms, setForms] = useState({});
  const [saving, setSaving] = useState({});
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);

  const [newMethod, setNewMethod] = useState({
    name: '',
    isEnabled: true,
    upiId: '',
  });

  const load = async () => {
    try {
      setLoading(true);

      const data = await api.get('/payment-methods');

      setMethods(Array.isArray(data) ? data : []);

      const nextForms = {};

      (Array.isArray(data) ? data : []).forEach(method => {
        nextForms[method.id] = {
          isEnabled: Boolean(method.isEnabled),
          upiId: method.upiId || '',
        };
      });

      setForms(nextForms);
    } catch (error) {
      console.error('Failed to load payment methods:', error);

      toast.error(
        error?.response?.data?.error ||
          'Failed to load payment methods'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const update = (id, key, value) => {
    setForms(current => ({
      ...current,
      [id]: {
        ...current[id],
        [key]: value,
      },
    }));
  };

  const handleSave = async method => {
    setSaving(current => ({
      ...current,
      [method.id]: true,
    }));

    try {
      const form = forms[method.id] || {};

      await api.put(`/payment-methods/${method.id}`, {
        isEnabled: Boolean(form.isEnabled),
        upiId:
          method.name === 'UPI'
            ? form.upiId?.trim() || null
            : null,
      });

      const meta = getMethodMeta(method.name);

      toast.success(`${meta.label} settings saved`);

      await load();
    } catch (error) {
      console.error('Failed to save payment method:', error);

      toast.error(
        error?.response?.data?.error ||
          'Failed to save payment method'
      );
    } finally {
      setSaving(current => ({
        ...current,
        [method.id]: false,
      }));
    }
  };

  const handleAddMethod = async event => {
    event.preventDefault();

    const name = newMethod.name.trim();

    if (!name) {
      toast.error('Enter a payment method name');
      return;
    }

    if (name.length > 50) {
      toast.error('Payment method name must be 50 characters or less');
      return;
    }

    setAdding(true);

    try {
      await api.post('/payment-methods', {
        name,
        isEnabled: Boolean(newMethod.isEnabled),
        upiId:
          name.toUpperCase() === 'UPI'
            ? newMethod.upiId.trim() || null
            : null,
      });

      toast.success(`${name} added successfully`);

      setNewMethod({
        name: '',
        isEnabled: true,
        upiId: '',
      });

      setShowAddModal(false);

      await load();
    } catch (error) {
      console.error('Failed to add payment method:', error);

      toast.error(
        error?.response?.data?.error ||
          'Failed to add payment method'
      );
    } finally {
      setAdding(false);
    }
  };

  const closeAddModal = () => {
    if (adding) return;

    setShowAddModal(false);

    setNewMethod({
      name: '',
      isEnabled: true,
      upiId: '',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 font-semibold">
        Loading...
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <CreditCard
            size={24}
            className="text-[#34D399]"
          />

          <div>
            <h1 className="text-2xl font-black text-slate-800 font-outfit leading-none">
              Payment Methods
            </h1>

            <p className="text-slate-500 text-sm mt-1.5 font-medium">
              Configure accepted payment methods for your POS terminal
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="bg-[#34D399] hover:bg-[#28b380] text-slate-900 border-2 border-slate-800 px-5 py-2.5 rounded-xl text-sm font-bold shadow-pop-sm hover:translate-y-[-2px] active:translate-y-[2px] transition-all flex items-center gap-2"
        >
          <Plus size={18} strokeWidth={2.5} />
          Add Payment Method
        </button>
      </div>

      {/* Payment methods */}
      {methods.length === 0 ? (
        <div className="bg-white border-2 border-slate-300 rounded-2xl p-10 text-center">
          <CreditCard
            size={42}
            className="mx-auto text-slate-400 mb-3"
          />

          <h3 className="text-lg font-bold text-slate-700">
            No payment methods
          </h3>

          <p className="text-sm text-slate-500 mt-1 mb-5">
            Add a payment method to start accepting payments.
          </p>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="bg-[#34D399] text-slate-900 border-2 border-slate-800 px-5 py-2.5 rounded-xl text-sm font-bold shadow-pop-sm"
          >
            <Plus size={16} className="inline mr-1" />
            Add Payment Method
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {methods.map(method => {
            const meta = getMethodMeta(method.name);
            const form = forms[method.id] || {};
            const MetaIcon = meta.icon;

            return (
              <div
                key={method.id}
                className={`bg-white border-2 rounded-2xl p-6 shadow-pop transition-all ${
                  form.isEnabled
                    ? 'border-slate-800'
                    : 'border-slate-300 opacity-80'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`w-14 h-14 flex items-center justify-center bg-slate-50 border-2 border-slate-800 rounded-xl shadow-pop-sm shrink-0 ${meta.color}`}
                    >
                      <MetaIcon
                        size={24}
                        strokeWidth={2.5}
                      />
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-slate-800 font-bold font-outfit text-lg truncate">
                        {meta.label}
                      </h3>

                      <p className="text-slate-500 text-sm font-medium">
                        {meta.desc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-bold text-slate-500 uppercase">
                      {form.isEnabled
                        ? 'Enabled'
                        : 'Disabled'}
                    </span>

                    <Toggle
                      checked={Boolean(form.isEnabled)}
                      onChange={() =>
                        update(
                          method.id,
                          'isEnabled',
                          !form.isEnabled
                        )
                      }
                    />
                  </div>
                </div>

                {/* UPI configuration */}
                {String(method.name).toUpperCase() === 'UPI' &&
                  form.isEnabled && (
                    <div className="border-t-2 border-slate-100 pt-4 mt-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          UPI ID
                        </label>

                        <input
                          value={form.upiId || ''}
                          onChange={event =>
                            update(
                              method.id,
                              'upiId',
                              event.target.value
                            )
                          }
                          placeholder="yourname@ybl"
                          className="w-full bg-white border-2 border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#34D399] font-semibold transition"
                        />

                        <p className="text-xs text-slate-500 mt-1.5 font-medium flex items-center gap-1.5">
                          <Settings
                            size={12}
                            className="text-slate-400"
                          />

                          <span>
                            Customers can use this ID to pay directly
                          </span>
                        </p>
                      </div>

                      {form.upiId ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="bg-white p-3 rounded-xl border-2 border-slate-800 shadow-pop-sm">
                            <QRCodeSVG
                              value={`upi://pay?pa=${encodeURIComponent(
                                form.upiId.trim()
                              )}&pn=Safina+Coffee+Restaurant`}
                              size={120}
                            />
                          </div>

                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                            Live QR Preview
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-500 bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl text-xs h-fit self-center">
                          <AlertTriangle size={16} />

                          <span>
                            Enter UPI ID to generate live checkout QR code
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                {/* Save */}
                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => handleSave(method)}
                    disabled={Boolean(saving[method.id])}
                    className="bg-[#34D399] hover:bg-[#28b380] text-slate-900 border-2 border-slate-800 px-5 py-2.5 rounded-xl text-sm font-bold shadow-pop-sm hover:translate-y-[-2px] active:translate-y-[2px] transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Check
                      size={16}
                      strokeWidth={2.5}
                    />

                    <span>
                      {saving[method.id]
                        ? 'Saving...'
                        : 'Save Settings'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Payment Method Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-lg bg-white border-2 border-slate-800 rounded-2xl shadow-pop overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b-2 border-slate-100">
              <div>
                <h2 className="text-xl font-black text-slate-800 font-outfit">
                  Add Payment Method
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Add any payment method used by your restaurant
                </p>
              </div>

              <button
                type="button"
                onClick={closeAddModal}
                disabled={adding}
                className="w-9 h-9 flex items-center justify-center rounded-lg border-2 border-slate-200 hover:border-slate-800 hover:bg-slate-50 transition disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleAddMethod}
              className="p-6"
            >
              {/* Name */}
              <div className="mb-5">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Payment Method Name
                </label>

                <input
                  autoFocus
                  value={newMethod.name}
                  onChange={event =>
                    setNewMethod(current => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="e.g. Telebirr, CBE Birr, Awash Bank"
                  maxLength={50}
                  className="w-full bg-white border-2 border-slate-200 text-slate-800 rounded-xl px-3 py-3 focus:outline-none focus:border-[#34D399] font-semibold transition"
                />

                <div className="flex justify-between mt-1.5">
                  <p className="text-xs text-slate-500">
                    Enter any payment method used by Safina.
                  </p>

                  <span className="text-xs text-slate-400">
                    {newMethod.name.length}/50
                  </span>
                </div>
              </div>

              {/* UPI ID */}
              {newMethod.name.trim().toUpperCase() === 'UPI' && (
                <div className="mb-5">
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    UPI ID
                  </label>

                  <input
                    value={newMethod.upiId}
                    onChange={event =>
                      setNewMethod(current => ({
                        ...current,
                        upiId: event.target.value,
                      }))
                    }
                    placeholder="yourname@ybl"
                    className="w-full bg-white border-2 border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#34D399] font-semibold transition"
                  />
                </div>
              )}

              {/* Enabled */}
              <div className="flex items-center justify-between bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 mb-6">
                <div>
                  <p className="text-sm font-bold text-slate-700">
                    Enable immediately
                  </p>

                  <p className="text-xs text-slate-500">
                    Make this method available for payments
                  </p>
                </div>

                <Toggle
                  checked={newMethod.isEnabled}
                  onChange={() =>
                    setNewMethod(current => ({
                      ...current,
                      isEnabled: !current.isEnabled,
                    }))
                  }
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeAddModal}
                  disabled={adding}
                  className="px-5 py-2.5 rounded-xl border-2 border-slate-300 text-slate-700 font-bold text-sm hover:border-slate-800 transition disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    adding ||
                    !newMethod.name.trim()
                  }
                  className="bg-[#34D399] hover:bg-[#28b380] text-slate-900 border-2 border-slate-800 px-5 py-2.5 rounded-xl text-sm font-bold shadow-pop-sm disabled:opacity-50 transition flex items-center gap-2"
                >
                  <Plus size={17} />

                  {adding
                    ? 'Adding...'
                    : 'Add Payment Method'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}