/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          750: '#2d3342', // Custom shade for hover rows
          800: '#1f2430',
          900: '#10141d',
        }
      }
    },
  },
  plugins: [],
}
