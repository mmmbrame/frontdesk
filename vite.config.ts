import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Lets shadcn components import from "@/components/ui/..." and "@/lib/utils".
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: { port: 5173, strictPort: true },
});
