import { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { BootSequence } from './components/BootSequence';
import { ToastContainer } from './components/Toast';
import { useFactoryStore } from './stores/useFactoryStore';

function App() {
  const loadGameData = useFactoryStore((s) => s.loadGameData);
  const gameDataLoaded = useFactoryStore((s) => s.gameDataLoaded);
  const [bootDone, setBootDone] = useState(false);

  useEffect(() => {
    loadGameData();
  }, [loadGameData]);

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
