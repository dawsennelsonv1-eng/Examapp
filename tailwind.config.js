/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "menfp-navy": "#0f172a",
        "menfp-indigo": "#4f46e5",
        "menfp-gold": "#f59e0b",
      },
    },
  },
  plugins: [],
};
