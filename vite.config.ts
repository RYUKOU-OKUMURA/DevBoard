import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: "127.0.0.1",
  },
  build: {
    target: "ES2020",
    outDir: "dist",
    sourcemap: false, // 本番環境ではソースマップを無効化
    minify: "terser", // Terserを使用して最適化
    terserOptions: {
      compress: {
        drop_console: true, // console.logを削除
        drop_debugger: true, // debuggerステートメントを削除
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // ベンダーチャンクを分割してキャッシュ効率を向上
          react: ["react", "react-dom"],
        },
      },
    },
  },
});
