/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        status: {
          success: "var(--success)",
          "success-bg": "var(--success-bg)",
          warning: "var(--warning)",
          "warning-bg": "var(--warning-bg)",
          error: "var(--error)",
          "error-bg": "var(--error-bg)",
        },
        border: {
          DEFAULT: "var(--border)",
          focus: "var(--border-focus)",
          subtle: "var(--border-subtle)",
        },
        key: {
          bg: "var(--key-bg)",
          "bg-hover": "var(--key-bg-hover)",
          "bg-selected": "var(--key-bg-selected)",
          border: "var(--key-border)",
          "border-hover": "var(--key-border-hover)",
          "border-selected": "var(--key-border-selected)",
          shadow: "var(--key-shadow)",
          glow: "var(--key-glow)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          soft: "var(--accent-soft)",
          glow: "var(--accent-glow)",
          foreground: "var(--accent-foreground)",
        },
        active: "var(--active)",
        "text-secondary": "var(--text-secondary)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
        destructive: "var(--destructive)",
        input: "var(--input)",
        ring: "var(--ring)",
        glass: {
          bg: "var(--glass-bg)",
          border: "var(--glass-border)",
        },
        chart: {
          1: "var(--chart-1)",
          2: "var(--chart-2)",
          3: "var(--chart-3)",
          4: "var(--chart-4)",
          5: "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },
      fontFamily: {
        mono: ['"Geist Mono"', '"JetBrains Mono"', '"Fira Code"', "Consolas", "monospace"],
      },
      boxShadow: {
        key: "0 1px 2px rgba(0,0,0,0.4), 0 0 0 1px var(--key-border), inset 0 1px 0 0 var(--key-inner-glow)",
        "key-hover": "0 2px 8px rgba(0,0,0,0.3), 0 0 0 1px var(--key-border-hover), inset 0 1px 0 0 rgba(255,255,255,0.04)",
        "key-pressed": "0 0 1px rgba(0,0,0,0.4), 0 0 0 1px var(--key-border), inset 0 1px 2px rgba(0,0,0,0.3)",
        "key-selected": "0 0 0 1px var(--key-border-selected), 0 0 16px 0 var(--key-glow)",
        glass: "0 4px 24px rgba(0,0,0,0.2), 0 0 0 1px var(--glass-border)",
        glow: "0 0 20px 4px var(--accent-glow)",
      },
      transitionTimingFunction: {
        "out": "var(--ease-out)",
        "out-soft": "var(--ease-out-soft)",
        "spring": "var(--ease-spring)",
      },
      borderRadius: {
        key: "8px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
