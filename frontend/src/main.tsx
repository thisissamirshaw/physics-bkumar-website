import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Home from './Home'
import { STATIC_SITE } from './api'
import './styles.css'

// Admin is loaded only when someone opens /admin, so visitors never download it.
const Admin = lazy(() => import('./admin/Admin'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <Routes>
        {!STATIC_SITE && (
          <Route
            path="/admin/*"
            element={
              <Suspense fallback={<div className="adm-center">Loading admin…</div>}>
                <Admin />
              </Suspense>
            }
          />
        )}
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
