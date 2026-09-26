import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Delete',
  confirmClass = 'bg-rose-500 hover:bg-rose-600',
  loading = false,
  icon = <AlertTriangle size={24} className="text-rose-500" />,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-slate-50 border-2 border-slate-200 flex items-center justify-center text-slate-600">
          {icon}
        </div>
        <p className="text-slate-600 text-sm leading-relaxed font-jakarta font-medium">{message}</p>
        <div className="flex gap-4 w-full pt-2 font-outfit">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-800 py-2.5 rounded-xl text-sm font-bold shadow-pop-sm transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 text-white border-2 border-slate-800 py-2.5 rounded-xl text-sm font-bold shadow-pop-sm transition disabled:opacity-50 ${confirmClass}`}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
