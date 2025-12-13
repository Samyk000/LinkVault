import type { Config } from "tailwindcss";

const config: Config = {
	content: [
		"./pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
	],
	darkMode: "class",
	theme: {
		extend: {
			colors: {
				brand: '#FF3E00', // International Orange
				dark: '#050505',  // Obsidian
				cardDark: '#0A0A0A',
				surface: 'var(--color-surface)',
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				interactive: 'var(--color-interactive)',
				hover: 'var(--color-hover)',
				border: 'hsl(var(--border))',
				text: 'var(--color-text)',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				chart: {
					'1': 'hsl(var(--chart-1))',
					'2': 'hsl(var(--chart-2))',
					'3': 'hsl(var(--chart-3))',
					'4': 'hsl(var(--chart-4))',
					'5': 'hsl(var(--chart-5))'
				}
			},
			fontFamily: {
				sans: ['Inter', 'sans-serif'],
				display: ['Space Grotesk', 'sans-serif'],
			},
			fontSize: {
				'xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.025em' }],
				'sm': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.025em' }],
				'base': ['1rem', { lineHeight: '1.5rem', letterSpacing: '0em' }],
				'lg': ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.025em' }],
				'xl': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.025em' }],
				'2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.05em' }],
				'3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.05em' }],
				'4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.05em' }],
				'5xl': ['3rem', { lineHeight: '1', letterSpacing: '-0.05em' }],
			},
			spacing: {
				'18': '4.5rem',
				'88': '22rem',
				'128': '32rem',
			},
			screens: {
				'xs': '475px',
				'sm': '640px',
				'md': '768px',
				'lg': '1024px',
				'xl': '1280px',
				'2xl': '1536px',
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			}
		},
		keyframes: {
			marquee: {
				'0%': { transform: 'translateX(0)' },
				'100%': { transform: 'translateX(-100%)' },
			}
		},
		animation: {
			marquee: 'marquee 25s linear infinite',
			'spin-slow': 'spin 3s linear infinite',
		}
	},
	plugins: [require("tailwindcss-animate")],
};
export default config;
