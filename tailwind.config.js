/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { canvas: '#F8F9FA', primary: '#8B5CF6', secondary: '#A78BFA', success: '#22C55E', warning: '#F59E0B', surface: '#FFFFFF' },
      boxShadow: { soft: '0 10px 30px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)', 'soft-purple': '0 8px 22px rgba(139,92,246,0.2)' },
      borderRadius: { card: '24px' }
    }
  },
  plugins: []
}
