// electron.vite.config.ts
import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: [] })],
    resolve: {
      alias: { "@main": resolve("src/main") }
    },
    build: {
      rollupOptions: {
        external: ["sql.js"]
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: { "@": resolve("src/renderer/src") }
    },
    plugins: [react()]
  }
});
export {
  electron_vite_config_default as default
};
