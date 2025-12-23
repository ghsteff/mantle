import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Force pre-bundle these deps to avoid runtime optimization issues
    include: ["react", "react-dom"],
  },
  server: {
    // Ensure the server stays alive
    watch: {
      usePolling: true,
    },
  },
});
