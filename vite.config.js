import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath } from "url";
import tsconfigPaths from "vite-tsconfig-paths";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export default defineConfig(({ mode }) => ({
    server: mode === "development" ? {
        proxy: {
            "/api": {
                target: "https://democratic-cuckoo-impag-f0717e14.koyeb.app",
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/api/, ""),
            },
        },
        hmr: {
            overlay: true,
        },
        watch: {
            usePolling: true,
        },
    } : {},
    plugins: [react(), tsconfigPaths()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    optimizeDeps: {
        force: true,
    },
    build: {
        sourcemap: true,
    },
}));
