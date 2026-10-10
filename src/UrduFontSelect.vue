<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: 'Noto Nastaliq Urdu'
  },
  fonts: {
    type: Array,
    default: () => []
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

const dropdownStyle = ref({
  top: '0px',
  left: '0px',
  width: '350px'
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
  } catch {
    // fallback
  }

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

// All available fonts: Default Noto Nastaliq Urdu first, then installed Urdu fonts
const allFonts = computed(() => {
  const list = [
    {
      family: 'Noto Nastaliq Urdu',
      fullName: 'Noto Nastaliq Urdu',
      isDefault: true
    }
  ]

  const installed = props.fonts.map(f => ({
    family: f.family,
    fullName: f.fullName || f.family,
    file: f.file || '',
    isDefault: false
  }))

  return list.concat(installed)
})

// Searchable filtered list
const filteredFonts = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return allFonts.value
  return allFonts.value.filter(f =>
    f.fullName.toLowerCase().includes(q) ||
    f.family.toLowerCase().includes(q)
  )
})

const currentFontDisplay = computed(() => {
  const match = allFonts.value.find(f => f.family === props.modelValue)
  return match ? match.fullName : (props.modelValue || 'Noto Nastaliq Urdu')
})

function updateDropdownPosition() {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const width = Math.max(340, rect.width)
  let left = rect.left
  if (left + width > window.innerWidth - 10) {
    left = Math.max(10, window.innerWidth - width - 10)
  }

  let top = rect.bottom + 2
  // If near screen bottom, display above the trigger
  const estimatedHeight = 320
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
  updateDropdownPosition()

  // Find index of current font
  const idx = filteredFonts.value.findIndex(f => f.family === props.modelValue)
  highlightedIndex.value = idx >= 0 ? idx : 0

  nextTick(() => {
    searchInputRef.value?.focus()
    scrollHighlightedIntoView()
  })
}

function closeDropdown() {
  if (!isOpen.value) return
  isOpen.value = false
  triggerRef.value?.focus()
}

function toggleDropdown() {
  if (isOpen.value) {
    closeDropdown()
  } else {
    openDropdown()
  }
}

function selectFont(font) {
  emit('update:modelValue', font.family)
  emit('change', font.family)
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

function onSearchKeydown(e) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (filteredFonts.value.length === 0) return
    highlightedIndex.value = (highlightedIndex.value + 1) % filteredFonts.value.length
    scrollHighlightedIntoView()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (filteredFonts.value.length === 0) return
    highlightedIndex.value = (highlightedIndex.value - 1 + filteredFonts.value.length) % filteredFonts.value.length
    scrollHighlightedIntoView()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (filteredFonts.value.length > 0 && highlightedIndex.value >= 0 && highlightedIndex.value < filteredFonts.value.length) {
      selectFont(filteredFonts.value[highlightedIndex.value])
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
  closeDropdown()
}

function onWindowResize() {
  if (isOpen.value) {
    updateDropdownPosition()
  }
}

onMounted(() => {
  document.addEventListener('selectionchange', refreshPreview)
  document.addEventListener('pointerdown', handleClickOutside)
  window.addEventListener('resize', onWindowResize)
  window.addEventListener('scroll', onWindowResize, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', refreshPreview)
  document.removeEventListener('pointerdown', handleClickOutside)
  window.removeEventListener('resize', onWindowResize)
  window.removeEventListener('scroll', onWindowResize, true)
})

watch(() => props.modelValue, () => {
  if (isOpen.value) {
    const idx = filteredFonts.value.findIndex(f => f.family === props.modelValue)
    if (idx >= 0) highlightedIndex.value = idx
  }
})

watch(searchQuery, () => {
  highlightedIndex.value = 0
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
      :title="'Urdu font: ' + currentFontDisplay"
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
            {{ filteredFonts.length }} fonts
          </div>
        </div>

        <!-- Fonts List with live preview -->
        <div ref="listContainerRef" class="font-list-container" role="listbox">
          <div
            v-if="filteredFonts.length === 0"
            class="no-fonts-found"
          >
            No fonts found matching "{{ searchQuery }}"
          </div>

          <template v-else>
            <div
              v-for="(f, i) in filteredFonts"
              :key="f.family"
              :data-index="i"
              class="font-option-row"
              :class="{
                selected: f.family === modelValue,
                highlighted: i === highlightedIndex
              }"
              role="option"
              :aria-selected="f.family === modelValue"
              @mouseenter="highlightedIndex = i"
              @click="selectFont(f)"
            >
              <!-- Left: Name & indicator -->
              <div class="font-meta">
                <span class="font-check" aria-hidden="true">
                  {{ f.family === modelValue ? '✓' : '' }}
                </span>
                <span class="font-name-label" :title="f.fullName">
                  {{ f.fullName }}
                </span>
                <span v-if="f.isDefault" class="font-default-pill">
                  Default
                </span>
              </div>

              <!-- Right: Real-time Urdu font preview in its own font-family -->
              <div
                class="font-preview-sample"
                :style="{ fontFamily: f.family }"
                dir="rtl"
                :title="f.fullName + ' preview: ' + previewText"
              >
                {{ previewText }}
              </div>
            </div>
          </template>
        </div>

        <!-- Dropdown Footer -->
        <div class="dropdown-footer">
          <span>Previewing: <strong dir="rtl">{{ previewText }}</strong></span>
          <span class="footer-tip">↑↓ navigate • Enter select • Esc close</span>
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
  max-height: 270px;
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
  padding: 5px 8px;
  min-height: 34px;
  cursor: pointer;
  border-bottom: 1px solid #f1f1f1;
  gap: 10px;
  box-sizing: border-box;
}

.font-option-row:last-child {
  border-bottom: none;
}

.font-option-row.highlighted {
  background: #1b65b9;
  color: white;
}

.font-option-row.selected {
  background: #eaf2fc;
  color: #0b498e;
  font-weight: bold;
}

.font-option-row.selected.highlighted {
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

.font-option-row.highlighted .font-default-pill {
  background: rgba(255, 255, 255, 0.25);
  color: white;
}

.font-preview-sample {
  font-size: 17px;
  line-height: 1.4;
  white-space: nowrap;
  direction: rtl;
  padding: 0 4px;
  text-align: right;
  flex-shrink: 0;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
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
