import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { setupAutoUpdate } from './lib/pwa'

setupAutoUpdate()

const root = document.getElementById('root')
if (!root) throw new Error('Elemento #root não encontrado')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
