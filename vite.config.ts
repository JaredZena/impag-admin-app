import path from "node:path";
import { defineConfig } from 'vite';
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "https://democratic-cuckoo-impag-f0717e14.koyeb.app",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
