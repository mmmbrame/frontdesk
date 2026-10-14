import fs from "node:fs";
import path from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// In development, serve the files in /api exactly like Vercel does, so login and the
// protected data route work with `npm run dev` too.
function apiDevServer(): Plugin {
  return {
    name: "atlas-api-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? "";
        // The student file must never be served as a static asset, not even in development.
        if (url.startsWith("/private/")) {
          res.statusCode = 404;
          return res.end("Not found");
        }
        if (!url.startsWith("/api/")) return next();
        const pathname = url.split("?")[0];
        const file = path.join(server.config.root, `${pathname}.ts`);
        if (!fs.existsSync(file)) return next();
        try {
          const mod = await server.ssrLoadModule(`/${pathname.slice(1)}.ts`);
          await mod.default(req, res);
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Server error." }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load .env / .env.local into process.env so the API files can read the sign-in settings in dev.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return {
    plugins: [react(), tailwindcss(), apiDevServer()],
    resolve: {
      alias: {
        // Lets shadcn components import from "@/components/ui/..." and "@/lib/utils".
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: { port: 5173, strictPort: true, fs: { deny: ["private"] } },
  };
});
