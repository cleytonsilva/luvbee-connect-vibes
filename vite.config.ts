import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    cssCodeSplit: false, // Garante que CSS seja incluído em um único arquivo
    cssMinify: true, // Minifica CSS para produção
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          // Garante que CSS tenha extensão correta e seja servido como arquivo externo
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'assets/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  css: {
    postcss: './postcss.config.js',
    devSourcemap: true, // Source maps em desenvolvimento
  },
}));
