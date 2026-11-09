import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base relativa: funciona igual en GitHub Pages (/<repo>/) y abriendo localmente
export default defineConfig({
  base: "./",
  plugins: [react()],
});
