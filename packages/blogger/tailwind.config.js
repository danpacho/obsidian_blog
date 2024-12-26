/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        'index.html',
        './src/**/*.{ts,tsx,js,jsx,html}',
        './node_modules/@obsidian_blogger/design_system/dist/**/*.js',
    ],
    theme: {
        extend: {},
    },
    plugins: [],
    darkMode: 'class',
}
