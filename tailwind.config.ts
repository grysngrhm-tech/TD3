import type { Config } from 'tailwindcss'

/**
 * TD3 Design Language System - Tailwind Configuration
 * 
 * This configuration extends Tailwind with TD3's design tokens.
 * CSS variables are defined in app/globals.css
 * Documentation: /docs/DESIGN_LANGUAGE.md
 */

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      /* =====================================================================
         COLORS
         Using CSS variables for dynamic light/dark mode switching
         ===================================================================== */
      colors: {
        // Accent palette (Dark Red/Maroon)
        accent: {
          50: 'var(--accent-50)',
          100: 'var(--accent-100)',
          200: 'var(--accent-200)',
          300: 'var(--accent-300)',
          400: 'var(--accent-400)',
          500: 'var(--accent-500)',
          600: 'var(--accent-600)',
          700: 'var(--accent-700)',
          800: 'var(--accent-800)',
          900: 'var(--accent-900)',
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          glow: 'var(--accent-glow)',
          muted: 'var(--accent-muted)',
        },
        // Neutral/Background colors
        background: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
          card: 'var(--bg-card)',
          hover: 'var(--bg-hover)',
          active: 'var(--bg-active)',
        },
        // Border colors
        border: {
          DEFAULT: 'var(--border)',
          subtle: 'var(--border-subtle)',
          accent: 'var(--border-accent)',
        },
        // Text colors
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          disabled: 'var(--text-disabled)',
          inverse: 'var(--text-inverse)',
        },
        // Semantic colors
        success: {
          DEFAULT: 'var(--success)',
          hover: 'var(--success-hover)',
          muted: 'var(--success-muted)',
          glow: 'var(--success-glow)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          hover: 'var(--warning-hover)',
          muted: 'var(--warning-muted)',
          glow: 'var(--warning-glow)',
        },
        error: {
          DEFAULT: 'var(--error)',
          hover: 'var(--error-hover)',
          muted: 'var(--error-muted)',
          glow: 'var(--error-glow)',
        },
        info: {
          DEFAULT: 'var(--info)',
          hover: 'var(--info-hover)',
          muted: 'var(--info-muted)',
          glow: 'var(--info-glow)',
        },
        // Complementary accent colors
        teal: {
          DEFAULT: 'var(--teal)',
          muted: 'var(--teal-muted)',
        },
        gold: {
          DEFAULT: 'var(--gold)',
          muted: 'var(--gold-muted)',
        },
        purple: {
          DEFAULT: 'var(--purple)',
          muted: 'var(--purple-muted)',
        },
        // Legacy dark mode colors (for backwards compatibility)
        dark: {
          bg: '#0A0A0B',
          'bg-secondary': '#141416',
          card: '#1C1C1F',
          border: '#3F3F46',
        },
      },

      /* =====================================================================
         TYPOGRAPHY
         ===================================================================== */
      fontFamily: {
        sans: ['var(--font-primary)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        'xs': ['var(--text-xs)', { lineHeight: '1.5' }],
        'sm': ['var(--text-sm)', { lineHeight: '1.5' }],
        'base': ['var(--text-base)', { lineHeight: '1.5' }],
        'lg': ['var(--text-lg)', { lineHeight: '1.4' }],
        'xl': ['var(--text-xl)', { lineHeight: '1.3' }],
        '2xl': ['var(--text-2xl)', { lineHeight: '1.2' }],
        '3xl': ['var(--text-3xl)', { lineHeight: '1.1' }],
        '4xl': ['var(--text-4xl)', { lineHeight: '1.1' }],
      },

      /* =====================================================================
         SPACING
         4px base unit system
         ===================================================================== */
      spacing: {
        '0.5': 'var(--space-0-5)',
        '1': 'var(--space-1)',
        '2': 'var(--space-2)',
        '3': 'var(--space-3)',
        '4': 'var(--space-4)',
        '5': 'var(--space-5)',
        '6': 'var(--space-6)',
        '8': 'var(--space-8)',
        '10': 'var(--space-10)',
        '12': 'var(--space-12)',
        '16': 'var(--space-16)',
        // Named spacing
        'header': 'var(--header-height)',
        'sidebar': 'var(--sidebar-width)',
      },

      /* =====================================================================
         BORDER RADIUS
         iOS-inspired rounded corners
         ===================================================================== */
      borderRadius: {
        'none': 'var(--radius-none)',
        'xs': 'var(--radius-xs)',
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        'full': 'var(--radius-full)',
        // Legacy iOS naming
        'ios': 'var(--radius-xl)',
        'ios-sm': 'var(--radius-lg)',
        'ios-xs': 'var(--radius-md)',
      },

      /* =====================================================================
         BOX SHADOWS
         Material Design inspired elevation system
         ===================================================================== */
      boxShadow: {
        'none': 'none',
        'elevation-1': 'var(--elevation-1)',
        'elevation-2': 'var(--elevation-2)',
        'elevation-3': 'var(--elevation-3)',
        'elevation-4': 'var(--elevation-4)',
        'elevation-5': 'var(--elevation-5)',
        'glow-accent': '0 0 20px var(--accent-glow)',
        'glow-success': '0 0 15px var(--success-glow)',
        'glow-warning': '0 0 15px var(--warning-glow)',
        'glow-error': '0 0 15px var(--error-glow)',
        'glow-info': '0 0 15px var(--info-glow)',
      },

      /* =====================================================================
         TRANSITIONS
         ===================================================================== */
      transitionDuration: {
        'instant': 'var(--duration-instant)',
        'fast': 'var(--duration-fast)',
        'normal': 'var(--duration-normal)',
        'slow': 'var(--duration-slow)',
        'slower': 'var(--duration-slower)',
        'slowest': 'var(--duration-slowest)',
      },
      transitionTimingFunction: {
        'default': 'var(--ease-default)',
        'in': 'var(--ease-in)',
        'out': 'var(--ease-out)',
        'spring': 'var(--ease-spring)',
        'bounce': 'var(--ease-bounce)',
      },

      /* =====================================================================
         ANIMATIONS
         ===================================================================== */
      animation: {
        'fade-in': 'fadeIn var(--duration-normal) var(--ease-out)',
        'fade-out': 'fadeOut var(--duration-normal) var(--ease-in)',
        'scale-in': 'scaleIn var(--duration-normal) var(--ease-out)',
        'slide-up': 'slideUp var(--duration-normal) var(--ease-out)',
        'slide-down': 'slideDown var(--duration-normal) var(--ease-out)',
        'slide-in': 'slideIn var(--duration-slow) var(--ease-out)',
        'slide-out': 'slideOut var(--duration-normal) var(--ease-in)',
        'shake': 'shake var(--duration-slow) var(--ease-default)',
        'pulse': 'pulse 2s infinite',
        'spin': 'spin 1s linear infinite',
        'shimmer': 'shimmer 1.5s infinite',
        'bounce': 'bounce 1s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOut: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-4px)' },
          '40%, 80%': { transform: 'translateX(4px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },

      /* =====================================================================
         LAYOUT
         ===================================================================== */
      maxWidth: {
        'container-sm': 'var(--container-sm)',
        'container-md': 'var(--container-md)',
        'container-lg': 'var(--container-lg)',
        'container-xl': 'var(--container-xl)',
        'container-2xl': 'var(--container-2xl)',
      },
      width: {
        'sidebar': 'var(--sidebar-width)',
      },
      height: {
        'header': 'var(--header-height)',
      },
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },

      /* =====================================================================
         Z-INDEX
         Consistent stacking order
         ===================================================================== */
      zIndex: {
        'dropdown': '10',
        'sticky': '20',
        'header': '30',
        'sidebar': '40',
        'modal': '50',
        'popover': '60',
        'tooltip': '70',
        'toast': '80',
      },
    },
  },
  plugins: [],
}

export default config
