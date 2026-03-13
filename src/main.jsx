import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import MapLoop from './MapLoop.jsx'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <MapLoop />
    </StrictMode>
)
