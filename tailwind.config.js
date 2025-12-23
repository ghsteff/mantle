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
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          bright: "var(--text-bright)",
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
  plugins: [],
};
