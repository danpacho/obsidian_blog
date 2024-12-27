/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/**/*.{html,ts,tsx}',
        './node_modules/@obsidian_blogger/design_system/dist/**/*.js',
    ],
    theme: {
        extend: {},
    },
    plugins: [],
    darkMode: 'class',
}
