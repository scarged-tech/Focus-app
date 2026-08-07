/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Fondo y superficies: negro casi puro, look "producto de gama alta"
        base: "#050505",
        night: "#0A0A0A",
        surface: "#111112",      // tarjetas
        surface2: "#18181B",     // elementos elevados / inputs
        surface3: "#232326",     // hover / estados elevados
        onyx: "#28282C",         // bordes
        dimgray: "#7A7A7F",
        silver: "#B8B8BD",
        smoke: "#F5F5F7",
        // Acento: degradado violeta -> azul cielo
        accent: "#8B5CF6",
        accent2: "#38BDF8",
        "accent-light": "#C4B5FD",
        // Semánticos (antes clases sueltas de Tailwind tipo rose-400/emerald-400)
        success: "#34D399",
        danger: "#FB7185",
        warning: "#FBBF24",
        info: "#38BDF8",
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #8B5CF6 0%, #38BDF8 100%)",
      },
      fontFamily: {
        sans: [
          "var(--font-manrope)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
