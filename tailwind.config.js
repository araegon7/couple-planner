/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'soft-pink': '#fce7f3',
        'soft-purple': '#f3e8ff',
        'soft-blue': '#dbeafe',
        'soft-peach': '#ffedd5',
        'soft-mint': '#d1fae5',
        'rose-gold': '#fecdd3',
        'lavender': '#e9d5ff',
      }
    },
  },
  plugins: [],
}