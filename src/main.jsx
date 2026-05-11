import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { AuthProvider } from './AuthContext'
import './styles.css'

const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)

async function clearLocalPwaCache() {
  if (!isLocalHost) return

  try {
    const registrations = await navigator.serviceWorker?.getRegistrations?.()
    await Promise.all((registrations || []).map(registration => registration.unregister()))
  } catch (error) {
    console.warn('Could not unregister local service workers:', error)
  }

  try {
    const keys = await caches?.keys?.()
    await Promise.all((keys || []).map(key => caches.delete(key)))
  } catch (error) {
    console.warn('Could not clear local caches:', error)
  }
}

if (isLocalHost) {
  clearLocalPwaCache()
} else {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateSW(true)
    }
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)
