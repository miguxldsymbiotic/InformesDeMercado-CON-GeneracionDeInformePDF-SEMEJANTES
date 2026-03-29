/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'brand-blue': '#005DC2',
                'brand-gold': '#AD9915',
                'brand-yellow': '#FFE23E',
                'bg-main': '#f1f5f9',
                'dark-deep': '#0f172a',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
