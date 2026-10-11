import fs from 'node:fs'
import path from 'node:path'

const systemFonts = [
  {
    family: 'Arial',
    displayName: 'Arial',
    category: 'System',
    source: 'system',
    isDefault: true,
    hasSubmenu: true,
    variants: [
      { name: 'Regular', fontFamily: 'Arial', weight: '400', style: 'normal' },
      { name: 'Bold', fontFamily: 'Arial', weight: '700', style: 'normal' },
      { name: 'Italic', fontFamily: 'Arial', weight: '400', style: 'italic' },
      { name: 'Bold Italic', fontFamily: 'Arial', weight: '700', style: 'italic' }
    ]
  },
  {
    family: 'Times New Roman',
    displayName: 'Times New Roman',
    category: 'System',
    source: 'system',
    isDefault: false,
    hasSubmenu: true,
    variants: [
      { name: 'Regular', fontFamily: 'Times New Roman', weight: '400', style: 'normal' },
      { name: 'Bold', fontFamily: 'Times New Roman', weight: '700', style: 'normal' },
      { name: 'Italic', fontFamily: 'Times New Roman', weight: '400', style: 'italic' },
      { name: 'Bold Italic', fontFamily: 'Times New Roman', weight: '700', style: 'italic' }
    ]
  },
  {
    family: 'Georgia',
    displayName: 'Georgia',
    category: 'System',
    source: 'system',
    isDefault: false,
    hasSubmenu: true,
    variants: [
      { name: 'Regular', fontFamily: 'Georgia', weight: '400', style: 'normal' },
      { name: 'Bold', fontFamily: 'Georgia', weight: '700', style: 'normal' },
      { name: 'Italic', fontFamily: 'Georgia', weight: '400', style: 'italic' },
      { name: 'Bold Italic', fontFamily: 'Georgia', weight: '700', style: 'italic' }
    ]
  },
  {
    family: 'Courier New',
    displayName: 'Courier New',
    category: 'System',
    source: 'system',
    isDefault: false,
    hasSubmenu: true,
    variants: [
      { name: 'Regular', fontFamily: 'Courier New', weight: '400', style: 'normal' },
      { name: 'Bold', fontFamily: 'Courier New', weight: '700', style: 'normal' },
      { name: 'Italic', fontFamily: 'Courier New', weight: '400', style: 'italic' },
      { name: 'Bold Italic', fontFamily: 'Courier New', weight: '700', style: 'italic' }
    ]
  },
  {
    family: 'Tahoma',
    displayName: 'Tahoma',
    category: 'System',
    source: 'system',
    isDefault: false,
    hasSubmenu: true,
    variants: [
      { name: 'Regular', fontFamily: 'Tahoma', weight: '400', style: 'normal' },
      { name: 'Bold', fontFamily: 'Tahoma', weight: '700', style: 'normal' }
    ]
  },
  {
    family: 'Verdana',
    displayName: 'Verdana',
    category: 'System',
    source: 'system',
    isDefault: false,
    hasSubmenu: true,
    variants: [
      { name: 'Regular', fontFamily: 'Verdana', weight: '400', style: 'normal' },
      { name: 'Bold', fontFamily: 'Verdana', weight: '700', style: 'normal' },
      { name: 'Italic', fontFamily: 'Verdana', weight: '400', style: 'italic' },
      { name: 'Bold Italic', fontFamily: 'Verdana', weight: '700', style: 'italic' }
    ]
  },
  {
    family: 'Trebuchet MS',
    displayName: 'Trebuchet MS',
    category: 'System',
    source: 'system',
    isDefault: false,
    hasSubmenu: true,
    variants: [
      { name: 'Regular', fontFamily: 'Trebuchet MS', weight: '400', style: 'normal' },
      { name: 'Bold', fontFamily: 'Trebuchet MS', weight: '700', style: 'normal' },
      { name: 'Italic', fontFamily: 'Trebuchet MS', weight: '400', style: 'italic' }
    ]
  },
  {
    family: 'Impact',
    displayName: 'Impact',
    category: 'System',
    source: 'system',
    isDefault: false,
    hasSubmenu: false,
    variants: [
      { name: 'Regular', fontFamily: 'Impact', weight: '400', style: 'normal' }
    ]
  },
  {
    family: 'Comic Sans MS',
    displayName: 'Comic Sans MS',
    category: 'System',
    source: 'system',
    isDefault: false,
    hasSubmenu: true,
    variants: [
      { name: 'Regular', fontFamily: 'Comic Sans MS', weight: '400', style: 'normal' },
      { name: 'Bold', fontFamily: 'Comic Sans MS', weight: '700', style: 'normal' }
    ]
  },
  {
    family: 'Palatino',
    displayName: 'Palatino',
    category: 'System',
    source: 'system',
    isDefault: false,
    hasSubmenu: true,
    variants: [
      { name: 'Regular', fontFamily: 'Palatino', weight: '400', style: 'normal' },
      { name: 'Bold', fontFamily: 'Palatino', weight: '700', style: 'normal' },
      { name: 'Italic', fontFamily: 'Palatino', weight: '400', style: 'italic' }
    ]
  },
  {
    family: 'Garamond',
    displayName: 'Garamond',
    category: 'System',
    source: 'system',
    isDefault: false,
    hasSubmenu: true,
    variants: [
      { name: 'Regular', fontFamily: 'Garamond', weight: '400', style: 'normal' },
      { name: 'Bold', fontFamily: 'Garamond', weight: '700', style: 'normal' },
      { name: 'Italic', fontFamily: 'Garamond', weight: '400', style: 'italic' }
    ]
  },
  {
    family: 'Lucida Console',
    displayName: 'Lucida Console',
    category: 'System',
    source: 'system',
    isDefault: false,
    hasSubmenu: false,
    variants: [
      { name: 'Regular', fontFamily: 'Lucida Console', weight: '400', style: 'normal' }
    ]
  },
  {
    family: 'Segoe UI',
    displayName: 'Segoe UI',
    category: 'System',
    source: 'system',
    isDefault: false,
    hasSubmenu: true,
    variants: [
      { name: 'Light', fontFamily: 'Segoe UI', weight: '300', style: 'normal' },
      { name: 'Regular', fontFamily: 'Segoe UI', weight: '400', style: 'normal' },
      { name: 'SemiBold', fontFamily: 'Segoe UI', weight: '600', style: 'normal' },
      { name: 'Bold', fontFamily: 'Segoe UI', weight: '700', style: 'normal' }
    ]
  },
  {
    family: 'Calibri',
    displayName: 'Calibri',
    category: 'System',
    source: 'system',
    isDefault: false,
    hasSubmenu: true,
    variants: [
      { name: 'Light', fontFamily: 'Calibri', weight: '300', style: 'normal' },
      { name: 'Regular', fontFamily: 'Calibri', weight: '400', style: 'normal' },
      { name: 'Bold', fontFamily: 'Calibri', weight: '700', style: 'normal' },
      { name: 'Italic', fontFamily: 'Calibri', weight: '400', style: 'italic' }
    ]
  }
]

