/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        bounceBar: {
          "0%,100%": { height: "15px" },
          "50%": { height: "60px" },
        },
      },
      animation: {
        "bounce-bar": "bounceBar 1s infinite",
      },
    },
  },
  plugins: [],
};
