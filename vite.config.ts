import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  // Every prefixed variable is readable by client code. Server-only values
  // (service-role key, JWT secret, database URLs) must never match this.
  envPrefix: "VITE_",
});
