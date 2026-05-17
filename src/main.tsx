import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign Vite WebSocket errors that can trigger disruptive overlays
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && (
    event.reason === 'WebSocket closed without opened.' ||
    (typeof event.reason === 'string' && event.reason.includes('vite')) ||
    (event.reason.message && event.reason.message.includes('WebSocket'))
  )) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
