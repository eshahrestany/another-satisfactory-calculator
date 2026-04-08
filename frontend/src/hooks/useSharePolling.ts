import { useEffect } from 'react';
import { useFactoryStore } from '../stores/useFactoryStore';
import { useToastStore } from '../stores/useToastStore';
import { getSharedFactory } from '../api/shares';

export function useSharePolling(): void {
  const isGuestMode = useFactoryStore((s) => s.isGuestMode);
  const shareToken = useFactoryStore((s) => s.shareToken);
  const guestUpdatedAt = useFactoryStore((s) => s.guestUpdatedAt);
  const enterGuestMode = useFactoryStore((s) => s.enterGuestMode);
  const exitGuestMode = useFactoryStore((s) => s.exitGuestMode);
  const solve = useFactoryStore((s) => s.solve);

  useEffect(() => {
    if (!isGuestMode || !shareToken) return;

    const id = setInterval(async () => {
      try {
        const factory = await getSharedFactory(shareToken);
        if (factory.updated_at !== guestUpdatedAt) {
          enterGuestMode(shareToken, factory);
          await solve();
        }
      } catch {
        clearInterval(id);
        exitGuestMode();
        useToastStore.getState().addToast('error', 'The shared factory is no longer available.');
        window.history.replaceState({}, '', window.location.pathname);
      }
    }, 5000);

    return () => clearInterval(id);
  }, [isGuestMode, shareToken, guestUpdatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  // guestUpdatedAt in deps: when enterGuestMode updates it, the effect re-fires
  // with a fresh closure so the next poll comparison uses the correct baseline.
}
