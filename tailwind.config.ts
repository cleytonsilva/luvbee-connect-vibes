import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
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
        success: "hsl(var(--success))",
      },
      fontFamily: {
        sans: ['Space Grotesk', 'ui-sans-serif', 'system-ui'],
        mono: ['Space Mono', 'ui-monospace', 'monospace'],
        display: ['Momo Trust Display', 'cursive'],
      },
      boxShadow: {
        hard: 'var(--shadow-hard)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "party-shine": {
          "0%": {
            "text-shadow": "0 0 10px #ff00ff, 0 0 20px #ff00ff, 0 0 30px #ff00ff",
            "filter": "brightness(1) saturate(1)",
          },
          "25%": {
            "text-shadow": "0 0 15px #ff00ff, 0 0 25px #ff00ff, 0 0 35px #ff00ff, 0 0 45px #ff00ff",
            "filter": "brightness(1.2) saturate(1.3)",
          },
          "50%": {
            "text-shadow": "0 0 10px #FFFF00, 0 0 20px #FFFF00, 0 0 30px #FFFF00",
            "filter": "brightness(1.1) saturate(1.2)",
          },
          "75%": {
            "text-shadow": "0 0 15px #FFFF00, 0 0 25px #FFFF00, 0 0 35px #FFFF00, 0 0 45px #FFFF00",
            "filter": "brightness(1.2) saturate(1.3)",
          },
          "100%": {
            "text-shadow": "0 0 10px #ff00ff, 0 0 20px #ff00ff, 0 0 30px #ff00ff",
            "filter": "brightness(1) saturate(1)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "party-shine": "party-shine 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
