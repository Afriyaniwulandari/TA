/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#0F172A",     // Slate 900 (Biru Tua Sangat Gelap)
          navy: "#1E3A8A",     // Blue 900 (Biru Laut Tua)
          cobalt: "#3B82F6",   // Blue 500 (Biru Kobalt Terang)
          accent: "#06B6D4",   // Cyan 500 (Aksen Garam/Laut)
          accentHover: "#0891B2",
          light: "#F8FAFC",    // Slate 50 (Abu-abu sangat muda/Putih)
          grayLight: "#F1F5F9",// Slate 100
          grayMedium: "#E2E8F0",// Slate 200 (Garis batas)
          grayDark: "#64748B",  // Slate 500 (Teks sekunder)
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in': 'slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-subtle': 'pulseSubtle 2s infinite ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85', transform: 'scale(1.01)' },
        }
      }
    },
  },
  plugins: [],
}
