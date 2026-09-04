import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#090909",
        graphite: "#1b1b1b",
        smoke: "#f1f1ed",
        porcelain: "#ffffff",
        champagne: "#e1121b",
        copper: "#b50d15",
        racing: "#e1121b",
        signal: "#e1121b",
        muted: "#66665f",
        line: "#d9d9d3"
      },
      fontFamily: {
        display: [
          "\"Oswald Variable\"",
          "\"Arial Narrow\"",
          "\"Helvetica Neue\"",
          "Arial",
          "sans-serif"
        ],
        sans: [
          "\"Inter Variable\"",
          "\"Segoe UI\"",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ]
      },
      boxShadow: {
        lift: "0 20px 48px rgba(9, 9, 9, 0.16)",
        panel: "0 8px 24px rgba(9, 9, 9, 0.08)",
        soft: "0 4px 16px rgba(9, 9, 9, 0.06)"
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-600px 0" },
          "100%": { backgroundPosition: "600px 0" }
        }
      },
      animation: {
        "fade-up": "fade-up 560ms cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 1.6s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;
