import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: (() => {
    let gitHash = "unknown";

    try {
      gitHash = execSync("git rev-parse --short HEAD", {
        stdio: ["ignore", "pipe", "ignore"],
      })
        .toString()
        .trim();
    } catch {
      // e.g. building from an archive without .git
    }

    return {
      "import.meta.env.VITE_APP_VERSION": JSON.stringify(gitHash),
    };
  })(),
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: (() => {
      const target = process.env.VITE_API_PROXY_TARGET ?? "";

      if (!target) return undefined;

      return {
        "/api": {
          target,
          changeOrigin: true,
          secure: false,
        },
      };
    })(),
  },
});
