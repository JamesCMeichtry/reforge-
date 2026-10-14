import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// The fonts ship with the app instead of loading from Google: faster on bad signal, and no data sent to Google
import '@fontsource/barlow/latin-400.css'
import '@fontsource/barlow/latin-500.css'
import '@fontsource/barlow/latin-600.css'
import '@fontsource/barlow-condensed/latin-600.css'
import '@fontsource/barlow-condensed/latin-700.css'
import './index.css'
import App from './App.jsx'
import { CrashGuard } from './components/Feedback.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CrashGuard page>
      <App />
    </CrashGuard>
  </StrictMode>,
)

// Keeps the app itself on the phone, so it opens and logs sets even with no signal
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}
