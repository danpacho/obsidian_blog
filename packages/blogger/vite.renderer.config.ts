import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import renderer from 'vite-plugin-electron-renderer'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        renderer(), // Enable node integration in renderer process
        TanStackRouterVite({}), // Enable TanStack Router
        react(), // Enable React
    ],
})
