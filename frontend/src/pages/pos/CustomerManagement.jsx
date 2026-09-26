import { useEffect, useState } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { Plus, Search, User, Mail, Phone, ShoppingCart, X, Loader2 } from 'lucide-react';

const BG     = '#FFFDF5';
const WHITE  = '#FFFFFF';
const FG     = '#1E293B';
const MUTED  = '#64748B';
const BORDER = '#E2E8F0';
const ACCENT = '#8B5CF6';
const AMBER  = '#FBBF24';
const EMERALD= '#34D399';
const PINK   = '#F472B6';
const FONT_H = "'Outfit', system-ui, sans-serif";
const FONT_B = "'Plus Jakarta Sans', system-ui, sans-serif";

const fmt = (n) =>
  `ETB ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const AVATAR_COLORS = [ACCENT, PINK, AMBER, EMERALD, '#60A5FA', '#F97316', '#A78BFA'];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

export default function CustomerManagement() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get(`/customers${search ? `?search=${search}` : ''}`);
        setCustomers(data || []);
      } catch { toast.error('Failed to load customers'); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      const c = await api.post('/customers', form);
      setCustomers(prev => [c, ...prev]);
      setForm({ name: '', email: '', phone: '' });
      setShowForm(false);
      toast.success(`${c.name} added!`);
    } catch (err) {
      toast.error(err?.error || 'Failed to create customer');
    } finally { setSaving(false); }
  };

  const inputStyle = {
    background: '#F8FAFC', border: `2px solid ${BORDER}`, color: FG,
    borderRadius: 12, padding: '10px 12px 10px 34px', width: '100%',
    fontSize: 14, fontFamily: FONT_B, outline: 'none',
  };

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: BG, fontFamily: FONT_B }}>

      {/* ── Header ── */}
      <div className="px-5 py-4 shrink-0 flex items-center justify-between"
           style={{ borderBottom: `2px solid ${BORDER}`, background: WHITE }}>
        <div>
          <h2 className="font-black text-xl" style={{ color: FG, fontFamily: FONT_H }}>Customers</h2>
          <p className="text-xs mt-0.5 font-semibold" style={{ color: MUTED }}>
            {customers.length} customer{customers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowForm(f => !f)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-black transition-all duration-200 border-2"
          style={showForm
            ? { background: WHITE, color: MUTED, borderColor: BORDER }
            : { background: ACCENT, color: '#fff', borderColor: FG, boxShadow: `3px 3px 0px 0px ${FG}` }}
        >
          {showForm ? <X size={15} strokeWidth={2.5} /> : <Plus size={15} strokeWidth={2.5} />}
          {showForm ? 'Close' : 'Add Customer'}
        </button>
      </div>

      {/* ── Create form ── */}
      {showForm && (
        <form onSubmit={handleCreate} className="px-5 py-4 shrink-0"
              style={{ borderBottom: `2px solid ${BORDER}`, background: WHITE }}>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {[
              { field: 'name', placeholder: 'Full name *', Icon: User, required: true },
              { field: 'email', placeholder: 'Email', Icon: Mail, type: 'email' },
              { field: 'phone', placeholder: 'Phone', Icon: Phone },
            ].map(({ field, placeholder, Icon, required, type }) => (
              <div key={field} className="relative">
                <Icon size={13} strokeWidth={2.5} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
                <input
                  required={required} type={type || 'text'}
                  value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })}
                  placeholder={placeholder}
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = ACCENT; e.target.style.boxShadow = `4px 4px 0px 0px ${ACCENT}`; }}
                  onBlur={e => { e.target.style.borderColor = BORDER; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm font-bold rounded-xl transition border-2"
              style={{ background: WHITE, color: MUTED, borderColor: BORDER }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm font-black rounded-xl transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50 border-2"
              style={{ background: ACCENT, color: '#fff', borderColor: FG, boxShadow: `3px 3px 0px 0px ${FG}`, fontFamily: FONT_H }}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save Customer'}
            </button>
          </div>
        </form>
      )}

      {/* ── Search ── */}
      <div className="px-5 py-3 shrink-0" style={{ borderBottom: `2px solid ${BORDER}`, background: WHITE }}>
        <div className="relative">
          <Search size={14} strokeWidth={2.5} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email or phone…"
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl focus:outline-none transition"
            style={{ background: '#F8FAFC', border: `2px solid ${BORDER}`, color: FG, fontFamily: FONT_B }}
            onFocus={e => { e.target.style.borderColor = ACCENT; e.target.style.boxShadow = `4px 4px 0px 0px ${ACCENT}`; }}
            onBlur={e => { e.target.style.borderColor = BORDER; e.target.style.boxShadow = 'none'; }}
          />
        </div>
      </div>

      {/* ── Customer list ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4" style={{ background: BG }}>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl border-2" style={{ background: WHITE, borderColor: BORDER, opacity: 0.6 }} />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-4 text-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center border-2"
                 style={{ background: WHITE, borderColor: BORDER, boxShadow: `4px 4px 0px 0px ${BORDER}` }}>
              <User size={36} style={{ color: BORDER }} />
            </div>
            <div>
              <div className="font-bold text-base" style={{ color: MUTED, fontFamily: FONT_H }}>
                {search ? `No customers matching "${search}"` : 'No customers yet'}
              </div>
              {!search && <div className="text-sm mt-1" style={{ color: '#CBD5E1' }}>Add your first customer using the button above.</div>}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {customers.map(c => {
              const color = avatarColor(c.name);
              return (
                <div key={c.id}
                  className="rounded-xl transition-all duration-200 overflow-hidden"
                  style={{
                    background: WHITE,
                    border: `2px solid ${BORDER}`,
                    boxShadow: `4px 4px 0px 0px ${BORDER}`,
                  }}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Colored avatar */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm shrink-0 border-2"
                      style={{ background: color, borderColor: FG, boxShadow: '2px 2px 0px 0px #1E293B', fontFamily: FONT_H, color: '#fff' }}
                    >
                      {c.name?.[0]?.toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm" style={{ color: FG, fontFamily: FONT_H }}>{c.name}</div>
                      <div className="text-xs mt-0.5 truncate font-semibold" style={{ color: MUTED }}>
                        {[c.email, c.phone].filter(Boolean).join(' · ') || 'No contact info'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs shrink-0 font-bold px-2.5 py-1 rounded-full border-2"
                         style={{ background: `${ACCENT}12`, borderColor: `${ACCENT}40`, color: ACCENT }}>
                      <ShoppingCart size={11} strokeWidth={2.5} />
                      Customer
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
