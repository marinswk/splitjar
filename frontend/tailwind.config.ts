import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Home Assistant-inspired dark palette.
        canvas: "#111111", // page background
      },
    },
  },
  plugins: [],
} satisfies Config;
