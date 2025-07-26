import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath } from "url";
import tsconfigPaths from "vite-tsconfig-paths";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => ({
  server: {
    proxy: {
      "/api": {
        target: "https://democratic-cuckoo-impag-f0717e14.koyeb.app",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/products": {
        target: "https://democratic-cuckoo-impag-f0717e14.koyeb.app",
        changeOrigin: true,
        secure: true,
      },
      "/categories": {
        target: "https://democratic-cuckoo-impag-f0717e14.koyeb.app",
        changeOrigin: true,
        secure: true,
      },
      "/suppliers": {
        target: "https://democratic-cuckoo-impag-f0717e14.koyeb.app",
        changeOrigin: true,
        secure: true,
      },
      "/variants": {
        target: "https://democratic-cuckoo-impag-f0717e14.koyeb.app",
        changeOrigin: true,
        secure: true,
      },
    },
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: true,
    },
  },
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
