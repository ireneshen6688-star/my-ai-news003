import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary: soft indigo-violet (温和版 Lovable)
        primary: {
          DEFAULT: '#7C6FF7',
          50:  '#F3F2FE',
          100: '#E8E6FD',
          200: '#CCC9FB',
          300: '#AEA8F8',
          400: '#9188F7',
          500: '#7C6FF7',
          600: '#6355E8',
          700: '#4E41D0',
          800: '#3C31A8',
          900: '#2B2278',
        },
        // Accent: soft rose-pink
        accent: {
          DEFAULT: '#F07CA0',
          50:  '#FEF2F6',
          100: '#FCE4EE',
          200: '#F9C3D5',
          300: '#F5A0BC',
          400: '#F28DAE',
          500: '#F07CA0',
          600: '#E05882',
          700: '#C83D67',
          800: '#A02E50',
          900: '#7A2039',
        },
        // Warm neutral background
        background: '#FAF9FF',
        surface: '#FFFFFF',
        muted: '#F4F3FC',
        border: '#EAE8FB',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'soft':  '0 2px 16px 0 rgba(124,111,247,0.08)',
        'card':  '0 4px 24px 0 rgba(124,111,247,0.10)',
        'glow':  '0 0 40px 0 rgba(124,111,247,0.18)',
      },
      backgroundImage: {
        // Lovable-style soft gradient — toned down version
        'hero-gradient': 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(185,179,255,0.45) 0%, rgba(240,124,160,0.20) 50%, transparent 80%), linear-gradient(180deg, #FAF9FF 60%, #F4F3FC 100%)',
        'card-gradient': 'linear-gradient(135deg, #FFFFFF 0%, #F8F7FF 100%)',
        'pill-gradient': 'linear-gradient(90deg, #7C6FF7, #F07CA0)',
      },
    },
  },
  plugins: [],
};
export default config;
