interface KeyboardHelpProps {
  onClose: () => void;
}

const shortcuts = [
  { keys: ['Ctrl', 'Enter'], action: 'Solve production graph' },
  { keys: ['Ctrl', 'S'], action: 'Save current factory' },
  { keys: ['Ctrl', 'N'], action: 'New factory' },
  { keys: ['Ctrl', '\\'], action: 'Toggle sidebar' },
  { keys: ['Escape'], action: 'Close dialogs / deselect' },
  { keys: ['?'], action: 'Toggle this help panel' },
];

export function KeyboardHelp({ onClose }: KeyboardHelpProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-satisfactory-dark border border-satisfactory-border shadow-lg max-w-md w-full mx-4 animate-stamp"
        style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-satisfactory-panel/80 px-4 py-2 border-b border-satisfactory-border flex items-center justify-between">
          <span className="text-satisfactory-orange font-industrial text-xs uppercase tracking-[0.2em] font-bold">
            Keyboard Shortcuts
          </span>
          <button
            onClick={onClose}
            className="text-satisfactory-muted hover:text-satisfactory-orange text-xs transition-colors"
          >
            [ESC]
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-4 space-y-2">
          {shortcuts.map((shortcut, i) => (
            <div key={i} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, ki) => (
                  <span key={ki}>
                    {ki > 0 && <span className="text-satisfactory-muted/40 mx-0.5">+</span>}
                    <kbd className="bg-satisfactory-darker border border-satisfactory-border px-2 py-0.5 text-[11px] text-satisfactory-text shadow-industrial min-w-[24px] text-center inline-block">
                      {key}
                    </kbd>
                  </span>
                ))}
              </div>
              <span className="text-xs text-satisfactory-muted">{shortcut.action}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-satisfactory-border/50 text-[9px] text-satisfactory-muted/40 font-industrial text-center uppercase tracking-wider">
          FICSIT Productivity System — Keyboard Interface v1.0
        </div>
      </div>
    </div>
  );
}
