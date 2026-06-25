// prisha note : vite file (build tool) to understand react 
// hopefully do not have to touch this again lol

import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    // prisha note: "address" website will live at
    server: { port : 5173}
})