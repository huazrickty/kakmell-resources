/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Design tokens (Phase 1 UI overhaul) ─────────────────────────
        // Red is for primary CTAs, destructive confirms and critical status
        // ONLY — never decoration. Focus rings use ink, not red.
        bg:        "#FAFAF8",
        surface:   "#FFFFFF",
        ink: {
          DEFAULT: "#111111",
          soft:    "#55524E",
        },
        line:      "#E8E6E2",
        ok:        "#1E7F4F",
        warn:      "#B45309",
        danger:    "#C4202A",

        // ── Legacy shadcn tokens (existing pages/components) ─────────────
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          // Token: logo red. foreground kept for legacy shadcn usage.
          DEFAULT: "#C4202A",
          hi:      "#A81B24",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
        },
      },
      fontFamily: {
        sans: ["Geist Variable", "ui-sans-serif", "system-ui", "sans-serif"],
        heading: ["Geist Variable", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // The only two shadows in the design system
        card:     "0 1px 2px 0 rgb(17 17 17 / 0.05)",
        elevated: "0 8px 30px rgb(17 17 17 / 0.14)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "sheet-up": {
          from: { transform: "translateY(100%)" },
          to:   { transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
      },
      animation: {
        "sheet-up": "sheet-up 0.22s cubic-bezier(0.32, 0.72, 0, 1)",
        "fade-in":  "fade-in 0.15s ease-out",
      },
    },
  },
  plugins: [],
}
