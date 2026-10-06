import { HashRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import WaiterDisplay from './pages/waiter/WaiterDisplay';
import './index.css';

export default function WaiterStandalone() {
  return (
    <HashRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <WaiterDisplay />
    </HashRouter>
  );
}