<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import defaultCatalog from './urdu-fonts-catalog.json' with { type: 'json' }

const props = defineProps({
  modelValue: {
    type: String,
    default: 'Jameel Noori Nastaleeq'
  },
  fonts: {
    type: Array,
    default: () => []
  },
  documentFonts: {
    type: Array,
    default: () => ['Jameel Noori Nastaleeq', 'Faiz Lahori Nastaleeq', 'Noto Nastaliq Urdu']
  },
  editor: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const isOpen = ref(false)
const searchQuery = ref('')
const highlightedIndex = ref(0)
const triggerRef = ref(null)
const searchInputRef = ref(null)
const dropdownRef = ref(null)
const listContainerRef = ref(null)

// Submenu state
const activeSubmenuFamily = ref(null)
const submenuHighlightedIndex = ref(0)
const isHoveringSubmenu = ref(false)
const submenuStyle = ref({ top: '0px', left: '0px' })

const dropdownStyle = ref({
  top: '0px',
  left: '0px',
  width: '380px'
})

// Two-word selection or fallback to 'سلام علیکم!'
const previewText = ref('سلام علیکم!')

function getSelectionPreview() {
  let selected = ''
  try {
    const winSel = typeof window !== 'undefined' ? window.getSelection()?.toString() : ''
    if (winSel && winSel.trim()) {
      selected = winSel.trim()
    } else if (props.editor && props.editor.state && !props.editor.state.selection?.empty) {
      const { from, to } = props.editor.state.selection
      selected = props.editor.state.doc.textBetween(from, to, ' ').trim()
    }
  } catch {}

  if (selected) {
    const words = selected.split(/\s+/).filter(Boolean)
    if (words.length > 0) {
      return words.slice(0, 2).join(' ')
    }
  }
  return 'سلام علیکم!'
}

function refreshPreview() {
  previewText.value = getSelectionPreview()
}

// -------------------------------------------------------------
// Catalog & Filtering
// -------------------------------------------------------------
const allFamilies = computed(() => {
  return defaultCatalog
})

const filteredFamilies = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return allFamilies.value
  return allFamilies.value.filter(item => {
    if (item.displayName.toLowerCase().includes(q) || item.family.toLowerCase().includes(q)) {
      return true
    }
    if (item.variants && item.variants.some(v => v.name.toLowerCase().includes(q) || v.fullName?.toLowerCase().includes(q))) {
      return true
    }
    return false
  })
})

// Current font display label for trigger button
const currentFontDisplay = computed(() => {
  const current = props.modelValue || 'Jameel Noori Nastaleeq'
  // Check if matches a variant or family
  for (const item of allFamilies.value) {
    if (item.primaryFontFamily === current || item.family === current) {
      return item.displayName
    }
    if (item.variants) {
      for (const v of item.variants) {
        if (v.fontFamily === current) {
          return `${item.displayName} ${v.name}`
        }
      }
    }
  }
  return current
})

function isFamilySelected(familyItem) {
  const current = props.modelValue
  if (familyItem.primaryFontFamily === current || familyItem.family === current) return true
  if (familyItem.variants) {
    return familyItem.variants.some(v => v.fontFamily === current)
  }
  return false
}

// -------------------------------------------------------------
// Dynamic Font Loading & Memory-Safe Unloading
// -------------------------------------------------------------
// Track loaded FontFace objects: fontFamily -> FontFace
const loadedFaces = new Map()
// Track unpinned fonts in LRU / FIFO order to unload when memory threshold is reached
const dynamicLoadedKeys = []
const MAX_DYNAMIC_FONTS = 40
const OVERSCAN_BUFFER = 10
const ITEM_HEIGHT = 46

// Fonts currently in the document MUST ALWAYS stay loaded
const pinnedFontsSet = computed(() => {
  const set = new Set(['Jameel Noori Nastaleeq', 'Faiz Lahori Nastaleeq', 'Noto Nastaliq Urdu'])
  if (props.modelValue) set.add(props.modelValue)
  if (Array.isArray(props.documentFonts)) {
    for (const f of props.documentFonts) {
      if (f) set.add(f)
    }
  }
  return set
})

