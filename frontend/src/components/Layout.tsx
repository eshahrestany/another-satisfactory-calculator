import { useState, useEffect, useCallback } from 'react';
import { Tooltip } from './Tooltip';
import { Toolbar } from './Toolbar';
import { FactoryGraph } from './graph/FactoryGraph';
import { ModeToggle } from './panels/ModeToggle';
import { TargetPanel } from './panels/TargetPanel';
import { InputPanel } from './panels/InputPanel';
import { PowerConfigPanel } from './panels/PowerConfigPanel';
import { RecipePanel } from './panels/RecipePanel';
import { ResourceConstraintPanel } from './panels/ResourceConstraintPanel';
import { SettingsPanel } from './panels/SettingsPanel';
import { OptimizationPanel } from './panels/OptimizationPanel';
import { SummaryPanel } from './panels/SummaryPanel';
import { StatusBar } from './StatusBar';
import { KeyboardHelp } from './KeyboardHelp';
import { useFactoryStore } from '../stores/useFactoryStore';
import { GuestModeOverlay } from './GuestModeOverlay';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const solve = useFactoryStore((s) => s.solve);
  const clearFactory = useFactoryStore((s) => s.clearFactory);
  const mode = useFactoryStore((s) => s.mode);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const tag = (e.target as HTMLElement).tagName;
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    if (e.key === 'Escape') {
      setShowHelp(false);
      return;
    }

    if (e.key === '?' && !isInput) {
      e.preventDefault();
      setShowHelp((v) => !v);
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'Enter') {
        e.preventDefault();
        solve();
      } else if (e.key === '\\') {
        e.preventDefault();
        setSidebarOpen((v) => !v);
      } else if (e.key === 'n') {
        e.preventDefault();
        clearFactory();
      }
    }
  }, [solve, clearFactory]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex flex-col h-full bg-satisfactory-darker">
      <Toolbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className={`${
            sidebarOpen ? 'w-72' : 'w-0'
          } transition-all duration-300 bg-satisfactory-panel border-r border-satisfactory-border overflow-hidden flex-shrink-0 animate-hum`}
        >
          <div className="w-72 h-full overflow-y-auto p-3 space-y-3">
            <GuestModeOverlay />
            <ModeToggle />
            <div className="border-t border-satisfactory-border/50 caution-stripe h-px" />
            {mode === 'production' ? (
              <>
                <TargetPanel />
                <div className="border-t border-satisfactory-border/50 caution-stripe h-px" />
                <InputPanel />
              </>
            ) : (
              <PowerConfigPanel />
            )}
            <div className="border-t border-satisfactory-border/50 caution-stripe h-px" />
            <RecipePanel />
            <div className="border-t border-satisfactory-border/50 caution-stripe h-px" />
            <ResourceConstraintPanel />
            <div className="border-t border-satisfactory-border/50 caution-stripe h-px" />
            <SettingsPanel />
            <div className="border-t border-satisfactory-border/50 caution-stripe h-px" />
            <OptimizationPanel />
          </div>
        </div>

        {/* Toggle sidebar button */}
        <Tooltip text={sidebarOpen ? "Collapse configuration panel. Keyboard: Ctrl+\\" : "Expand configuration panel. Keyboard: Ctrl+\\"} side="right">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-5 flex-shrink-0 bg-satisfactory-dark hover:bg-satisfactory-panel border-r border-satisfactory-border flex items-center justify-center text-satisfactory-muted hover:text-satisfactory-orange transition-colors group"
          >
            <span className="group-hover:animate-pulse text-xs">
              {sidebarOpen ? '\u25C0' : '\u25B6'}
            </span>
          </button>
        </Tooltip>

        {/* Main content */}
        <div className="flex-1 flex flex-col bg-satisfactory-darker">
          <FactoryGraph />
          <SummaryPanel />
        </div>
      </div>

      <StatusBar />

      {showHelp && <KeyboardHelp onClose={() => setShowHelp(false)} />}
    </div>
  );
}
