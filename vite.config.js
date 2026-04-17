// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    watch: {
      usePolling: true, // required for Cursor/VS Code and some setups so changes trigger HMR
    },
    hmr: true,
  },
});
