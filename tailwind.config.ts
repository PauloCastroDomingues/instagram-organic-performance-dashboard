import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        pneu: "#1D1D1B",
        asphalt: "#3F3A38",
        paper: "#F4F4F4",
        apex: "#FB5D06"
      },
      fontFamily: {
        sans: ["Inter", "Arial", "sans-serif"],
        display: ["Formula1 Display", "Arial Black", "Inter", "Arial", "sans-serif"]
      },
      boxShadow: {
        panel: "0 12px 32px rgba(0, 0, 0, 0.2)"
      }
    }
  },
  plugins: []
};

export default config;
