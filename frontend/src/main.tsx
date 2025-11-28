import React from 'react'
import ReactDOM from 'react-dom/client'

import './index.css'
import App from './App'
// Unregister service workers (to remove old cached versions)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => r.unregister());
  });
}

import { ErrorBoundary } from './components/ErrorBoundary'

import { API_BASE_URL } from './utils/config';

console.log('🚀 App Starting. API_BASE_URL:', API_BASE_URL);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)