const standardWeights = [
  { name: 'Regular', weight: '400', style: 'normal' },
  { name: 'Bold', weight: '700', style: 'normal' },
  { name: 'Italic', weight: '400', style: 'italic' },
  { name: 'Bold Italic', weight: '700', style: 'italic' }
]

const fullWeights = [
  { name: 'Light', weight: '300', style: 'normal' },
  { name: 'Regular', weight: '400', style: 'normal' },
  { name: 'Medium', weight: '500', style: 'normal' },
  { name: 'SemiBold', weight: '600', style: 'normal' },
  { name: 'Bold', weight: '700', style: 'normal' },
  { name: 'ExtraBold', weight: '800', style: 'normal' }
]

const singleWeight = [
  { name: 'Regular', weight: '400', style: 'normal' }
]

const googleFontDefs = [
  // Sans-serif
  { family: 'Roboto', category: 'Sans Serif', weights: fullWeights },
  { family: 'Open Sans', category: 'Sans Serif', weights: fullWeights },
  { family: 'Montserrat', category: 'Sans Serif', weights: fullWeights },
  { family: 'Lato', category: 'Sans Serif', weights: fullWeights },
  { family: 'Poppins', category: 'Sans Serif', weights: fullWeights },
  { family: 'Inter', category: 'Sans Serif', weights: fullWeights },
  { family: 'Oswald', category: 'Sans Serif', weights: fullWeights },
  { family: 'Raleway', category: 'Sans Serif', weights: fullWeights },
  { family: 'Nunito', category: 'Sans Serif', weights: fullWeights },
  { family: 'Rubik', category: 'Sans Serif', weights: fullWeights },
  { family: 'PT Sans', category: 'Sans Serif', weights: standardWeights },
  { family: 'Ubuntu', category: 'Sans Serif', weights: standardWeights },
  { family: 'Work Sans', category: 'Sans Serif', weights: fullWeights },
  { family: 'DM Sans', category: 'Sans Serif', weights: fullWeights },
  { family: 'Plus Jakarta Sans', category: 'Sans Serif', weights: fullWeights },
  { family: 'Quicksand', category: 'Sans Serif', weights: fullWeights },
  { family: 'Heebo', category: 'Sans Serif', weights: fullWeights },
  { family: 'Kanit', category: 'Sans Serif', weights: fullWeights },
  { family: 'Titillium Web', category: 'Sans Serif', weights: fullWeights },
  { family: 'Josefin Sans', category: 'Sans Serif', weights: fullWeights },
  { family: 'Cabin', category: 'Sans Serif', weights: standardWeights },
  { family: 'Dosis', category: 'Sans Serif', weights: fullWeights },
  { family: 'Oxygen', category: 'Sans Serif', weights: standardWeights },
  { family: 'Prompt', category: 'Sans Serif', weights: fullWeights },
  { family: 'Barlow', category: 'Sans Serif', weights: fullWeights },
  { family: 'Outfit', category: 'Sans Serif', weights: fullWeights },
  { family: 'Figtree', category: 'Sans Serif', weights: fullWeights },
  { family: 'Manrope', category: 'Sans Serif', weights: fullWeights },
  { family: 'Lexend', category: 'Sans Serif', weights: fullWeights },
  { family: 'Archivo', category: 'Sans Serif', weights: fullWeights },
  { family: 'Overpass', category: 'Sans Serif', weights: fullWeights },
  { family: 'Fira Sans', category: 'Sans Serif', weights: fullWeights },
  { family: 'Mukta', category: 'Sans Serif', weights: fullWeights },
  { family: 'Nanum Gothic', category: 'Sans Serif', weights: standardWeights },
  { family: 'Karla', category: 'Sans Serif', weights: fullWeights },
  { family: 'Public Sans', category: 'Sans Serif', weights: fullWeights },
  { family: 'Urbanist', category: 'Sans Serif', weights: fullWeights },
  { family: 'Mulish', category: 'Sans Serif', weights: fullWeights },
  { family: 'Red Hat Display', category: 'Sans Serif', weights: fullWeights },
  { family: 'Exo 2', category: 'Sans Serif', weights: fullWeights },
  { family: 'Asap', category: 'Sans Serif', weights: standardWeights },
  { family: 'Maven Pro', category: 'Sans Serif', weights: fullWeights },
  { family: 'Signika', category: 'Sans Serif', weights: standardWeights },
  { family: 'Catamaran', category: 'Sans Serif', weights: fullWeights },
  { family: 'Hind', category: 'Sans Serif', weights: standardWeights },
  { family: 'Questrial', category: 'Sans Serif', weights: singleWeight },
  { family: 'ABeeZee', category: 'Sans Serif', weights: singleWeight },
  { family: 'Varela Round', category: 'Sans Serif', weights: singleWeight },
  { family: 'Nunito Sans', category: 'Sans Serif', weights: fullWeights },
  { family: 'Jost', category: 'Sans Serif', weights: fullWeights },
  { family: 'Sora', category: 'Sans Serif', weights: fullWeights },
  { family: 'Syne', category: 'Sans Serif', weights: fullWeights },
  { family: 'Space Grotesk', category: 'Sans Serif', weights: fullWeights },
  { family: 'Be Vietnam Pro', category: 'Sans Serif', weights: fullWeights },
  { family: 'Epilogue', category: 'Sans Serif', weights: fullWeights },
  { family: 'General Sans', category: 'Sans Serif', weights: fullWeights },
  { family: 'Readex Pro', category: 'Sans Serif', weights: fullWeights },
  { family: 'Albert Sans', category: 'Sans Serif', weights: fullWeights },
  { family: 'Bricolage Grotesque', category: 'Sans Serif', weights: fullWeights },
  { family: 'Instrument Sans', category: 'Sans Serif', weights: fullWeights },
  { family: 'Chivo', category: 'Sans Serif', weights: fullWeights },
  { family: 'Onest', category: 'Sans Serif', weights: fullWeights },
  { family: 'Hanken Grotesk', category: 'Sans Serif', weights: fullWeights },
  { family: 'Geist', category: 'Sans Serif', weights: fullWeights },

  // Serif
  { family: 'Merriweather', category: 'Serif', weights: standardWeights },
  { family: 'Playfair Display', category: 'Serif', weights: fullWeights },
  { family: 'Lora', category: 'Serif', weights: standardWeights },
  { family: 'PT Serif', category: 'Serif', weights: standardWeights },
  { family: 'Roboto Slab', category: 'Serif', weights: fullWeights },
  { family: 'Bitter', category: 'Serif', weights: fullWeights },
  { family: 'Libre Baskerville', category: 'Serif', weights: standardWeights },
  { family: 'Cormorant Garamond', category: 'Serif', weights: fullWeights },
  { family: 'EB Garamond', category: 'Serif', weights: fullWeights },
  { family: 'Cinzel', category: 'Serif', weights: fullWeights },
  { family: 'Arvo', category: 'Serif', weights: standardWeights },
  { family: 'Spectral', category: 'Serif', weights: fullWeights },
  { family: 'Domine', category: 'Serif', weights: fullWeights },
  { family: 'Bodoni Moda', category: 'Serif', weights: fullWeights },
  { family: 'Cardo', category: 'Serif', weights: standardWeights },
  { family: 'Frank Ruhl Libre', category: 'Serif', weights: fullWeights },
  { family: 'Castoro', category: 'Serif', weights: singleWeight },
  { family: 'Prata', category: 'Serif', weights: singleWeight },
  { family: 'Newsreader', category: 'Serif', weights: fullWeights },
  { family: 'Faustina', category: 'Serif', weights: fullWeights },
  { family: 'Vollkorn', category: 'Serif', weights: fullWeights },
  { family: 'Source Serif 4', category: 'Serif', weights: fullWeights },
  { family: 'Zilla Slab', category: 'Serif', weights: fullWeights },
  { family: 'Bree Serif', category: 'Serif', weights: singleWeight },
  { family: 'Crimson Text', category: 'Serif', weights: standardWeights },
  { family: 'Crimson Pro', category: 'Serif', weights: fullWeights },
  { family: 'Libre Bodoni', category: 'Serif', weights: standardWeights },
  { family: 'Marcellus', category: 'Serif', weights: singleWeight },
  { family: 'DM Serif Display', category: 'Serif', weights: singleWeight },
  { family: 'DM Serif Text', category: 'Serif', weights: singleWeight },
  { family: 'Old Standard TT', category: 'Serif', weights: standardWeights },
  { family: 'Fraunces', category: 'Serif', weights: fullWeights },
  { family: 'Besley', category: 'Serif', weights: fullWeights },
  { family: 'Young Serif', category: 'Serif', weights: singleWeight },
  { family: 'Instrument Serif', category: 'Serif', weights: singleWeight },
  { family: 'Gilda Display', category: 'Serif', weights: singleWeight },
  { family: 'Rozha One', category: 'Serif', weights: singleWeight },
  { family: 'Alice', category: 'Serif', weights: singleWeight },
  { family: 'Lustria', category: 'Serif', weights: singleWeight },

  // Display
  { family: 'Anton', category: 'Display', weights: singleWeight },
  { family: 'Lobster', category: 'Display', weights: singleWeight },
  { family: 'Pacifico', category: 'Display', weights: singleWeight },
  { family: 'Righteous', category: 'Display', weights: singleWeight },
  { family: 'Bangers', category: 'Display', weights: singleWeight },
  { family: 'Bungee', category: 'Display', weights: singleWeight },
  { family: 'Permanent Marker', category: 'Display', weights: singleWeight },
  { family: 'Abril Fatface', category: 'Display', weights: singleWeight },
  { family: 'Alfa Slab One', category: 'Display', weights: singleWeight },
  { family: 'Bebas Neue', category: 'Display', weights: singleWeight },
  { family: 'Passion One', category: 'Display', weights: standardWeights },
  { family: 'Comfortaa', category: 'Display', weights: fullWeights },
  { family: 'Fredoka', category: 'Display', weights: fullWeights },
  { family: 'Monoton', category: 'Display', weights: singleWeight },
  { family: 'Faster One', category: 'Display', weights: singleWeight },
  { family: 'Creepster', category: 'Display', weights: singleWeight },
  { family: 'Special Elite', category: 'Display', weights: singleWeight },
  { family: 'Black Ops One', category: 'Display', weights: singleWeight },
  { family: 'Shrikhand', category: 'Display', weights: singleWeight },
  { family: 'Audiowide', category: 'Display', weights: singleWeight },
  { family: 'Titan One', category: 'Display', weights: singleWeight },
  { family: 'Luckiest Guy', category: 'Display', weights: singleWeight },
  { family: 'Ultra', category: 'Display', weights: singleWeight },
  { family: 'Ruslan Display', category: 'Display', weights: singleWeight },
  { family: 'Press Start 2P', category: 'Display', weights: singleWeight },
  { family: 'Silkscreen', category: 'Display', weights: singleWeight },
  { family: 'Rubik Glitch', category: 'Display', weights: singleWeight },
  { family: 'Bungee Shade', category: 'Display', weights: singleWeight },
  { family: 'Bungee Inline', category: 'Display', weights: singleWeight },
  { family: 'Chango', category: 'Display', weights: singleWeight },
  { family: 'Shojumaru', category: 'Display', weights: singleWeight },
  { family: 'Smokum', category: 'Display', weights: singleWeight },
  { family: 'Rye', category: 'Display', weights: singleWeight },
  { family: 'Sancreek', category: 'Display', weights: singleWeight },
  { family: 'Megrim', category: 'Display', weights: singleWeight },
  { family: 'Plaster', category: 'Display', weights: singleWeight },
  { family: 'Vast Shadow', category: 'Display', weights: singleWeight },
  { family: 'Wallpoet', category: 'Display', weights: singleWeight },
  { family: 'Trade Winds', category: 'Display', weights: singleWeight },
  { family: 'Big Shoulders Display', category: 'Display', weights: fullWeights },

  // Handwriting
  { family: 'Dancing Script', category: 'Handwriting', weights: fullWeights },
  { family: 'Caveat', category: 'Handwriting', weights: fullWeights },
  { family: 'Shadows Into Light', category: 'Handwriting', weights: singleWeight },
  { family: 'Indie Flower', category: 'Handwriting', weights: singleWeight },
  { family: 'Kalam', category: 'Handwriting', weights: standardWeights },
  { family: 'Satisfy', category: 'Handwriting', weights: singleWeight },
  { family: 'Sacramento', category: 'Handwriting', weights: singleWeight },
  { family: 'Great Vibes', category: 'Handwriting', weights: singleWeight },
  { family: 'Kaushan Script', category: 'Handwriting', weights: singleWeight },
  { family: 'Courgette', category: 'Handwriting', weights: singleWeight },
  { family: 'Yellowtail', category: 'Handwriting', weights: singleWeight },
  { family: 'Marck Script', category: 'Handwriting', weights: singleWeight },
  { family: 'Oleo Script', category: 'Handwriting', weights: standardWeights },
  { family: 'Berkshire Swash', category: 'Handwriting', weights: singleWeight },
  { family: 'Cookie', category: 'Handwriting', weights: singleWeight },
  { family: 'Gloria Hallelujah', category: 'Handwriting', weights: singleWeight },
  { family: 'Alex Brush', category: 'Handwriting', weights: singleWeight },
  { family: 'Allura', category: 'Handwriting', weights: singleWeight },
  { family: 'Amatic SC', category: 'Handwriting', weights: standardWeights },
  { family: 'Bad Script', category: 'Handwriting', weights: singleWeight },
  { family: 'Covered By Your Grace', category: 'Handwriting', weights: singleWeight },
  { family: 'Damion', category: 'Handwriting', weights: singleWeight },
  { family: 'Gochi Hand', category: 'Handwriting', weights: singleWeight },
  { family: 'Homemade Apple', category: 'Handwriting', weights: singleWeight },
  { family: 'Just Another Hand', category: 'Handwriting', weights: singleWeight },
  { family: 'Kristi', category: 'Handwriting', weights: singleWeight },
  { family: 'Patrick Hand', category: 'Handwriting', weights: singleWeight },
  { family: 'Reenie Beanie', category: 'Handwriting', weights: singleWeight },
  { family: 'Rock Salt', category: 'Handwriting', weights: singleWeight },
  { family: 'Rouge Script', category: 'Handwriting', weights: singleWeight },
  { family: 'Sriracha', category: 'Handwriting', weights: singleWeight },
  { family: 'Tangerine', category: 'Handwriting', weights: singleWeight },
  { family: 'Walter Turncoat', category: 'Handwriting', weights: singleWeight },
  { family: 'Zeyada', category: 'Handwriting', weights: singleWeight },

  // Monospace
  { family: 'Inconsolata', category: 'Monospace', weights: fullWeights },
  { family: 'Roboto Mono', category: 'Monospace', weights: fullWeights },
  { family: 'Source Code Pro', category: 'Monospace', weights: fullWeights },
  { family: 'Space Mono', category: 'Monospace', weights: standardWeights },
  { family: 'Fira Code', category: 'Monospace', weights: fullWeights },
  { family: 'IBM Plex Mono', category: 'Monospace', weights: fullWeights },
  { family: 'JetBrains Mono', category: 'Monospace', weights: fullWeights },
  { family: 'VT323', category: 'Monospace', weights: singleWeight },
  { family: 'Courier Prime', category: 'Monospace', weights: standardWeights },
  { family: 'Cutive Mono', category: 'Monospace', weights: singleWeight },
  { family: 'Share Tech Mono', category: 'Monospace', weights: singleWeight },
  { family: 'Overpass Mono', category: 'Monospace', weights: fullWeights },
  { family: 'Anonymous Pro', category: 'Monospace', weights: standardWeights },
  { family: 'Ubuntu Mono', category: 'Monospace', weights: standardWeights },
  { family: 'Major Mono Display', category: 'Monospace', weights: singleWeight },
  { family: 'Nova Mono', category: 'Monospace', weights: singleWeight },
  { family: 'Syne Mono', category: 'Monospace', weights: singleWeight },
  { family: 'Red Hat Mono', category: 'Monospace', weights: fullWeights },
  { family: 'Azeret Mono', category: 'Monospace', weights: fullWeights },
  { family: 'Spline Sans Mono', category: 'Monospace', weights: fullWeights }
]

const googleFonts = googleFontDefs.map(def => {
  const variants = def.weights.map(w => ({
    name: w.name,
    fontFamily: def.family,
    weight: w.weight,
    style: w.style
  }))
  return {
    family: def.family,
    displayName: def.family,
    category: def.category,
    source: 'google',
    isDefault: false,
    hasSubmenu: variants.length > 1,
    variants
  }
})

const catalog = [...systemFonts, ...googleFonts]
const outPath = path.resolve('src/google-fonts-catalog.json')
fs.writeFileSync(outPath, JSON.stringify(catalog, null, 2))
console.log(`Successfully generated ${catalog.length} fonts in ${outPath}`)
