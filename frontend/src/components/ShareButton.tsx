import { useState } from 'react';
import { useFactoryStore } from '../stores/useFactoryStore';
import { useToastStore } from '../stores/useToastStore';
import { createOrGetShare } from '../api/shares';

export function ShareButton() {
  const factoryId = useFactoryStore((s) => s.factoryId);
  const isGuestMode = useFactoryStore((s) => s.isGuestMode);
  const [copied, setCopied] = useState(false);

  if (!factoryId || isGuestMode) return null;

  const handleShare = async () => {
    try {
      const { token } = await createOrGetShare(factoryId);
      const url = `${window.location.origin}${window.location.pathname}?share=${token}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      useToastStore.getState().addToast('error', 'Failed to generate share link');
    }
  };

  return (
    <button
      onClick={handleShare}
      className="text-[10px] font-industrial uppercase tracking-wider px-2 py-1 border border-satisfactory-border text-satisfactory-muted hover:text-satisfactory-orange hover:border-satisfactory-orange/50 transition-colors"
    >
      {copied ? 'Copied!' : 'Share'}
    </button>
  );
}
