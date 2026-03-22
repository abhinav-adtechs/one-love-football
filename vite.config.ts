import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173
  },
  envPrefix: ["VITE_", "NEXT_PUBLIC_", "ONE_LOVE_"]
});
