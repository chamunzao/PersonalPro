import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { AuthProvider } from './AuthContext'
import './styles.css'

const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
const localCacheRefreshKey = 'personalpro-local-cache-cleared'

async function clearLocalPwaCache() {
  if (!isLocalHost) return
  let shouldReload = false

  try {
    const registrations = await navigator.serviceWorker?.getRegistrations?.()
    shouldReload = shouldReload || (registrations || []).length > 0
    await Promise.all((registrations || []).map(registration => registration.unregister()))
  } catch (error) {
    console.warn('Could not unregister local service workers:', error)
  }

  try {
    const keys = await window.caches?.keys?.()
    shouldReload = shouldReload || (keys || []).length > 0
    await Promise.all((keys || []).map(key => window.caches.delete(key)))
  } catch (error) {
    console.warn('Could not clear local caches:', error)
  }

  if (shouldReload && sessionStorage.getItem(localCacheRefreshKey) !== 'true') {
    sessionStorage.setItem(localCacheRefreshKey, 'true')
    window.location.reload()
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
