import { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { BootSequence } from './components/BootSequence';
import { ToastContainer } from './components/Toast';
import { useFactoryStore } from './stores/useFactoryStore';
import { useToastStore } from './stores/useToastStore';
import { getSharedFactory } from './api/shares';
import { useSharePolling } from './hooks/useSharePolling';

function App() {
  const loadGameData = useFactoryStore((s) => s.loadGameData);
  const gameDataLoaded = useFactoryStore((s) => s.gameDataLoaded);
  const enterGuestMode = useFactoryStore((s) => s.enterGuestMode);
  const solve = useFactoryStore((s) => s.solve);
  const [bootDone, setBootDone] = useState(false);

  useSharePolling();

  useEffect(() => {
    loadGameData();
  }, [loadGameData]);

  // Once game data is ready, check for ?share= param and enter guest mode
  useEffect(() => {
    if (!gameDataLoaded) return;
    const token = new URLSearchParams(window.location.search).get('share');
    if (!token) return;

    getSharedFactory(token)
      .then(async (factory) => {
        enterGuestMode(token, factory);
        await solve();
      })
      .catch(() => {
        useToastStore.getState().addToast('error', 'Share link not found or expired.');
        window.history.replaceState({}, '', window.location.pathname);
      });
  }, [gameDataLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!bootDone || !gameDataLoaded) {
    return <BootSequence onComplete={() => setBootDone(true)} />;
  }

  return (
    <>
      <Layout />
      <ToastContainer />
    </>
  );
}

export default App;
