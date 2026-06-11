import {
  defineConfig,
  presetUno,
  presetIcons,
  presetTypography,
  presetWebFonts,
} from 'unocss';

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({
      scale: 1.2,
      warn: true,
    }),
    presetTypography(),
    presetWebFonts({
      fonts: {
        serif: 'Playfair Display',
        sans: 'Inter',
      },
    }),
  ],
  theme: {
    colors: {
      champagne: {
        50: '#FDF8E8',
        100: '#FAF0D4',
        200: '#F5E1A9',
        300: '#EFD27E',
        400: '#EAC353',
        500: '#D4AF37',
        600: '#AA8C2C',
        700: '#7F6921',
        800: '#554616',
        900: '#2A230B',
      },
      wine: {
        50: '#F4E6E7',
        100: '#E9CDD0',
        200: '#D39BA0',
        300: '#BD6971',
        400: '#A73741',
        500: '#722F37',
        600: '#5B252C',
        700: '#441C21',
        800: '#2E1216',
        900: '#17090B',
      },
      ivory: {
        50: '#FFFFFD',
        100: '#FFFFFB',
        200: '#FFFFF7',
        300: '#FFFFF3',
        400: '#FFFFEF',
        500: '#FFFFF0',
        600: '#CCCCBF',
        700: '#99998F',
        800: '#666660',
        900: '#333330',
      },
      forest: {
        50: '#E6EBEB',
        100: '#CDD7D7',
        200: '#9BAFAF',
        300: '#698787',
        400: '#375F5F',
        500: '#2F4F4F',
        600: '#263F3F',
        700: '#1C2F2F',
        800: '#132020',
        900: '#091010',
      },
    },
    fontFamily: {
      display: ['Playfair Display', 'serif'],
      body: ['Inter', 'sans-serif'],
    },
    boxShadow: {
      elegant: '0 4px 20px rgba(212, 175, 55, 0.15)',
      card: '0 2px 12px rgba(0, 0, 0, 0.08)',
      hover: '0 8px 30px rgba(212, 175, 55, 0.2)',
    },
    borderRadius: {
      xl: '12px',
      '2xl': '16px',
    },
  },
  shortcuts: {
    'card-base': 'bg-white rounded-2xl shadow-card p-6 transition-all duration-300',
    'card-hover': 'hover:shadow-hover hover:-translate-y-1',
    'btn-primary':
      'bg-gradient-to-r from-champagne-500 to-champagne-600 text-white px-6 py-2.5 rounded-xl font-medium transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95',
    'btn-secondary':
      'bg-ivory-500 text-wine-600 px-6 py-2.5 rounded-xl font-medium transition-all duration-300 hover:bg-champagne-100 border border-champagne-200',
    'btn-danger':
      'bg-wine-500 text-white px-6 py-2.5 rounded-xl font-medium transition-all duration-300 hover:bg-wine-600',
    'input-base':
      'w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-champagne-400 focus:ring-2 focus:ring-champagne-100 outline-none transition-all duration-200',
    'badge-base':
      'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
  },
});
