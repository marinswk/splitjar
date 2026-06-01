import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        jar: {
          50: "#fdf7ee",
          100: "#f9ead0",
          200: "#f1d29c",
          400: "#dba055",
          600: "#a86a26",
          800: "#6b4216",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
