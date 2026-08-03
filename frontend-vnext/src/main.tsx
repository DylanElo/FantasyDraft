import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './global.css'

const DivergentFistLab = lazy(() => import('./prototypes/divergent-fist-lab/DivergentFistLab'))
const isDivergentFistLab = window.location.pathname === '/prototype/divergent-fist'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isDivergentFistLab ? <Suspense fallback={null}><DivergentFistLab /></Suspense> : <App />}
  </StrictMode>,
)
