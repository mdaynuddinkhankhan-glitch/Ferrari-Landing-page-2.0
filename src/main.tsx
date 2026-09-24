import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Prevent unhandled cross-origin script error noise from breaking preview iframe
window.onerror = function (message, source, lineno, colno, error) {
  if (message === 'Script error.' || !source) {
    console.warn('Suppressed cross-origin Script error:', { message, source, lineno, colno, error });
    return true; // Prevents firing default browser error reporting
  }
  return false;
};

window.addEventListener(
  'error',
  (event) => {
    if (event.message === 'Script error.' || !event.filename) {
      event.preventDefault();
      event.stopImmediatePropagation();
      console.warn('Suppressed uninformative cross-origin Script error');
    }
  },
  true
);

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason || '');
  if (
    message.includes('Script error') ||
    message.includes('the client is offline') ||
    message.includes('Failed to fetch') ||
    message.includes('Load failed')
  ) {
    event.preventDefault();
    console.warn('Suppressed benign unhandled network/script rejection:', message);
  }
});

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}
