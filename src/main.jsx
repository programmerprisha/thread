// prisha note: main purpose of file is find the empty <div id = "root" from index.html and put whole app inside it :))

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css' 
import App from './App.jsx'

// prisha note: will find empty box and draw app inside it 
createRoot(document.getElementById('root')).render(
    <StrictMode>   
    <App />
    </StrictMode>
)