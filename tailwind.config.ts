import type { Config } from "tailwindcss";

export default {
	darkMode: "class", // Use only class, but your app sets [data-theme]
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
    	container: {
    		center: true,
    		padding: '1rem',
    		screens: {
    			sm: '640px',
    			md: '768px',
    			lg: '1024px',
    			xl: '1280px',
    			'2xl': '1400px'
    		}
    	},
    	extend: {
    		colors: {
    			border: 'hsl(var(--border))',
    			input: 'hsl(var(--input))',
    			ring: 'hsl(var(--ring))',
    			background: {
    				DEFAULT: 'hsl(var(--background))'
    			},
    			foreground: 'hsl(var(--foreground))',
    			primary: {
    				DEFAULT: 'hsl(var(--primary))',
    				foreground: 'hsl(var(--primary-foreground))'
    			},
    			secondary: {
    				DEFAULT: 'hsl(var(--secondary))',
    				foreground: 'hsl(var(--secondary-foreground))'
    			},
    			warning: {
    				DEFAULT: 'hsl(var(--warning))',
    				foreground: 'hsl(var(--warning-foreground))'
    			},
    			error: {
    				DEFAULT: 'hsl(var(--error))',
    				foreground: 'hsl(var(--error-foreground))'
    			},
    			success: {
    				DEFAULT: 'hsl(var(--success))',
    				foreground: 'hsl(var(--success-foreground))'
    			},
    			destructive: {
    				DEFAULT: 'hsl(var(--error))',
    				foreground: 'hsl(var(--error-foreground))'
    			},
    			muted: {
    				DEFAULT: 'hsl(var(--muted))',
    				foreground: 'hsl(var(--muted-foreground))'
    			},
    			accent: {
    				DEFAULT: 'hsl(var(--accent))',
    				foreground: 'hsl(var(--accent-foreground))'
    			},
    			popover: {
    				DEFAULT: 'hsl(var(--popover))',
    				foreground: 'hsl(var(--popover-foreground))'
    			},
    			card: {
    				DEFAULT: 'hsl(var(--card))',
    				foreground: 'hsl(var(--card-foreground))'
    			},
    			sidebar: {
    				DEFAULT: 'hsl(var(--sidebar-background))',
    				foreground: 'hsl(var(--sidebar-foreground))',
    				primary: 'hsl(var(--sidebar-primary))',
    				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
    				accent: 'hsl(var(--sidebar-accent))',
    				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
    				border: 'hsl(var(--sidebar-border))',
    				ring: 'hsl(var(--sidebar-ring))'
    			}
    		},
    		borderRadius: {
    			lg: 'var(--radius)',
    			md: 'calc(var(--radius) - 2px)',
    			sm: 'calc(var(--radius) - 4px)'
    		},
    		keyframes: {
    			'accordion-down': {
    				from: {
    					height: '0'
    				},
    				to: {
    					height: 'var(--radix-accordion-content-height)'
    				}
    			},
    			'accordion-up': {
    				from: {
    					height: 'var(--radix-accordion-content-height)'
    				},
    				to: {
    					height: '0'
    				}
    			},
    			'fade-in': {
    				from: {
    					opacity: '0'
    				},
    				to: {
    					opacity: '1'
    				}
    			},
    			'fade-out': {
    				from: {
    					opacity: '1'
    				},
    				to: {
    					opacity: '0'
    				}
    			},
    			'slide-in-right': {
    				from: {
    					transform: 'translateX(100%)'
    				},
    				to: {
    					transform: 'translateX(0)'
    				}
    			},
    			'slide-out-right': {
    				from: {
    					transform: 'translateX(0)'
    				},
    				to: {
    					transform: 'translateX(100%)'
    				}
    			},
    			'slide-in-left': {
    				from: {
    					transform: 'translateX(-100%)'
    				},
    				to: {
    					transform: 'translateX(0)'
    				}
    			},
    			'slide-out-left': {
    				from: {
    					transform: 'translateX(0)'
    				},
    				to: {
    					transform: 'translateX(-100%)'
    				}
    			},
    			'pulse-opacity': {
    				'0%, 100%': {
    					opacity: '1'
    				},
    				'50%': {
    					opacity: '0.5'
    				}
    			},
    			'gradient-flow': {
    				'0%, 100%': {
    					'background-position': '0% 50%'
    				},
    				'50%': {
    					'background-position': '100% 50%'
    				}
    			},
    			'gradient-shimmer': {
    				'0%': {
    					'background-position': '100% 0%'
    				},
    				'100%': {
    					'background-position': '-100% 0%'
    				}
    			},
    			'orbit-top': {
    				'0%': {
    					transform: 'translateX(-50%) translateY(0)'
    				},
    				'50%': {
    					transform: 'translateX(-50%) translateY(-140px)'
    				},
    				'100%': {
    					transform: 'translateX(-50%) translateY(0)'
    				}
    			},
    			'orbit-right': {
    				'0%': {
    					transform: 'translateY(-50%) translateX(0)'
    				},
    				'50%': {
    					transform: 'translateY(-50%) translateX(140px)'
    				},
    				'100%': {
    					transform: 'translateY(-50%) translateX(0)'
    				}
    			},
    			'orbit-bottom': {
    				'0%': {
    					transform: 'translateX(-50%) translateY(0)'
    				},
    				'50%': {
    					transform: 'translateX(-50%) translateY(140px)'
    				},
    				'100%': {
    					transform: 'translateX(-50%) translateY(0)'
    				}
    			},
    			'orbit-left': {
    				'0%': {
    					transform: 'translateY(-50%) translateX(0)'
    				},
    				'50%': {
    					transform: 'translateY(-50%) translateX(-140px)'
    				},
    				'100%': {
    					transform: 'translateY(-50%) translateX(0)'
    				}
    			},
    			orbit: {
    				'0%': {
    					transform: 'rotate(calc(var(--angle) * 1deg)) translateY(calc(var(--radius) * 1px)) rotate(calc(var(--angle) * -1deg))'
    				},
    				'100%': {
    					transform: 'rotate(calc(var(--angle) * 1deg + 360deg)) translateY(calc(var(--radius) * 1px)) rotate(calc((var(--angle) * -1deg) - 360deg))'
    				}
    			},
    			'orbit-item-size': {
    				'0%, 100%': {
    					transform: 'scale(var(--orbit-item-size, 1))'
    				},
    				'50%': {
    					transform: 'scale(calc(var(--orbit-item-size, 1) * 1.15))'
    				}
    			},
    			'orbit-item-opacity': {
    				'0%, 100%': {
    					opacity: '0.7'
    				},
    				'50%': {
    					opacity: '1'
    				}
    			},
    			shimmer: {
    				'100%': {
    					transform: 'translateX(100%)'
    				}
    			},
    			'grid-move': {
    				'0%': { transform: 'translateY(0)' },
    				'100%': { transform: 'translateY(24px)' }
    			},
    			'price-up': {
    				'0%': {
    					transform: 'translateY(0)',
    					opacity: '1'
    				},
    				'50%': {
    					transform: 'translateY(-4px)',
    					opacity: '0.6'
    				},
    				'100%': {
    					transform: 'translateY(0)',
    					opacity: '1'
    				}
    			},
    			'price-down': {
    				'0%': {
    					transform: 'translateY(0)',
    					opacity: '1'
    				},
    				'50%': {
    					transform: 'translateY(4px)',
    					opacity: '0.6'
    				},
    				'100%': {
    					transform: 'translateY(0)',
    					opacity: '1'
    				}
    			}
    		},
    		animation: {
    			'accordion-down': 'accordion-down 0.2s ease-out',
    			'accordion-up': 'accordion-up 0.2s ease-out',
    			'fade-in': 'fade-in 0.3s ease-out',
    			'fade-out': 'fade-out 0.3s ease-out',
    			'slide-in-right': 'slide-in-right 0.3s ease-out',
    			'slide-out-right': 'slide-out-right 0.3s ease-out',
    			'slide-in-left': 'slide-in-left 0.3s ease-out',
    			'slide-out-left': 'slide-out-left 0.3s ease-out',
    			'pulse-opacity': 'pulse-opacity 2s ease-in-out infinite',
    			'pulse-slow': 'pulse 4s ease-in-out infinite',
    			'pulse-slower': 'pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    			'pulse-slowest': 'pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    			'gradient-flow': 'gradient-flow 8s ease infinite',
    			'gradient-shimmer': 'gradient-shimmer 2s linear infinite',
    			'orbit-top': 'orbit-top 8s ease-in-out infinite',
    			'orbit-right': 'orbit-right 8s ease-in-out infinite',
    			'orbit-bottom': 'orbit-bottom 8s ease-in-out infinite',
    			'orbit-left': 'orbit-left 8s ease-in-out infinite',
    			orbit: 'orbit calc(var(--duration)*1s) linear infinite',
    			'orbit-item': 'orbit-item-size 6s infinite, orbit-item-opacity 6s infinite',
    			'orbit-slow': 'orbit 15s linear infinite',
    			'orbit-normal': 'orbit 12s linear infinite',
    			'orbit-fast': 'orbit 8s linear infinite',
    			shimmer: 'shimmer 2s linear infinite',
    			'grid-move': 'grid-move 20s linear infinite',
    			'price-up': 'price-up 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
    			'price-down': 'price-down 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
    		},        fontFamily: {
    			sans: [
    				'CircularStd',
    				'system-ui',
    				'-apple-system',
    				'BlinkMacSystemFont',
    				'Segoe UI',
    				'Roboto',
    				'sans-serif'
    			]
    		},
    		transitionDelay: {
    			'0': '0ms',
    			'100': '100ms',
    			'200': '200ms',
    			'300': '300ms',
    			'400': '400ms',
    		},
    	}
    },
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
