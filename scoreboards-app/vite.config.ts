import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.VITE_API_PROXY_TARGET ?? "";

  return {
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
      proxy: !target
        ? undefined
        : {
            "/api": {
              target,
              changeOrigin: true,
              secure: false,
            },
          },
    },
  };
});
