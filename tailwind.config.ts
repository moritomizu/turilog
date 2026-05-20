import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17201d",
        water: "#0f766e",
        tide: "#2563eb",
        coral: "#f97316",
        foam: "#f4fbf8"
      },
      boxShadow: {
        soft: "0 12px 35px rgba(15, 118, 110, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
