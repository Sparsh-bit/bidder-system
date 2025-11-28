// -----------------------------------------------------------------------------
// NETWORK CONFIGURATION
// -----------------------------------------------------------------------------
// For the web frontend, we can rely on Vite's proxy or localhost.
// However, to be consistent and explicit, we define it here.

const PORT = '8000';

// Use environment variable if available (e.g. production), otherwise default to localhost
export const API_BASE_URL = import.meta.env.VITE_API_URL || `http://localhost:${PORT}`;
export const SOCKET_URL = import.meta.env.VITE_WS_URL || `http://localhost:${PORT}`;

console.log('API_BASE_URL:', API_BASE_URL); // Debug log
