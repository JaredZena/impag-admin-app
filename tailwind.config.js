/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
  	extend: {
		borderRadius: {
			lg: 'var(--radius)',
			md: 'calc(var(--radius) - 2px)',
			sm: 'calc(var(--radius) - 4px)'
		},
		colors: {},
      screens: {
        '3xl': '1800px',
      },
      maxWidth: {
        '9xl': '1920px',
      },
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
