import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FBF6EC",
        ink: "#1F2A1F",
        forest: {
          DEFAULT: "#2D5A3D",
          dark: "#1F4029",
          light: "#E4EEE6",
        },
        turmeric: {
          DEFAULT: "#E8A33D",
          dark: "#B87B22",
          light: "#FBEAD0",
        },
        clay: {
          DEFAULT: "#C1502E",
          light: "#F6DFD3",
        },
        line: "#DDD3BC",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-jakarta)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        card: "20px",
      },
    },
  },
  plugins: [],
};
export default config;