async function loadFontFile(fontFamily, filename) {
  if (!fontFamily || !filename) return
  if (typeof window === 'undefined' || !window.FontFace) return
  if (loadedFaces.has(fontFamily)) return

  try {
    const fontUrl = `/fonts/${encodeURIComponent(filename)}`
    const face = new FontFace(fontFamily, `url("${fontUrl}")`)
    loadedFaces.set(fontFamily, face)
    const loaded = await face.load()
    document.fonts.add(loaded)

    // If not pinned, track in dynamic pool
    if (!pinnedFontsSet.value.has(fontFamily)) {
      dynamicLoadedKeys.push(fontFamily)
      pruneMemoryPool()
    }
  } catch (err) {
    // If font binary format isn't supported by browser, silently ignore
  }
}

function unloadFont(fontFamily) {
  if (pinnedFontsSet.value.has(fontFamily)) {
    // ALWAYS KEEP DOCUMENT FONTS LOADED
    return
  }
  const face = loadedFaces.get(fontFamily)
  if (face) {
    try {
      document.fonts.delete(face)
    } catch {}
    loadedFaces.delete(fontFamily)
  }
}

function pruneMemoryPool() {
  while (dynamicLoadedKeys.length > MAX_DYNAMIC_FONTS) {
    const candidate = dynamicLoadedKeys.shift()
    if (!pinnedFontsSet.value.has(candidate) && !isFontInActiveWindow(candidate)) {
      unloadFont(candidate)
    }
  }
}

// Check if a font is within the active visible / overscan window
function isFontInActiveWindow(fontFamily) {
  if (!listContainerRef.value || !isOpen.value) return false
  const list = filteredFamilies.value
  const scrollTop = listContainerRef.value.scrollTop || 0
  const containerHeight = listContainerRef.value.clientHeight || 280
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN_BUFFER)
  const endIndex = Math.min(list.length - 1, Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + OVERSCAN_BUFFER)

  for (let i = startIndex; i <= endIndex; i++) {
    const item = list[i]
    if (!item) continue
    if (item.primaryFontFamily === fontFamily || item.family === fontFamily) return true
    if (item.family === activeSubmenuFamily.value && item.variants) {
      if (item.variants.some(v => v.fontFamily === fontFamily)) return true
    }
  }
  return false
}

// Preload visible + overscan fonts as user scrolls
function updateVisibleFonts() {
  if (!isOpen.value || !listContainerRef.value) return
  const list = filteredFamilies.value
  if (!list.length) return

  const scrollTop = listContainerRef.value.scrollTop || 0
  const containerHeight = listContainerRef.value.clientHeight || 280

  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN_BUFFER)
  const endIndex = Math.min(list.length - 1, Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + OVERSCAN_BUFFER)

  // Load fonts in advance (overscan window)
  for (let i = startIndex; i <= endIndex; i++) {
    const item = list[i]
    if (item && item.primaryFontFamily && item.defaultFile) {
      loadFontFile(item.primaryFontFamily, item.defaultFile)
    }
  }

  // If a submenu is currently open, load all its variants
  if (activeSubmenuFamily.value) {
    const activeItem = list.find(f => f.family === activeSubmenuFamily.value)
    if (activeItem && activeItem.variants) {
      for (const v of activeItem.variants) {
        loadFontFile(v.fontFamily, v.file)
      }
    }
  }

  // Trigger memory pool eviction check
  pruneMemoryPool()
}

// Ensure pinned document fonts are always loaded immediately
watch(pinnedFontsSet, (pinned) => {
  for (const fontName of pinned) {
    for (const item of allFamilies.value) {
      if (item.primaryFontFamily === fontName || item.family === fontName) {
        loadFontFile(item.primaryFontFamily, item.defaultFile)
        break
      }
      if (item.variants) {
        const match = item.variants.find(v => v.fontFamily === fontName)
        if (match) {
          loadFontFile(match.fontFamily, match.file)
          break
        }
      }
    }
  }
}, { immediate: true })

// -------------------------------------------------------------
// Dropdown & Submenu Positioning
// -------------------------------------------------------------
function updateDropdownPosition() {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const width = Math.max(380, rect.width)
  let left = rect.left
  if (left + width > window.innerWidth - 10) {
    left = Math.max(10, window.innerWidth - width - 10)
  }

  let top = rect.bottom + 2
  const estimatedHeight = 330
  if (top + estimatedHeight > window.innerHeight && rect.top > estimatedHeight) {
    top = rect.top - estimatedHeight - 2
  }

  dropdownStyle.value = {
    top: `${Math.round(top)}px`,
    left: `${Math.round(left)}px`,
    width: `${width}px`
  }
}

