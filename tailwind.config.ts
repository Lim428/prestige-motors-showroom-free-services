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
        ink: "#171714",
        graphite: "#272621",
        smoke: "#f4f1e9",
        porcelain: "#fbfaf7",
        champagne: "#d4b56f",
        copper: "#8f452a",
        racing: "#0f5847",
        muted: "#69675f",
        line: "#ddd8cc"
      },
      fontFamily: {
        display: [
          "\"Arial Narrow\"",
          "\"Aptos Display\"",
          "\"Helvetica Neue\"",
          "Arial",
          "sans-serif"
        ],
        sans: [
          "\"Aptos\"",
          "\"Segoe UI\"",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ]
      },
      boxShadow: {
        lift: "0 28px 80px rgba(23, 23, 20, 0.14)",
        panel: "0 14px 44px rgba(23, 23, 20, 0.07)",
        soft: "0 6px 24px rgba(23, 23, 20, 0.06)"
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
