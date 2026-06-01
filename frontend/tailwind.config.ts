import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Page background — a slightly cooler, paler mint than Tailwind's emerald-50.
        canvas: "#f1faf5",
      },
    },
  },
  plugins: [],
} satisfies Config;
