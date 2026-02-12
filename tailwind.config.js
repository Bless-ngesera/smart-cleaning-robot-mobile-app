/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",   // important if you use src folder
  ],

  presets: [require("nativewind/preset")],

  darkMode: "class", // required for manual dark mode control

  theme: {
    extend: {
      /* ========================
         🎨 COLORS (Premium System)
      ======================== */
      colors: {
        primary: "#6366F1",
        accent: "#AB8BFF",

        background: {
          light: "#FFFFFF",
          dark: "#0B0B0F",
        },

        card: {
          light: "#F9F9FB",
          dark: "#15151C",
        },

        border: {
          light: "#E5E7EB",
          dark: "#2A2A35",
        },

        text: {
          primary: "#111827",
          secondary: "#6B7280",
          darkPrimary: "#F3F4F6",
          darkSecondary: "#9CA3AF",
        },
      },

      /* ========================
         🔤 TYPOGRAPHY
      ======================== */
      fontFamily: {
        regular: ["SF-Pro"],
        bold: ["SF-Pro-Bold"],
        medium: ["SF-Pro-Medium"],
        semibold: ["SF-Pro-Semibold"],
      },

      fontSize: {
        xs: ["12px", { lineHeight: "16px" }],
        sm: ["14px", { lineHeight: "20px" }],
        base: ["16px", { lineHeight: "24px" }],
        lg: ["18px", { lineHeight: "26px" }],
        xl: ["20px", { lineHeight: "28px" }],
        "2xl": ["24px", { lineHeight: "32px" }],
        "3xl": ["30px", { lineHeight: "38px" }],
      },

      /* ========================
         📏 SPACING (Apple feel)
      ======================== */
      spacing: {
        18: "72px",
        22: "88px",
      },

      /* ========================
         🟦 RADIUS (iOS Style)
      ======================== */
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
        "3xl": "28px",
      },

      /* ========================
         🌫 SHADOWS (Premium Depth)
      ======================== */
      shadow: {
        soft: "0 2px 8px rgba(0,0,0,0.06)",
        medium: "0 6px 16px rgba(0,0,0,0.08)",
        strong: "0 12px 24px rgba(0,0,0,0.12)",
      },
    },
  },

  nativewind: {
    inlineNativeRem: 16,
  },

  plugins: [],
};
