import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider }     from './context/AuthContext.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import { ThemeProvider }    from './context/ThemeContext.jsx'

// Anonymous "where did this visit come from" ping — once per browser session.
// Sends only the referrer (backend keeps just its hostname), UTM labels and
// the landing path.
try {
  if (!sessionStorage.getItem('sp_visit_sent') && location.hostname !== 'localhost') {
    sessionStorage.setItem('sp_visit_sent', '1');
    const q = new URLSearchParams(location.search);
    const p = new URLSearchParams({ ref: document.referrer || '', path: location.pathname });
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach(k => q.get(k) && p.set(k, q.get(k)));
    const base = import.meta.env.VITE_API_URL || 'https://api.smartprice.be';
    fetch(`${base}/api/track-visit?${p}`, { credentials: 'include', keepalive: true }).catch(() => {});
  }
} catch {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>
)