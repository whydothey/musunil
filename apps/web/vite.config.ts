import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(import.meta.dirname, "../.."), "MUSUNIL_");
  const dataMode = env.MUSUNIL_UI_DATA_MODE === "fixture" ? "fixture" : "production";

  return {
    root: resolve(import.meta.dirname, "app"),
    publicDir: resolve(import.meta.dirname, "public"),
    plugins: [react()],
    resolve: {
      alias: {
        "@": resolve(import.meta.dirname, "app/src"),
        "@musunil/data-source": resolve(import.meta.dirname, `app/src/data/${dataMode}.ts`)
      }
    },
    define: {
      __MUSUNIL_UI_DATA_MODE__: JSON.stringify(dataMode)
    },
    build: {
      outDir: resolve(import.meta.dirname, "dist"),
      emptyOutDir: true,
      sourcemap: false,
      target: "es2022"
    },
    server: {
      port: 4173,
      strictPort: false
    },
    preview: {
      port: 4173,
      strictPort: false
    }
  };
});
