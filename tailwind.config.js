/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}","./screens/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      height: {
        'custom': '37px',
      },
      colors: {
        primary: "#161622",
        secondary: {
          DEFAULT: "#FF9C01",
          100: "#FF9001",
          200: "#FF8E01",
        },
        black: {
          DEFAULT: "#000",
          100: "#1E1E2D",
          200: "#232533",
        },
        gray: {
          100: "#1B1B1B",
        },
        brown: "#211d1d"
      },
      fontFamily: {
        mrregular: ["Manrope-Regular", "sans-serif"],
        mrmedium: ["Manrope-Medium", "sans-serif"],
        mrsemibold: ["Manrope-SemiBold", "sans-serif"],
        mrbold: ["Manrope-Bold", "sans-serif"],
      },
    },
  },
  plugins: ["nativewind/babel"],

};