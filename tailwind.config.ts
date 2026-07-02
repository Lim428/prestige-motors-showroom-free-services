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
        ink: "#111111",
        graphite: "#242424",
        smoke: "#f5f2ed",
        champagne: "#d8b46a",
        copper: "#b45f3c",
        racing: "#0d5c46"
      },
      boxShadow: {
        lift: "0 24px 70px rgba(17, 17, 17, 0.12)",
        panel: "0 18px 60px rgba(17, 17, 17, 0.08)"
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
        "fade-up": "fade-up 520ms ease-out both",
        shimmer: "shimmer 1.6s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;
