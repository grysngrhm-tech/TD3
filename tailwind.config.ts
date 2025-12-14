import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // TD3 Brand Colors
        primary: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fb',
          400: '#36aaf5',
          500: '#0c8ee6',
          600: '#0070c4',
          700: '#015a9f',
          800: '#064c83',
          900: '#0b406d',
        },
        accent: {
          50: '#fdf8ef',
          100: '#faefd9',
          200: '#f4dbb2',
          300: '#edc281',
          400: '#e4a04e',
          500: '#dc8429',
          600: '#cd6a1f',
          700: '#aa501c',
          800: '#88411e',
          900: '#6f371b',
        },
      },
    },
  },
  plugins: [],
}
export default config

