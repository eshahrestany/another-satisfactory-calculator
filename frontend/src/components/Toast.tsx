import { useToastStore, type ToastType } from '../stores/useToastStore';

const typeConfig: Record<ToastType, { border: string; prefix: string; prefixColor: string; bg: string }> = {
  success: { border: 'border-green-600', prefix: '[OK]', prefixColor: 'text-green-400', bg: 'bg-green-950/95' },
  error: { border: 'border-red-600', prefix: '[ERR]', prefixColor: 'text-red-400', bg: 'bg-red-950/95' },
  info: { border: 'border-satisfactory-orange/60', prefix: '[SYS]', prefixColor: 'text-satisfactory-orange', bg: 'bg-satisfactory-dark/95' },
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-14 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const config = typeConfig[toast.type];
        return (
          <div
            key={toast.id}
            className={`${config.bg} ${config.border} border px-4 py-2 shadow-lg text-xs text-satisfactory-text animate-stamp cursor-pointer`}
            style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
            onClick={() => removeToast(toast.id)}
          >
            <span className={`${config.prefixColor} font-bold mr-2`}>{config.prefix}</span>
            {toast.message}
          </div>
        );
      })}
    </div>
  );
}
