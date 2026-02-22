/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        'card-bg': 'var(--card-bg)',
        'border-custom': 'var(--border-color)',
      }
    },
  },
  plugins: [],
}