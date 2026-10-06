// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import './index.css'
// import App from './App.jsx'

// createRoot(document.getElementById('root')).render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// )



import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import WaiterStandalone from './WaiterStandalone';
import './index.css';

const IS_WAITER_BUILD =
  import.meta.env.VITE_WAITER_BUILD === 'true';

console.log('🚀 Build mode:', IS_WAITER_BUILD ? 'WAITER' : 'POS');

createRoot(document.getElementById('root')).render(
  
IS_WAITER_BUILD ? <WaiterStandalone /> : <App />
);