function openDropdown() {
  refreshPreview()
  searchQuery.value = ''
  isOpen.value = true
  activeSubmenuFamily.value = null
  updateDropdownPosition()

  // Find index of current font
  const current = props.modelValue || 'Jameel Noori Nastaleeq'
  const idx = filteredFamilies.value.findIndex(f => isFamilySelected(f))
  highlightedIndex.value = idx >= 0 ? idx : 0

  nextTick(() => {
    searchInputRef.value?.focus()
    scrollHighlightedIntoView()
    updateVisibleFonts()
  })
}

function closeDropdown() {
  if (!isOpen.value) return
  isOpen.value = false
  activeSubmenuFamily.value = null
  triggerRef.value?.focus()
}

function toggleDropdown() {
  if (isOpen.value) {
    closeDropdown()
  } else {
    openDropdown()
  }
}

function selectFont(fontFamily) {
  emit('update:modelValue', fontFamily)
  emit('change', fontFamily)
  closeDropdown()
}

function scrollHighlightedIntoView() {
  nextTick(() => {
    if (!listContainerRef.value) return
    const el = listContainerRef.value.querySelector(`[data-index="${highlightedIndex.value}"]`)
    if (el) {
      el.scrollIntoView({ block: 'nearest' })
    }
  })
}

// -------------------------------------------------------------
// Submenu Actions
// -------------------------------------------------------------
function showSubmenu(familyItem, event) {
  if (!familyItem.hasSubmenu) {
    activeSubmenuFamily.value = null
    return
  }

  activeSubmenuFamily.value = familyItem.family
  submenuHighlightedIndex.value = 0

  // Preload all variants for this family
  if (familyItem.variants) {
    for (const v of familyItem.variants) {
      loadFontFile(v.fontFamily, v.file)
    }
  }

  // Position submenu to the right of the row
  nextTick(() => {
    const rowEl = event?.currentTarget || listContainerRef.value?.querySelector(`[data-index="${highlightedIndex.value}"]`)
    if (!rowEl || !dropdownRef.value) return

    const rowRect = rowEl.getBoundingClientRect()
    const submenuWidth = 240
    let left = rowRect.right + 2
    if (left + submenuWidth > window.innerWidth - 10) {
      // Show on left side if overflowing screen
      left = Math.max(10, rowRect.left - submenuWidth - 2)
    }

    let top = rowRect.top
    const estHeight = (familyItem.variants?.length || 1) * 44 + 30
    if (top + estHeight > window.innerHeight - 10) {
      top = Math.max(10, window.innerHeight - estHeight - 10)
    }

    submenuStyle.value = {
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`
    }
  })
}

function hideSubmenu() {
  if (!isHoveringSubmenu.value) {
    activeSubmenuFamily.value = null
  }
}

function onRowMouseEnter(familyItem, index, event) {
  highlightedIndex.value = index
  if (familyItem.hasSubmenu) {
    showSubmenu(familyItem, event)
  } else {
    activeSubmenuFamily.value = null
  }
}

function onRowClick(familyItem, event) {
  if (!familyItem.hasSubmenu) {
    selectFont(familyItem.primaryFontFamily)
  } else {
    // If clicked, toggle submenu or select primary if already open
    if (activeSubmenuFamily.value === familyItem.family) {
      selectFont(familyItem.primaryFontFamily)
    } else {
      showSubmenu(familyItem, event)
    }
  }
}

function selectVariant(variant) {
  selectFont(variant.fontFamily)
}

// -------------------------------------------------------------
// Keyboard Navigation
// -------------------------------------------------------------
function onSearchKeydown(e) {
  const currentFamily = filteredFamilies.value[highlightedIndex.value]

  if (activeSubmenuFamily.value && currentFamily?.hasSubmenu) {
    // Navigating inside submenu
    const variants = currentFamily.variants || []
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      submenuHighlightedIndex.value = (submenuHighlightedIndex.value + 1) % variants.length
      return
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      submenuHighlightedIndex.value = (submenuHighlightedIndex.value - 1 + variants.length) % variants.length
      return
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      activeSubmenuFamily.value = null
      return
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const v = variants[submenuHighlightedIndex.value]
      if (v) selectVariant(v)
      return
    } else if (e.key === 'Escape') {
      e.preventDefault()
      activeSubmenuFamily.value = null
      return
    }
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (filteredFamilies.value.length === 0) return
    highlightedIndex.value = (highlightedIndex.value + 1) % filteredFamilies.value.length
    scrollHighlightedIntoView()
    activeSubmenuFamily.value = null
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (filteredFamilies.value.length === 0) return
    highlightedIndex.value = (highlightedIndex.value - 1 + filteredFamilies.value.length) % filteredFamilies.value.length
    scrollHighlightedIntoView()
    activeSubmenuFamily.value = null
  } else if (e.key === 'ArrowRight') {
    if (currentFamily?.hasSubmenu) {
      e.preventDefault()
      showSubmenu(currentFamily)
    }
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (filteredFamilies.value.length > 0 && highlightedIndex.value >= 0 && highlightedIndex.value < filteredFamilies.value.length) {
      const f = filteredFamilies.value[highlightedIndex.value]
      selectFont(f.primaryFontFamily)
    }
  } else if (e.key === 'Escape') {
    e.preventDefault()
    closeDropdown()
  }
}

function onTriggerKeydown(e) {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    openDropdown()
  }
}

function handleClickOutside(e) {
  if (!isOpen.value) return
  if (triggerRef.value?.contains(e.target)) return
  if (dropdownRef.value?.contains(e.target)) return
  const flyout = document.querySelector('.font-submenu-flyout')
  if (flyout?.contains(e.target)) return
  closeDropdown()
}

function onWindowResize() {
  if (isOpen.value) {
    updateDropdownPosition()
  }
}

function onListScroll() {
  updateVisibleFonts()
}

onMounted(() => {
  document.addEventListener('selectionchange', refreshPreview)
  document.addEventListener('pointerdown', handleClickOutside)
  window.addEventListener('resize', onWindowResize)
  window.addEventListener('scroll', onWindowResize, true)

  // Ensure default font Jameel Noori Nastaleeq is loaded
  loadFontFile('Jameel Noori Nastaleeq', 'Jameel Noori Nastaleeq.ttf')
})

onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', refreshPreview)
  document.removeEventListener('pointerdown', handleClickOutside)
  window.removeEventListener('resize', onWindowResize)
  window.removeEventListener('scroll', onWindowResize, true)
})

watch(() => props.modelValue, () => {
  if (isOpen.value) {
    const idx = filteredFamilies.value.findIndex(f => isFamilySelected(f))
    if (idx >= 0) highlightedIndex.value = idx
  }
})

watch(searchQuery, () => {
  highlightedIndex.value = 0
  activeSubmenuFamily.value = null
  nextTick(updateVisibleFonts)
})
</script>

<template>
  <div class="urdu-font-select-wrapper">
    <!-- Trigger Button styled like ribbon font-field -->
    <button
      ref="triggerRef"
      type="button"
      class="font-field urdu-font-trigger"
      :class="{ open: isOpen }"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      aria-label="Urdu font"
      data-tooltip="Urdu font"
      @mousedown="refreshPreview"
      @click="toggleDropdown"
      @keydown="onTriggerKeydown"
    >
      <span class="font-current-name">{{ currentFontDisplay }}</span>
      <span class="font-arrow" aria-hidden="true">▾</span>
    </button>

    <!-- Teleported Select2-style Dropdown -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="dropdownRef"
        class="urdu-font-dropdown"
        :style="dropdownStyle"
        role="dialog"
        aria-label="Select Urdu font"
      >
        <!-- Search bar -->
        <div class="dropdown-header">
          <div class="search-input-box">
            <svg class="search-icon" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
            </svg>
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              type="text"
              class="font-search-input"
              placeholder="Search Urdu fonts / تلاش کریں..."
              aria-label="Search Urdu fonts"
              @keydown="onSearchKeydown"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="clear-search-btn"
              title="Clear search"
              @click="searchQuery = ''; searchInputRef?.focus()"
            >
              ×
            </button>
          </div>
          <div class="font-count-tag">
            {{ filteredFamilies.length }} fonts
          </div>
        </div>

        <!-- Fonts List with live preview -->
        <div
          ref="listContainerRef"
          class="font-list-container"
          role="listbox"
          @scroll="onListScroll"
        >
          <div
            v-if="filteredFamilies.length === 0"
            class="no-fonts-found"
          >
            No fonts found matching "{{ searchQuery }}"
          </div>

          <template v-else>
            <div
              v-for="(f, i) in filteredFamilies"
              :key="f.family"
              :data-index="i"
              class="font-option-row"
              :class="{
                selected: isFamilySelected(f),
                highlighted: i === highlightedIndex,
                'has-submenu': f.hasSubmenu,
                'submenu-open': activeSubmenuFamily === f.family
              }"
              role="option"
              :aria-selected="isFamilySelected(f)"
              @mouseenter="onRowMouseEnter(f, i, $event)"
              @click="onRowClick(f, $event)"
            >
              <!-- Left: Name & indicator -->
              <div class="font-meta">
                <span class="font-check" aria-hidden="true">
                  {{ isFamilySelected(f) ? '✓' : '' }}
                </span>
                <span class="font-name-label" :title="f.displayName">
                  {{ f.displayName }}
                </span>
                <span v-if="f.isDefault" class="font-default-pill">
                  Default
                </span>
              </div>

              <!-- Right: Real-time preview + Submenu Arrow -->
              <div class="font-right-col">
                <div
                  class="font-preview-sample"
                  :style="{ fontFamily: f.primaryFontFamily }"
                  dir="rtl"
                  :title="f.displayName + ' preview: ' + previewText"
                >
                  {{ previewText }}
                </div>
                <span
                  v-if="f.hasSubmenu"
                  class="submenu-arrow"
                  :class="{ active: activeSubmenuFamily === f.family }"
                  aria-hidden="true"
                  title="View variations"
                >
                  ▸
                </span>
              </div>
            </div>
          </template>
        </div>

        <!-- Dropdown Footer -->
        <div class="dropdown-footer">
          <span>Previewing: <strong dir="rtl">{{ previewText }}</strong></span>
          <span class="footer-tip">↑↓ navigate • ▸ variations • Enter select</span>
        </div>
      </div>

      <!-- MS Word-style Variations Submenu Flyout -->
      <div
        v-if="isOpen && activeSubmenuFamily"
        class="font-submenu-flyout"
        :style="submenuStyle"
        role="menu"
        aria-label="Font variations"
        @mouseenter="isHoveringSubmenu = true"
        @mouseleave="isHoveringSubmenu = false; hideSubmenu()"
      >
        <div class="submenu-title">
          {{ filteredFamilies.find(f => f.family === activeSubmenuFamily)?.displayName }} Variations
        </div>
        <div
          v-for="(v, vIdx) in filteredFamilies.find(f => f.family === activeSubmenuFamily)?.variants || []"
          :key="v.name"
          class="submenu-option-row"
          :class="{
            selected: v.fontFamily === modelValue,
            highlighted: vIdx === submenuHighlightedIndex
          }"
          role="menuitem"
          @mouseenter="submenuHighlightedIndex = vIdx"
          @click.stop="selectVariant(v)"
        >
          <div class="submenu-meta">
            <span class="font-check" aria-hidden="true">
              {{ v.fontFamily === modelValue ? '✓' : '' }}
            </span>
            <span class="variant-name">{{ v.name }}</span>
          </div>
          <div
            class="font-preview-sample"
            :style="{ fontFamily: v.fontFamily }"
            dir="rtl"
          >
            {{ previewText }}
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.urdu-font-select-wrapper {
  display: inline-block;
  position: relative;
  vertical-align: middle;
}

.urdu-font-trigger {
  display: flex !important;
  align-items: center;
  justify-content: space-between;
  width: 200px;
  height: 19px;
  min-height: 19px;
  padding: 0 4px;
  background: white;
  border: 1px inset #aaa;
  font: 10px Tahoma, Arial, sans-serif;
  color: #111;
  text-align: left;
  cursor: pointer;
  user-select: none;
  box-sizing: border-box;
}

.urdu-font-trigger:hover {
  background: #fdfdfd;
  border-color: #777;
}

.urdu-font-trigger:focus,
.urdu-font-trigger.open {
  outline: 1px solid #126bcc;
  border-color: #126bcc;
}

.font-current-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 4px;
}

.font-arrow {
  flex-shrink: 0;
  font-size: 9px;
  color: #555;
}

/* Teleported Dropdown */
.urdu-font-dropdown {
  position: fixed;
  background: #fdfdfd;
  border: 1px solid #777;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.22);
  z-index: 500;
  font-family: Tahoma, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif;
  font-size: 11px;
  color: #222;
  box-sizing: border-box;
  border-radius: 2px;
  display: flex;
  flex-direction: column;
}

.dropdown-header {
  padding: 5px 6px;
  background: #ecece9;
  border-bottom: 1px solid #ccc;
  display: flex;
  align-items: center;
  gap: 6px;
}

.search-input-box {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 6px;
  width: 12px;
  height: 12px;
  color: #777;
  pointer-events: none;
}

.font-search-input {
  width: 100%;
  height: 24px;
  padding: 2px 22px 2px 24px;
  border: 1px solid #aaa;
  border-radius: 2px;
  font: 11px Tahoma, Arial, sans-serif;
  background: white;
  color: #111;
  box-sizing: border-box;
  outline: none;
}

.font-search-input:focus {
  border-color: #126bcc;
  box-shadow: 0 0 0 1px #126bcc inset;
}

.clear-search-btn {
  position: absolute;
  right: 4px;
  background: transparent;
  border: none;
  font-size: 14px;
  line-height: 1;
  color: #888;
  cursor: pointer;
  padding: 0 3px;
}

.clear-search-btn:hover {
  color: #333;
}

.font-count-tag {
  font-size: 10px;
  color: #666;
  white-space: nowrap;
  background: #dededb;
  padding: 2px 5px;
  border-radius: 3px;
}

.font-list-container {
  max-height: 290px;
  overflow-y: auto;
  overflow-x: hidden;
  background: white;
}

.no-fonts-found {
  padding: 18px 12px;
  text-align: center;
  color: #888;
  font-style: italic;
}

.font-option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  min-height: 46px;
  cursor: pointer;
  border-bottom: 1px solid #f2f2f2;
  gap: 8px;
  box-sizing: border-box;
}

.font-option-row:last-child {
  border-bottom: none;
}

.font-option-row.highlighted,
.font-option-row.submenu-open {
  background: #1b65b9;
  color: white;
}

.font-option-row.selected {
  background: #eaf2fc;
  color: #0b498e;
  font-weight: bold;
}

.font-option-row.selected.highlighted,
.font-option-row.selected.submenu-open {
  background: #1b65b9;
  color: white;
}

.font-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.font-check {
  width: 14px;
  text-align: center;
  font-weight: bold;
  font-size: 11px;
  flex-shrink: 0;
}

.font-name-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
}

.font-default-pill {
  font-size: 9px;
  padding: 1px 4px;
  background: #dedede;
  color: #444;
  border-radius: 2px;
  flex-shrink: 0;
  font-weight: normal;
}

.font-option-row.highlighted .font-default-pill,
.font-option-row.submenu-open .font-default-pill {
  background: rgba(255, 255, 255, 0.25);
  color: white;
}

.font-right-col {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

/* Urdu preview with 2x line-height */
.font-preview-sample {
  font-size: 16px;
  line-height: 2.0; /* 2x preview line-height for Urdu */
  min-height: 38px;
  white-space: nowrap;
  direction: rtl;
  padding: 0 4px;
  text-align: right;
  flex-shrink: 0;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  box-sizing: border-box;
}

.submenu-arrow {
  font-size: 10px;
  color: #888;
  padding: 2px 2px 2px 4px;
  user-select: none;
}

.font-option-row.highlighted .submenu-arrow,
.font-option-row.submenu-open .submenu-arrow {
  color: white;
}

/* Submenu flyout */
.font-submenu-flyout {
  position: fixed;
  background: #fdfdfd;
  border: 1px solid #777;
  box-shadow: 2px 6px 18px rgba(0, 0, 0, 0.28);
  z-index: 550;
  font-family: Tahoma, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif;
  font-size: 11px;
  color: #222;
  box-sizing: border-box;
  border-radius: 2px;
  min-width: 220px;
  max-width: 280px;
  display: flex;
  flex-direction: column;
}

.submenu-title {
  padding: 5px 8px;
  background: #e4e4e0;
  border-bottom: 1px solid #ccc;
  font-weight: bold;
  font-size: 10px;
  color: #444;
}

.submenu-option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  min-height: 44px;
  cursor: pointer;
  border-bottom: 1px solid #f2f2f2;
  gap: 8px;
  box-sizing: border-box;
}

.submenu-option-row:last-child {
  border-bottom: none;
}

.submenu-option-row.highlighted {
  background: #1b65b9;
  color: white;
}

.submenu-option-row.selected {
  background: #eaf2fc;
  color: #0b498e;
  font-weight: bold;
}

.submenu-option-row.selected.highlighted {
  background: #1b65b9;
  color: white;
}

.submenu-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.variant-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
}

.dropdown-footer {
  padding: 4px 8px;
  background: #f2f2ef;
  border-top: 1px solid #ddd;
  font-size: 10px;
  color: #666;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dropdown-footer strong {
  color: #111;
  font-size: 11px;
}

.footer-tip {
  color: #888;
}
</style>
