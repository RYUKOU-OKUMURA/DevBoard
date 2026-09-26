import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  envPrefix: ["VITE_", "DEVBOARD_"],
  server: {
    port: 5173,
    strictPort: true,
    host: "127.0.0.1",
  },
  build: {
    target: "es2020",
    outDir: "dist",
    sourcemap: false, // 本番環境ではソースマップを無効化
    cssCodeSplit: true,
    assetsInlineLimit: 2048,
    manifest: true,
    minify: "terser", // Terserを使用して最適化
    terserOptions: {
      compress: {
        drop_console: true, // console.logを削除
        drop_debugger: true, // debuggerステートメントを削除
      },
      format: {
        comments: false,
      },
    },
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react",
              test: /node_modules[\\/](?:react|react-dom)[\\/]/,
            },
            {
              name: "motion",
              test: /node_modules[\\/]framer-motion[\\/]/,
            },
            {
              name: "dnd",
              test: /node_modules[\\/]@dnd-kit[\\/]/,
            },
          ],
        },
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
});
