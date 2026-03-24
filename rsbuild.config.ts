import { defineConfig } from "@rsbuild/core";
import { pluginVue } from "@rsbuild/plugin-vue";
import path from "node:path";

const cesiumSource = "node_modules/cesium/Build/Cesium";

const host = process.env.TAURI_DEV_HOST;

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  plugins: [pluginVue()],
  source: {
    entry: {
      index: "./src/index.ts",
    },
  },
  html: {
    template: "./index.html",
  },
  output: {
    copy: [
      { from: path.resolve(cesiumSource, "Workers"), to: "cesium/Workers" },
      { from: path.resolve(cesiumSource, "Assets"), to: "cesium/Assets" },
      { from: path.resolve(cesiumSource, "Widgets"), to: "cesium/Widgets" },
      { from: path.resolve(cesiumSource, "ThirdParty"), to: "cesium/ThirdParty" },
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    host: host,
  },
  dev: {
    client: host
      ? {
          protocol: "ws",
          host,
          port: 3000,
        }
      : undefined,
  },
  tools: {
    rspack: {
      watchOptions: {
        ignored: ["**/src-tauri/**"],
      },
    },
  },
});
