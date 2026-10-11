// Font loader utility for Google Fonts and dynamic web fonts

const SYSTEM_FONTS = new Set([
  'Arial',
  'Times New Roman',
  'Georgia',
  'Courier New',
  'Tahoma',
  'Verdana',
  'Trebuchet MS',
  'Impact',
  'Comic Sans MS',
  'Palatino',
  'Garamond',
  'Lucida Console',
  'Segoe UI',
  'Calibri',
  'Cambria',
  'Century Gothic'
])

const loadedGoogleFonts = new Set()
const pendingGoogleFonts = new Map()

export function isSystemFont(family) {
  if (!family) return false
  return SYSTEM_FONTS.has(family.trim())
}

export function isGoogleFontLoaded(family) {
  if (!family) return false
  if (isSystemFont(family)) return true
  return loadedGoogleFonts.has(family.trim())
}

/**
 * Loads a Google Font stylesheet on-demand.
 * @param {string} family - Font family name (e.g. "Roboto", "Open Sans")
 * @returns {Promise<boolean>} - Resolves to true when loaded or already available, false on error
 */
export function loadGoogleFont(family) {
  if (!family) return Promise.resolve(false)
  const cleanFamily = family.trim()
  if (isSystemFont(cleanFamily) || loadedGoogleFonts.has(cleanFamily)) {
    return Promise.resolve(true)
  }

  if (typeof document === 'undefined') {
    return Promise.resolve(false)
  }

  if (pendingGoogleFonts.has(cleanFamily)) {
    return pendingGoogleFonts.get(cleanFamily)
  }

  const safeId = `gfont-${cleanFamily.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
  const existing = document.getElementById(safeId)
  if (existing) {
    loadedGoogleFonts.add(cleanFamily)
    return Promise.resolve(true)
  }

  const promise = new Promise((resolve) => {
    try {
      const link = document.createElement('link')
      link.id = safeId
      link.rel = 'stylesheet'
      const encoded = cleanFamily.replace(/\s+/g, '+')
      link.href = `https://fonts.googleapis.com/css2?family=${encoded}:ital,wght@0,300;0,400;0,500;0,700;1,400;1,700&display=swap`

      // Fallback for fonts that don't support the full weight axis (e.g., some display fonts)
      let resolved = false
      const onDone = (success) => {
        if (resolved) return
        resolved = true
        pendingGoogleFonts.delete(cleanFamily)
        if (success) {
          loadedGoogleFonts.add(cleanFamily)
        }
        resolve(success)
      }

      link.onload = () => onDone(true)
      link.onerror = () => {
        // Retry with simple &display=swap without weights
        link.remove()
        const simpleLink = document.createElement('link')
        simpleLink.id = safeId
        simpleLink.rel = 'stylesheet'
        simpleLink.href = `https://fonts.googleapis.com/css2?family=${encoded}&display=swap`
        simpleLink.onload = () => onDone(true)
        simpleLink.onerror = () => onDone(false)
        document.head.appendChild(simpleLink)
      }

      document.head.appendChild(link)
    } catch {
      pendingGoogleFonts.delete(cleanFamily)
      resolve(false)
    }
  })

  pendingGoogleFonts.set(cleanFamily, promise)
  return promise
}
