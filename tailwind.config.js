/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
          tertiary: "var(--bg-tertiary)",
          hover: "var(--bg-hover)",
          active: "var(--bg-active)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          muted: "var(--accent-muted)",
          foreground: "var(--accent-foreground)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          bright: "var(--text-bright)",
          "on-accent": "var(--text-on-accent)",
        },
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
        },
        key: {
          bg: "var(--key-bg)",
          "bg-hover": "var(--key-bg-hover)",
          "bg-selected": "var(--key-bg-selected)",
          border: "var(--key-border)",
          shadow: "var(--key-shadow)",
        },
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
        mono: ['"JetBrains Mono"', '"Fira Code"', "Consolas", "monospace"],
      },
      boxShadow: {
        key: "0 2px 0 0 var(--key-shadow), inset 0 -2px 0 0 rgba(0,0,0,0.2)",
        "key-pressed":
          "0 1px 0 0 var(--key-shadow), inset 0 -1px 0 0 rgba(0,0,0,0.2)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
