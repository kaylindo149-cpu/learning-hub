import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#fffdf0",
        ink: "#2a1f29",
        clay: "#ff6b87",
        sage: "#48a85d",
        sprout: "#b8f46f",
        mint: "#d8ffd1",
        butter: "#fff27a",
        plum: "#2a1f29"
      },
      fontFamily: {
        sans: ["Inter", "Arial", "sans-serif"],
        serif: ["Georgia", "serif"],
        display: [
          "\"Arial Rounded MT Bold\"",
          "\"Avenir Next Rounded\"",
          "\"Arial Black\"",
          "Inter",
          "sans-serif"
        ]
      },
      boxShadow: {
        soft: "0 24px 80px rgba(42, 31, 41, 0.14)"
      }
    }
  },
  plugins: []
};

export default config;
