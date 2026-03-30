import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div
        className="bg-satisfactory-dark border border-satisfactory-border shadow-lg w-full max-w-sm mx-4 animate-stamp"
        style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))' }}
      >
        {/* Header */}
        <div className="bg-satisfactory-panel/80 px-4 py-2 border-b border-satisfactory-border flex items-center justify-between">
          <span className="text-satisfactory-orange font-industrial text-xs uppercase tracking-[0.2em] font-bold">
            {title}
          </span>
          <button
            onClick={onClose}
            className="text-satisfactory-muted hover:text-satisfactory-orange text-xs transition-colors"
          >
            [ESC]
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ---- Pre-built dialog variants ---- */

interface PromptDialogProps {
  open: boolean;
  title: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function PromptDialog({ open, title, label, defaultValue = '', placeholder, onConfirm, onCancel }: PromptDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = inputRef.current?.value.trim();
    if (val) onConfirm(val);
  };

  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <form onSubmit={handleSubmit}>
        <label className="block text-xs text-satisfactory-muted uppercase tracking-wider mb-2">
          {label}
        </label>
        <input
          ref={inputRef}
          type="text"
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="w-full industrial-inset rounded-none px-3 py-2 text-sm text-white focus:border-satisfactory-orange outline-none mb-4"
        />
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="bg-satisfactory-border/50 text-satisfactory-text text-xs px-4 py-1.5 hover:bg-satisfactory-border transition-colors uppercase tracking-wider"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-satisfactory-orange text-satisfactory-darker font-industrial font-bold text-xs px-4 py-1.5 uppercase tracking-wider hover:shadow-glow-orange active:translate-y-px transition-all"
            style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
          >
            Confirm
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, onConfirm, onCancel }: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) requestAnimationFrame(() => confirmRef.current?.focus());
  }, [open]);

  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-satisfactory-text mb-4">{message}</p>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="bg-satisfactory-border/50 text-satisfactory-text text-xs px-4 py-1.5 hover:bg-satisfactory-border transition-colors uppercase tracking-wider"
        >
          Cancel
        </button>
        <button
          ref={confirmRef}
          onClick={onConfirm}
          className={`font-industrial font-bold text-xs px-4 py-1.5 uppercase tracking-wider active:translate-y-px transition-all ${
            danger
              ? 'bg-red-600 text-white hover:bg-red-500'
              : 'bg-satisfactory-orange text-satisfactory-darker hover:shadow-glow-orange'
          }`}
          style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
