import type { Config } from "tailwindcss";

// Tailwind CSS v4 uses CSS-based configuration
// This file is kept for compatibility but most config is now in globals.css
const config: Config = {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
};

export default config;
