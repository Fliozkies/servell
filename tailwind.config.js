/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}", // Expo Router's app dir
    "./components/**/*.{js,jsx,ts,tsx}", // if you have a components folder
    // Add any other paths where you use className, e.g. "./src/**/*.{js,jsx,ts,tsx}"
    "./app/*.{js,jsx,ts,tsx}",
  ],
  presets: [
    require("nativewind/preset"), // ← This line is REQUIRED
  ],
  theme: {
    extend: {
      // your custom theme extensions here if any
    },
  },
  plugins: [],
};
