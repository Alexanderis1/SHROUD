import { useState } from 'react';
import Dashboard from './components/Dashboard';
import BootSequence from './components/BootSequence';

export default function App() {
  const [booted, setBooted] = useState(false);
  return (
    <>
      {!booted && <BootSequence onDone={() => setBooted(true)} />}
      {booted && <Dashboard />}
    </>
  );
}
