import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Rail-blue: navy palette evoking Israel Railways' livery
        primary: {
          50: '#eaf2fb',
          100: '#cfe3f6',
          200: '#9fc7ed',
          300: '#6ba7e0',
          400: '#3d86ce',
          500: '#1f68b0',
          600: '#145591',
          700: '#103f6d',
          800: '#0c2e52',
          900: '#081b33',
        },
      },
    },
  },
  plugins: [],
}

export default config
