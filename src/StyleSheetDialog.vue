<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import inpageFonts from './inpage-fonts.json'

const props = defineProps({
  styles: {
    type: Array,
    default: () => []
  },
  colors: {
    type: Array,
    default: () => [
      { name: 'Black', value: '#000000' },
      { name: 'White', value: '#ffffff' },
      { name: 'Red', value: '#c00000' },
      { name: 'Green', value: '#008000' },
      { name: 'Blue', value: '#0000c0' },
      { name: 'Yellow', value: '#ffcc00' }
    ]
  },
  activeStyleName: {
    type: String,
    default: 'Normal'
  }
})

const emit = defineEmits(['apply', 'close', 'update:styles', 'help'])

// Installed fonts
const englishFonts = [
  'Arial', 'Times New Roman', 'Georgia', 'Courier New', 'Tahoma', 'Verdana'
]
const urduFonts = [
  'Jameel Noori Nastaleeq', 'Noori Nastaliq', 'Noto Nastaliq Urdu', 'Alvi Nastaleeq',
  'Firdous', 'Aadil', 'Amir', 'Lahore', 'Kasheeda', 'Pak Nastaleeq'
]

// Modal navigation stack: 'list' | 'edit' | 'paragraph' | 'character' | 'border' | 'hyphenation' | 'tabs'
const activeModal = ref('list')
const selectedStyleName = ref(props.activeStyleName || 'Normal')
const isCreatingNew = ref(false)

// Default master style
const DEFAULT_NORMAL = {
  name: 'Normal',
  base: 'None',
  keyEquivalent: '',
  // Paragraph
  alignment: 'right', // 'right' | 'left' | 'center' | 'justify' | 'full'
  beginningIndent: 0,
  endIndent: 0,
  firstLineIndent: 0,
  lineHeight: 'Auto',
  interlineGap: 0,
  defaultStop: 12.7,
  breakType: 'None',
  keepTogether: false,
  keepWithNext: false,
  widows: 1,
  orphans: 1,
  spaceBefore: 0,
  spaceAfter: 0,
  charAlignment: 'Arabic', // 'Latin' | 'Arabic'
  addToToc: false,
  // Character
  size: 12,
  style: 'None', // 'None' | 'Single' | 'Double' | 'Overline' | 'Box'
  color: '#000000',
  hatch: 'None',
  latinFont: 'Arial',
  urduFont: 'Jameel Noori Nastaleeq',
  language: 'Urdu',
  bold: false,
  italics: false,
  outline: false,
  kashida: 'K-None',
  spacing: 0,
  scaling: 100,
  baselineShift: 0,
  ligatures: { meem: false, re: false, jeem: false, ain: false, kaaf: false },
  // Border
  borderAbove: 'None',
  borderAboveStyle: 'Solid',
  borderBelow: 'None',
  borderBelowStyle: 'Solid',
  // Hyphenation
  hyphenation: 'Light',
  maxConsecutiveHyphens: 3,
  // Tabs
  tabs: []
}

// Local copy of styles list
const localStyles = ref([])

function initStyles() {
  const list = []
  if (Array.isArray(props.styles) && props.styles.length > 0) {
    for (const s of props.styles) {
      list.push(normalizeStyle(s))
    }
  }
  if (!list.some(s => s.name === 'Normal')) {
    list.unshift({ ...DEFAULT_NORMAL })
  }
  localStyles.value = list
  if (!localStyles.value.some(s => s.name === selectedStyleName.value)) {
    selectedStyleName.value = localStyles.value[0]?.name || 'Normal'
  }
}

function normalizeStyle(s) {
  return {
    ...DEFAULT_NORMAL,
    ...s,
    ligatures: { ...DEFAULT_NORMAL.ligatures, ...(s.ligatures || {}) },
    tabs: Array.isArray(s.tabs) ? [...s.tabs] : []
  }
}

// Current edit draft
const editDraft = ref({ ...DEFAULT_NORMAL })

// Sub-dialog temporary drafts
const paragraphDraft = ref({})
const characterDraft = ref({})
const borderDraft = ref({})
const hyphenationDraft = ref({})
const tabsDraft = ref({
  position: '',
  alignment: 'Left',
  leader: 'None',
  list: [],
  selectedTabIdx: -1
})

// Helper for mm/pt strings
function parseNum(val, def = 0) {
  if (typeof val === 'number') return isNaN(val) ? def : val
  const cleaned = (val || '').toString().replace(/[^\d.-]/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? def : parsed
}

// ==========================================
// Define Style Sheets Actions
// ==========================================
function onSelectStyle(name) {
  selectedStyleName.value = name
}

function onApply() {
  const found = localStyles.value.find(s => s.name === selectedStyleName.value)
  if (found) {
    emit('apply', JSON.parse(JSON.stringify(found)))
  }
}

function onDone() {
  emit('close')
}

function onNewStyle() {
  isCreatingNew.value = true
  let baseName = 'test'
  let counter = 1
  while (localStyles.value.some(s => s.name === baseName)) {
    counter++
    baseName = `test ${counter}`
  }
  const baseSource = localStyles.value.find(s => s.name === selectedStyleName.value) || DEFAULT_NORMAL
  editDraft.value = {
    ...JSON.parse(JSON.stringify(baseSource)),
    name: baseName,
    base: baseSource.name || 'Normal',
    keyEquivalent: ''
  }
  activeModal.value = 'edit'
}

function onModifyStyle() {
  isCreatingNew.value = false
  const found = localStyles.value.find(s => s.name === selectedStyleName.value) || DEFAULT_NORMAL
  editDraft.value = JSON.parse(JSON.stringify(found))
  activeModal.value = 'edit'
}

function onRemoveStyle() {
  if (selectedStyleName.value === 'Normal') return
  const idx = localStyles.value.findIndex(s => s.name === selectedStyleName.value)
  if (idx >= 0) {
    localStyles.value.splice(idx, 1)
    selectedStyleName.value = localStyles.value[Math.max(0, idx - 1)]?.name || 'Normal'
    emit('update:styles', JSON.parse(JSON.stringify(localStyles.value)))
  }
}

// ==========================================
// Edit Style Sheet Actions
// ==========================================
function onSaveEdit() {
  const name = (editDraft.value.name || '').trim()
  if (!name) return

  const updated = JSON.parse(JSON.stringify(editDraft.value))
  updated.name = name

  const existingIdx = localStyles.value.findIndex(s => s.name === name)
  if (isCreatingNew.value || existingIdx < 0) {
    if (existingIdx >= 0) {
      localStyles.value[existingIdx] = updated
    } else {
      localStyles.value.push(updated)
    }
  } else {
    localStyles.value[existingIdx] = updated
  }

  selectedStyleName.value = name
  emit('update:styles', JSON.parse(JSON.stringify(localStyles.value)))
  activeModal.value = 'list'
}

function onCancelEdit() {
  activeModal.value = 'list'
}

// Open Sub-Modals
function openParagraphModal() {
  paragraphDraft.value = {
    alignment: editDraft.value.alignment || 'right',
    beginningIndent: editDraft.value.beginningIndent || 0,
    endIndent: editDraft.value.endIndent || 0,
    firstLineIndent: editDraft.value.firstLineIndent || 0,
    lineHeight: editDraft.value.lineHeight || 'Auto',
    interlineGap: editDraft.value.interlineGap || 0,
    defaultStop: editDraft.value.defaultStop || 12.7,
    breakType: editDraft.value.breakType || 'None',
    keepTogether: !!editDraft.value.keepTogether,
    keepWithNext: !!editDraft.value.keepWithNext,
    widows: editDraft.value.widows ?? 1,
    orphans: editDraft.value.orphans ?? 1,
    spaceBefore: editDraft.value.spaceBefore || 0,
    spaceAfter: editDraft.value.spaceAfter || 0,
    charAlignment: editDraft.value.charAlignment || 'Arabic',
    addToToc: !!editDraft.value.addToToc
  }
  activeModal.value = 'paragraph'
}

function saveParagraphModal() {
  Object.assign(editDraft.value, paragraphDraft.value)
  activeModal.value = 'edit'
}

function openCharacterModal() {
  characterDraft.value = {
    size: editDraft.value.size || 12,
    style: editDraft.value.style || 'None',
    color: editDraft.value.color || '#000000',
    hatch: editDraft.value.hatch || 'None',
    latinFont: editDraft.value.latinFont || 'Arial',
    urduFont: editDraft.value.urduFont || 'Noori Nastaliq',
    language: editDraft.value.language || 'Urdu',
    bold: !!editDraft.value.bold,
    italics: !!editDraft.value.italics,
    outline: !!editDraft.value.outline,
    kashida: editDraft.value.kashida || 'K-None',
    spacing: editDraft.value.spacing || 0,
    scaling: editDraft.value.scaling || 100,
    baselineShift: editDraft.value.baselineShift || 0,
    ligatures: { ...(editDraft.value.ligatures || {}) }
  }
  activeModal.value = 'character'
}

function saveCharacterModal() {
  Object.assign(editDraft.value, characterDraft.value)
  activeModal.value = 'edit'
}

function openBorderModal() {
  borderDraft.value = {
    borderAbove: editDraft.value.borderAbove || 'None',
    borderAboveStyle: editDraft.value.borderAboveStyle || 'Solid',
    borderBelow: editDraft.value.borderBelow || 'None',
    borderBelowStyle: editDraft.value.borderBelowStyle || 'Solid'
  }
  activeModal.value = 'border'
}

function saveBorderModal() {
  Object.assign(editDraft.value, borderDraft.value)
  activeModal.value = 'edit'
}

function openHyphenationModal() {
  hyphenationDraft.value = {
    hyphenation: editDraft.value.hyphenation || 'Light',
    maxConsecutiveHyphens: editDraft.value.maxConsecutiveHyphens ?? 3
  }
  activeModal.value = 'hyphenation'
}

function saveHyphenationModal() {
  Object.assign(editDraft.value, hyphenationDraft.value)
  activeModal.value = 'edit'
}

function openTabsModal() {
  tabsDraft.value = {
    position: '12.7mm',
    alignment: 'Left',
    leader: 'None',
    list: Array.isArray(editDraft.value.tabs) ? JSON.parse(JSON.stringify(editDraft.value.tabs)) : [],
    selectedTabIdx: -1
  }
  activeModal.value = 'tabs'
}

function addTab() {
  const pos = tabsDraft.value.position.trim()
  if (!pos) return
  tabsDraft.value.list.push({
    position: pos.endsWith('mm') || pos.endsWith('pt') ? pos : `${pos}mm`,
    alignment: tabsDraft.value.alignment,
    leader: tabsDraft.value.leader
  })
}

function modifyTab() {
  const idx = tabsDraft.value.selectedTabIdx
  if (idx < 0 || idx >= tabsDraft.value.list.length) return
  const pos = tabsDraft.value.position.trim()
  if (!pos) return
  tabsDraft.value.list[idx] = {
    position: pos.endsWith('mm') || pos.endsWith('pt') ? pos : `${pos}mm`,
    alignment: tabsDraft.value.alignment,
    leader: tabsDraft.value.leader
  }
}

function removeTab() {
  const idx = tabsDraft.value.selectedTabIdx
  if (idx >= 0 && idx < tabsDraft.value.list.length) {
    tabsDraft.value.list.splice(idx, 1)
    tabsDraft.value.selectedTabIdx = -1
  }
}

function removeAllTabs() {
  tabsDraft.value.list = []
  tabsDraft.value.selectedTabIdx = -1
}

function selectTab(idx) {
  tabsDraft.value.selectedTabIdx = idx
  const t = tabsDraft.value.list[idx]
  if (t) {
    tabsDraft.value.position = t.position
    tabsDraft.value.alignment = t.alignment
    tabsDraft.value.leader = t.leader
  }
}

function saveTabsModal() {
  editDraft.value.tabs = JSON.parse(JSON.stringify(tabsDraft.value.list))
  activeModal.value = 'edit'
}

onMounted(() => {
  initStyles()
})
</script>

<template>
  <div class="inpage-modal-backdrop" @click.self="activeModal === 'list' ? onDone() : null">

    <!-- 1. DEFINE STYLE SHEETS MODAL -->
    <div
      v-if="activeModal === 'list'"
      class="inpage-modal define-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Define Style Sheets"
    >
      <div class="inpage-modal-titlebar">
        <span class="inpage-modal-title">Define Style Sheets</span>
        <button type="button" class="inpage-titlebar-close" aria-label="Close" @click="onDone">✕</button>
      </div>

      <div class="inpage-modal-content define-content">
        <!-- Left: Name & Listbox -->
        <div class="define-left">
          <label class="list-label">Name:</label>
          <div class="inpage-listbox" role="listbox">
            <div
              v-for="s in localStyles"
              :key="s.name"
              class="listbox-item"
              :class="{ selected: selectedStyleName === s.name }"
              role="option"
              :aria-selected="selectedStyleName === s.name"
              @click="onSelectStyle(s.name)"
              @dblclick="onModifyStyle"
            >
              {{ s.name }}
            </div>
          </div>
        </div>

        <!-- Right: Buttons -->
        <div class="define-right-buttons">
          <div class="btn-group-top">
            <button type="button" class="inpage-dialog-btn" @click="onApply">Apply</button>
            <button type="button" class="inpage-dialog-btn" @click="onDone">Done</button>
            <button type="button" class="inpage-dialog-btn" @click="emit('help')">Help</button>
          </div>

          <div class="btn-group-bottom">
            <button type="button" class="inpage-dialog-btn" @click="onNewStyle">New...</button>
            <button
              type="button"
              class="inpage-dialog-btn"
              :disabled="selectedStyleName === 'Normal'"
              @click="onRemoveStyle"
            >
              Remove...
            </button>
            <button type="button" class="inpage-dialog-btn" @click="onModifyStyle">Modify...</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. EDIT STYLE SHEET MODAL -->
    <div
      v-else-if="activeModal === 'edit'"
      class="inpage-modal edit-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Edit Style Sheet"
    >
      <div class="inpage-modal-titlebar">
        <span class="inpage-modal-title">Edit Style Sheet</span>
        <button type="button" class="inpage-titlebar-close" aria-label="Close" @click="onCancelEdit">✕</button>
      </div>

      <div class="inpage-modal-content edit-content">
        <!-- Top row: Key Equivalent + OK/Cancel/Help -->
        <div class="edit-top-row">
          <fieldset class="inpage-groupbox key-groupbox">
            <legend class="inpage-legend">Key Equivalent</legend>
            <div class="key-label">Control + Shift +</div>
            <div class="key-input-row">
              <label>Key:</label>
              <input
                v-model="editDraft.keyEquivalent"
                type="text"
                maxlength="1"
                class="key-char-input"
              />
            </div>
          </fieldset>

          <div class="edit-action-btns">
            <button type="button" class="inpage-dialog-btn default-btn" @click="onSaveEdit">OK</button>
            <button type="button" class="inpage-dialog-btn" @click="onCancelEdit">Cancel</button>
            <button type="button" class="inpage-dialog-btn" @click="emit('help')">Help</button>
          </div>
        </div>

        <!-- Name & Base rows -->
        <div class="edit-fields-section">
          <div class="edit-row">
            <label class="edit-field-label">Name:</label>
            <input
              v-model="editDraft.name"
              type="text"
              class="edit-text-input"
            />
          </div>
          <div class="edit-row">
            <label class="edit-field-label">Base:</label>
            <select v-model="editDraft.base" class="edit-select">
              <option value="Normal">Normal</option>
              <option
                v-for="s in localStyles.filter(s => s.name !== editDraft.name)"
                :key="s.name"
                :value="s.name"
              >
                {{ s.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- 5 Sub-modal buttons grid -->
        <div class="edit-sub-buttons-grid">
          <div class="sub-btn-row">
            <button type="button" class="inpage-dialog-btn sub-modal-btn" @click="openParagraphModal">
              Paragraph...
            </button>
            <button type="button" class="inpage-dialog-btn sub-modal-btn" @click="openCharacterModal">
              Character...
            </button>
          </div>
          <div class="sub-btn-row">
            <button type="button" class="inpage-dialog-btn sub-modal-btn" @click="openBorderModal">
              Border...
            </button>
            <button type="button" class="inpage-dialog-btn sub-modal-btn" @click="openHyphenationModal">
              Hyphenation...
            </button>
          </div>
          <div class="sub-btn-center">
            <button type="button" class="inpage-dialog-btn sub-modal-btn tabs-btn" @click="openTabsModal">
              Tabs...
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. PARAGRAPH PREFERENCES MODAL -->
    <div
      v-else-if="activeModal === 'paragraph'"
      class="inpage-modal paragraph-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Paragraph Preferences"
    >
      <div class="inpage-modal-titlebar">
        <span class="inpage-modal-title">Paragraph Preferences</span>
        <button type="button" class="inpage-titlebar-close" aria-label="Close" @click="activeModal = 'edit'">✕</button>
      </div>

      <div class="inpage-modal-content paragraph-content">
        <!-- Top bar: Alignment & Action buttons -->
        <div class="paragraph-header-row">
          <div class="align-select-wrapper">
            <label>Alignment:</label>
            <select v-model="paragraphDraft.alignment" class="align-select">
              <option value="right">Right</option>
              <option value="left">Left</option>
              <option value="center">Centered</option>
              <option value="justify">Justified</option>
              <option value="full">Forced</option>
            </select>
          </div>

          <div class="paragraph-action-btns">
            <button type="button" class="inpage-dialog-btn default-btn" @click="saveParagraphModal">OK</button>
            <button type="button" class="inpage-dialog-btn" @click="activeModal = 'edit'">Cancel</button>
            <button type="button" class="inpage-dialog-btn" @click="emit('help')">Help</button>
          </div>
        </div>

        <!-- 2 Columns of Groupboxes -->
        <div class="paragraph-columns-grid">
          <!-- Col 1 -->
          <div class="para-col">
            <!-- Indents -->
            <fieldset class="inpage-groupbox">
              <legend class="inpage-legend">Indents</legend>
              <div class="field-row">
                <label>Beginning:</label>
                <input
                  :value="paragraphDraft.beginningIndent + 'mm'"
                  @change="paragraphDraft.beginningIndent = parseNum($event.target.value)"
                  class="para-num-input"
                />
              </div>
              <div class="field-row">
                <label>End:</label>
                <input
                  :value="paragraphDraft.endIndent + 'mm'"
                  @change="paragraphDraft.endIndent = parseNum($event.target.value)"
                  class="para-num-input"
                />
              </div>
              <div class="field-row">
                <label>First Line:</label>
                <input
                  :value="paragraphDraft.firstLineIndent + 'mm'"
                  @change="paragraphDraft.firstLineIndent = parseNum($event.target.value)"
                  class="para-num-input"
                />
              </div>
            </fieldset>

            <!-- Line Spacing -->
            <fieldset class="inpage-groupbox">
              <legend class="inpage-legend">Line Spacing</legend>
              <div class="field-row">
                <label>Line Height:</label>
                <input
                  v-model="paragraphDraft.lineHeight"
                  class="para-num-input"
                />
              </div>
              <div class="field-row">
                <label>Interline Gap:</label>
                <input
                  :value="paragraphDraft.interlineGap + 'pt'"
                  @change="paragraphDraft.interlineGap = parseNum($event.target.value)"
                  class="para-num-input"
                />
              </div>
            </fieldset>

            <!-- Tab -->
            <fieldset class="inpage-groupbox">
              <legend class="inpage-legend">Tab</legend>
              <div class="field-row">
                <label>Default Stop:</label>
                <input
                  :value="paragraphDraft.defaultStop + 'mm'"
                  @change="paragraphDraft.defaultStop = parseNum($event.target.value, 12.7)"
                  class="para-num-input"
                />
              </div>
            </fieldset>
          </div>

          <!-- Col 2 -->
          <div class="para-col">
            <!-- Breaks -->
            <fieldset class="inpage-groupbox">
              <legend class="inpage-legend">Breaks</legend>
              <select v-model="paragraphDraft.breakType" class="breaks-select">
                <option value="None">None</option>
                <option value="Page Before">Page Before</option>
                <option value="Column Before">Column Before</option>
              </select>
              <label class="para-check-label">
                <input v-model="paragraphDraft.keepTogether" type="checkbox" />
                <span>Keep Together</span>
              </label>
              <label class="para-check-label">
                <input v-model="paragraphDraft.keepWithNext" type="checkbox" />
                <span>Keep With Next</span>
              </label>
              <div class="field-row small-field">
                <label>Widows:</label>
                <input v-model.number="paragraphDraft.widows" type="number" min="1" max="20" class="mini-input" />
              </div>
              <div class="field-row small-field">
                <label>Orphans:</label>
                <input v-model.number="paragraphDraft.orphans" type="number" min="1" max="20" class="mini-input" />
              </div>
            </fieldset>

            <!-- Paragraph Spacing -->
            <fieldset class="inpage-groupbox">
              <legend class="inpage-legend">Paragraph Spacing</legend>
              <div class="field-row">
                <label>Before:</label>
                <input
                  :value="paragraphDraft.spaceBefore + 'mm'"
                  @change="paragraphDraft.spaceBefore = parseNum($event.target.value)"
                  class="para-num-input"
                />
              </div>
              <div class="field-row">
                <label>After:</label>
                <input
                  :value="paragraphDraft.spaceAfter + 'mm'"
                  @change="paragraphDraft.spaceAfter = parseNum($event.target.value)"
                  class="para-num-input"
                />
              </div>
            </fieldset>

            <!-- Character Alignment -->
            <fieldset class="inpage-groupbox char-align-groupbox">
              <legend class="inpage-legend">Character Alignment</legend>
              <div class="radio-row">
                <label class="radio-label">
                  <input
                    v-model="paragraphDraft.charAlignment"
                    type="radio"
                    value="Latin"
                  />
                  <span>Latin</span>
                </label>
                <label class="radio-label">
                  <input
                    v-model="paragraphDraft.charAlignment"
                    type="radio"
                    value="Arabic"
                  />
                  <span>Arabic</span>
                </label>
              </div>
            </fieldset>
          </div>
        </div>

        <!-- Bottom Checkbox -->
        <div class="paragraph-footer">
          <label class="para-check-label">
            <input v-model="paragraphDraft.addToToc" type="checkbox" />
            <span>Add to table of contents</span>
          </label>
        </div>
      </div>
    </div>

    <!-- 4. CHARACTER MODAL -->
    <div
      v-else-if="activeModal === 'character'"
      class="inpage-modal character-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Character"
    >
      <div class="inpage-modal-titlebar">
        <span class="inpage-modal-title">Character</span>
        <div class="titlebar-btns">
          <button type="button" class="inpage-titlebar-btn" title="Help" @click="emit('help')">?</button>
          <button type="button" class="inpage-titlebar-close" aria-label="Close" @click="activeModal = 'edit'">✕</button>
        </div>
      </div>

      <div class="inpage-modal-content character-content">
        <div class="char-main-grid">
          <!-- Left fields -->
          <div class="char-fields">
            <!-- Row 1: Size & Style -->
            <div class="char-row">
              <label class="char-label">Size:</label>
              <select
                :value="characterDraft.size + 'pt'"
                @change="characterDraft.size = parseNum($event.target.value, 12)"
                class="char-input-sm"
              >
                <option v-for="pt in [8, 9, 10, 11, 12, 14, 16, 18, 24, 36, 48, 72]" :key="pt" :value="pt + 'pt'">
                  {{ pt }}pt
                </option>
              </select>

              <label class="char-label-mid">Style:</label>
              <select v-model="characterDraft.style" class="char-input-mid">
                <option value="None">None</option>
                <option value="Single">Single</option>
                <option value="Double">Double</option>
                <option value="Overline">Overline</option>
                <option value="Box">Box</option>
              </select>
            </div>

            <!-- Row 2: Color & Hatch -->
            <div class="char-row">
              <label class="char-label">Color:</label>
              <select v-model="characterDraft.color" class="char-input-sm color-select">
                <option v-for="c in colors" :key="c.name" :value="c.value">
                  ■ {{ c.name }}
                </option>
              </select>

              <label class="char-label-mid">Hatch:</label>
              <select v-model="characterDraft.hatch" class="char-input-mid">
                <option value="None">None</option>
                <option value="Horizontal">Horizontal</option>
                <option value="Vertical">Vertical</option>
                <option value="Diagonal">Diagonal</option>
                <option value="Cross">Cross</option>
              </select>
            </div>

            <!-- Row 3: Latin Font Name -->
            <div class="char-row">
              <label class="char-label">Latin Font Name:</label>
              <select v-model="characterDraft.latinFont" class="char-input-full">
                <option value="">&nbsp;</option>
                <option v-for="f in englishFonts" :key="f" :value="f">{{ f }}</option>
              </select>
            </div>

            <!-- Row 4: Urdu Font Name -->
            <div class="char-row">
              <label class="char-label">Urdu Font Name:</label>
              <select v-model="characterDraft.urduFont" class="char-input-full">
                <option v-for="f in urduFonts" :key="f" :value="f">{{ f }}</option>
              </select>
            </div>

            <!-- Row 5: Language -->
            <div class="char-row">
              <label class="char-label">Language:</label>
              <select v-model="characterDraft.language" class="char-input-full">
                <option value="Urdu">Urdu</option>
                <option value="English">English</option>
                <option value="Arabic">Arabic</option>
                <option value="Persian">Persian</option>
              </select>
            </div>

            <!-- Row 6: Bold, Italics, Outline, Kashida -->
            <div class="char-row char-checks-row">
              <label class="char-check"><input v-model="characterDraft.bold" type="checkbox" /> Bold</label>
              <label class="char-check"><input v-model="characterDraft.italics" type="checkbox" /> Italics</label>
              <label class="char-check"><input v-model="characterDraft.outline" type="checkbox" /> Outline</label>

              <label class="kashida-label">Kashida:</label>
              <select v-model="characterDraft.kashida" class="kashida-select">
                <option value="K-None">K-None</option>
                <option value="K-Special">K-Special</option>
                <option value="K-Other">K-Other</option>
              </select>
            </div>

            <!-- Row 7: Spacing, Scaling, Baseline Shift -->
            <div class="char-row metrics-row">
              <label>Spacing:</label>
              <div class="spin-wrap">
                <input
                  :value="characterDraft.spacing + '%'"
                  @change="characterDraft.spacing = parseNum($event.target.value)"
                  class="metric-inp"
                />
                <div class="spin-btns">
                  <button type="button" @click="characterDraft.spacing += 5">▲</button>
                  <button type="button" @click="characterDraft.spacing -= 5">▼</button>
                </div>
              </div>

              <label>Scaling:</label>
              <div class="spin-wrap">
                <input
                  :value="characterDraft.scaling + '%'"
                  @change="characterDraft.scaling = parseNum($event.target.value, 100)"
                  class="metric-inp"
                />
                <div class="spin-btns">
                  <button type="button" @click="characterDraft.scaling += 5">▲</button>
                  <button type="button" @click="characterDraft.scaling = Math.max(10, characterDraft.scaling - 5)">▼</button>
                </div>
              </div>

              <label>Baseline Shift:</label>
              <div class="spin-wrap">
                <input
                  :value="characterDraft.baselineShift + 'pt'"
                  @change="characterDraft.baselineShift = parseNum($event.target.value)"
                  class="metric-inp"
                />
                <div class="spin-btns">
                  <button type="button" @click="characterDraft.baselineShift += 1">▲</button>
                  <button type="button" @click="characterDraft.baselineShift -= 1">▼</button>
                </div>
              </div>
            </div>

            <!-- Row 8: Ligatures -->
            <div class="char-row ligatures-row">
              <label class="char-check"><input v-model="characterDraft.ligatures.meem" type="checkbox" /> Meem</label>
              <label class="char-check"><input v-model="characterDraft.ligatures.re" type="checkbox" /> Re</label>
              <label class="char-check"><input v-model="characterDraft.ligatures.jeem" type="checkbox" /> Jeem</label>
              <label class="char-check"><input v-model="characterDraft.ligatures.ain" type="checkbox" /> Ain</label>
              <label class="char-check"><input v-model="characterDraft.ligatures.kaaf" type="checkbox" /> Kaaf</label>
            </div>
          </div>

          <!-- Right Action Buttons -->
          <div class="char-actions">
            <button type="button" class="inpage-dialog-btn default-btn" @click="saveCharacterModal">OK</button>
            <button type="button" class="inpage-dialog-btn" @click="activeModal = 'edit'">Cancel</button>
            <button type="button" class="inpage-dialog-btn" @click="emit('help')">Help</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 5. BORDER ATTRIBUTES MODAL -->
    <div
      v-else-if="activeModal === 'border'"
      class="inpage-modal border-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Border Attributes"
    >
      <div class="inpage-modal-titlebar">
        <span class="inpage-modal-title">Border Attributes</span>
        <button type="button" class="inpage-titlebar-close" aria-label="Close" @click="activeModal = 'edit'">✕</button>
      </div>

      <div class="inpage-modal-content border-content">
        <div class="border-left-groups">
          <!-- Above -->
          <fieldset class="inpage-groupbox border-groupbox">
            <legend class="inpage-legend">Above</legend>
            <div class="border-box-inner">
              <select v-model="borderDraft.borderAbove" class="border-select">
                <option value="None">None</option>
                <option value="Hairline">Hairline</option>
                <option value="0.5pt">0.5pt</option>
                <option value="1pt">1pt</option>
                <option value="1.5pt">1.5pt</option>
                <option value="2pt">2pt</option>
                <option value="3pt">3pt</option>
                <option value="4pt">4pt</option>
              </select>
              <button
                type="button"
                class="inpage-dialog-btn style-toggle-btn"
                @click="borderDraft.borderAboveStyle = borderDraft.borderAboveStyle === 'Solid' ? 'Dashed' : borderDraft.borderAboveStyle === 'Dashed' ? 'Dotted' : 'Solid'"
              >
                Style...
              </button>
            </div>
          </fieldset>

          <!-- Below -->
          <fieldset class="inpage-groupbox border-groupbox">
            <legend class="inpage-legend">Below</legend>
            <div class="border-box-inner">
              <select v-model="borderDraft.borderBelow" class="border-select">
                <option value="None">None</option>
                <option value="Hairline">Hairline</option>
                <option value="0.5pt">0.5pt</option>
                <option value="1pt">1pt</option>
                <option value="1.5pt">1.5pt</option>
                <option value="2pt">2pt</option>
                <option value="3pt">3pt</option>
                <option value="4pt">4pt</option>
              </select>
              <button
                type="button"
                class="inpage-dialog-btn style-toggle-btn"
                @click="borderDraft.borderBelowStyle = borderDraft.borderBelowStyle === 'Solid' ? 'Dashed' : borderDraft.borderBelowStyle === 'Dashed' ? 'Dotted' : 'Solid'"
              >
                Style...
              </button>
            </div>
          </fieldset>
        </div>

        <div class="border-action-btns">
          <button type="button" class="inpage-dialog-btn default-btn" @click="saveBorderModal">OK</button>
          <button type="button" class="inpage-dialog-btn" @click="activeModal = 'edit'">Cancel</button>
          <button type="button" class="inpage-dialog-btn" @click="emit('help')">Help</button>
        </div>
      </div>
    </div>

    <!-- 6. HYPHENATION MODAL -->
    <div
      v-else-if="activeModal === 'hyphenation'"
      class="inpage-modal hyphenation-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Hyphenation"
    >
      <div class="inpage-modal-titlebar">
        <span class="inpage-modal-title">Hyphenation</span>
        <button type="button" class="inpage-titlebar-close" aria-label="Close" @click="activeModal = 'edit'">✕</button>
      </div>

      <div class="inpage-modal-content hyphenation-content">
        <div class="hyphenation-left">
          <fieldset class="inpage-groupbox hyphen-groupbox">
            <legend class="inpage-legend">Hyphenation</legend>
            <div class="radio-row">
              <label class="radio-label">
                <input v-model="hyphenationDraft.hyphenation" type="radio" value="None" />
                <span>None</span>
              </label>
              <label class="radio-label">
                <input v-model="hyphenationDraft.hyphenation" type="radio" value="Light" />
                <span>Light</span>
              </label>
              <label class="radio-label">
                <input v-model="hyphenationDraft.hyphenation" type="radio" value="Heavy" />
                <span>Heavy</span>
              </label>
            </div>
          </fieldset>

          <div class="hyphen-max-row">
            <label>Maximum Consecutive Hyphenated Lines :</label>
            <input
              v-model.number="hyphenationDraft.maxConsecutiveHyphens"
              type="number"
              min="1"
              max="10"
              class="hyphen-num-input"
            />
          </div>
        </div>

        <div class="hyphen-action-btns">
          <button type="button" class="inpage-dialog-btn default-btn" @click="saveHyphenationModal">OK</button>
          <button type="button" class="inpage-dialog-btn" @click="activeModal = 'edit'">Cancel</button>
          <button type="button" class="inpage-dialog-btn" @click="emit('help')">Help</button>
        </div>
      </div>
    </div>

    <!-- 7. TABS MODAL -->
    <div
      v-else-if="activeModal === 'tabs'"
      class="inpage-modal tabs-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Tabs"
    >
      <div class="inpage-modal-titlebar">
        <span class="inpage-modal-title">Tabs</span>
        <button type="button" class="inpage-titlebar-close" aria-label="Close" @click="activeModal = 'edit'">✕</button>
      </div>

      <div class="inpage-modal-content tabs-content">
        <!-- Top header row -->
        <div class="tabs-top-row">
          <div class="tab-input-col pos-col">
            <label>Position:</label>
            <input v-model="tabsDraft.position" type="text" class="tab-top-input" />
          </div>
          <div class="tab-input-col align-col">
            <label>Alignment:</label>
            <select v-model="tabsDraft.alignment" class="tab-top-select">
              <option value="Left">Left</option>
              <option value="Right">Right</option>
              <option value="Center">Center</option>
              <option value="Decimal">Decimal</option>
            </select>
          </div>
          <div class="tab-input-col leader-col">
            <label>Leader:</label>
            <select v-model="tabsDraft.leader" class="tab-top-select">
              <option value="None">&nbsp;</option>
              <option value="...">...</option>
              <option value="---">---</option>
              <option value="___">___</option>
            </select>
          </div>
        </div>

        <!-- Middle row: Listbox + Tab buttons + OK/Cancel -->
        <div class="tabs-body-row">
          <div class="tabs-listbox" role="listbox">
            <div
              v-for="(t, idx) in tabsDraft.list"
              :key="idx"
              class="tab-item"
              :class="{ selected: tabsDraft.selectedTabIdx === idx }"
              @click="selectTab(idx)"
            >
              {{ t.position }}&nbsp;&nbsp;&nbsp;{{ t.alignment }}&nbsp;&nbsp;&nbsp;{{ t.leader }}
            </div>
          </div>

          <div class="tabs-mid-btns">
            <button type="button" class="inpage-dialog-btn" @click="addTab">Add</button>
            <button
              type="button"
              class="inpage-dialog-btn"
              :disabled="tabsDraft.selectedTabIdx < 0"
              @click="modifyTab"
            >
              Modify
            </button>
            <button
              type="button"
              class="inpage-dialog-btn"
              :disabled="tabsDraft.selectedTabIdx < 0"
              @click="removeTab"
            >
              Remove
            </button>
            <button type="button" class="inpage-dialog-btn" @click="removeAllTabs">Remove All</button>
          </div>

          <div class="tabs-right-btns">
            <button type="button" class="inpage-dialog-btn default-btn" @click="saveTabsModal">OK</button>
            <button type="button" class="inpage-dialog-btn" @click="activeModal = 'edit'">Cancel</button>
            <button type="button" class="inpage-dialog-btn" @click="emit('help')">Help</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Backdrop */
.inpage-modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

/* Modal Frame */
.inpage-modal {
  background-color: #ece9d8;
  border: 1px solid #707070;
  border-radius: 4px;
  box-shadow: 2px 4px 14px rgba(0, 0, 0, 0.45);
  font-family: Tahoma, 'Segoe UI', Arial, sans-serif;
  font-size: 11px;
  color: #000;
  box-sizing: border-box;
  overflow: hidden;
  user-select: none;
}

/* Titlebar */
.inpage-modal-titlebar {
  background: #ece9d8;
  color: #000;
  padding: 5px 8px 4px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
}

.inpage-modal-title {
  font-size: 11px;
  color: #000;
}

.titlebar-btns {
  display: flex;
  gap: 3px;
  align-items: center;
}

.inpage-titlebar-btn,
.inpage-titlebar-close {
  background: transparent;
  border: none;
  color: #666;
  font-size: 11px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  border-radius: 2px;
}

.inpage-titlebar-close:hover {
  background: #d84a38;
  color: #fff;
}

.inpage-titlebar-btn:hover {
  background: #ddd;
}

.inpage-modal-content {
  padding: 8px 10px 10px 10px;
  box-sizing: border-box;
}

/* Etched Groupbox */
.inpage-groupbox {
  border: 1px solid #d0d0c8;
  box-shadow: inset 1px 1px 0 #ffffff;
  border-radius: 3px;
  margin: 0;
  padding: 6px 8px;
  box-sizing: border-box;
  position: relative;
}

.inpage-legend {
  font-size: 11px;
  color: #000;
  padding: 0 4px;
  margin-left: 2px;
}

/* Win32 Push Buttons */
.inpage-dialog-btn {
  height: 22px;
  background: #ece9d8;
  border: 1px solid #707070;
  box-shadow: inset 1px 1px 0 #fff, inset -1px -1px 0 #cfcfcf;
  font-family: Tahoma, 'Segoe UI', Arial, sans-serif;
  font-size: 11px;
  color: #000;
  padding: 0 10px;
  cursor: pointer;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.inpage-dialog-btn:hover:not(:disabled) {
  background: #f2efe0;
}

.inpage-dialog-btn:active:not(:disabled) {
  box-shadow: inset 1px 1px 0 #888;
}

.inpage-dialog-btn:disabled {
  color: #888;
  cursor: default;
}

.default-btn {
  border: 1px solid #0055ea;
  outline: 1px solid #000;
  font-weight: 500;
}

/* Listbox */
.inpage-listbox {
  width: 100%;
  height: 140px;
  background: #fff;
  border: 1px solid #7f9db9;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  font-size: 11px;
}

.listbox-item {
  padding: 2px 4px;
  cursor: pointer;
  white-space: nowrap;
}

.listbox-item.selected {
  background-color: #0078d7;
  color: #fff;
}

/* ====================================================
   1. DEFINE STYLE SHEETS MODAL
   ==================================================== */
.define-modal {
  width: 330px;
}

.define-content {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.define-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.list-label {
  font-size: 11px;
  color: #000;
}

.define-right-buttons {
  width: 66px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.btn-group-top,
.btn-group-bottom {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.define-right-buttons .inpage-dialog-btn {
  width: 100%;
}

/* ====================================================
   2. EDIT STYLE SHEET MODAL
   ==================================================== */
.edit-modal {
  width: 300px;
}

.edit-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.edit-top-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.key-groupbox {
  flex: 1;
  padding: 4px 8px 6px 8px;
}

.key-label {
  font-size: 11px;
  margin-bottom: 4px;
}

.key-input-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.key-char-input {
  width: 22px;
  height: 18px;
  text-align: center;
  border: 1px solid #7f9db9;
  background: #fff;
  font-family: inherit;
  font-size: 11px;
}

.edit-action-btns {
  width: 66px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.edit-action-btns .inpage-dialog-btn {
  width: 100%;
}

.edit-fields-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 2px;
}

.edit-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.edit-field-label {
  width: 44px;
}

.edit-text-input,
.edit-select {
  flex: 1;
  height: 20px;
  border: 1px solid #7f9db9;
  background: #fff;
  font-family: inherit;
  font-size: 11px;
  padding: 1px 4px;
  box-sizing: border-box;
}

.edit-sub-buttons-grid {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 4px;
}

.sub-btn-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.sub-modal-btn {
  flex: 1;
  height: 22px;
}

.sub-btn-center {
  display: flex;
  justify-content: center;
}

.tabs-btn {
  width: 100px;
}

/* ====================================================
   3. PARAGRAPH PREFERENCES MODAL
   ==================================================== */
.paragraph-modal {
  width: 440px;
}

.paragraph-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.paragraph-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.align-select-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
}

.align-select {
  width: 90px;
  height: 20px;
  border: 1px solid #7f9db9;
  background: #fff;
  font-family: inherit;
  font-size: 11px;
}

.paragraph-action-btns {
  width: 66px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.paragraph-action-btns .inpage-dialog-btn {
  width: 100%;
}

.paragraph-columns-grid {
  display: flex;
  gap: 8px;
}

.para-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 3px;
}

.field-row.small-field {
  justify-content: flex-start;
  gap: 12px;
}

.para-num-input {
  width: 68px;
  height: 18px;
  border: 1px solid #7f9db9;
  background: #fff;
  font-family: inherit;
  font-size: 11px;
  padding: 1px 4px;
  box-sizing: border-box;
}

.mini-input {
  width: 48px;
  height: 18px;
  border: 1px solid #7f9db9;
  background: #fff;
  font-size: 11px;
  padding: 1px 3px;
}

.breaks-select {
  width: 100%;
  height: 20px;
  border: 1px solid #7f9db9;
  background: #fff;
  margin-bottom: 4px;
  font-size: 11px;
}

.para-check-label {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 3px 0;
  cursor: pointer;
  font-size: 11px;
}

.char-align-groupbox {
  margin-top: 2px;
}

.radio-row {
  display: flex;
  gap: 14px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.paragraph-footer {
  margin-top: 2px;
}

/* ====================================================
   4. CHARACTER MODAL
   ==================================================== */
.character-modal {
  width: 460px;
}

.character-content {
  padding: 6px 10px 10px 10px;
}

.char-main-grid {
  display: flex;
  gap: 10px;
}

.char-fields {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.char-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.char-label {
  width: 100px;
  white-space: nowrap;
}

.char-label-mid {
  width: 36px;
  text-align: right;
}

.char-input-sm {
  width: 76px;
  height: 20px;
  border: 1px solid #7f9db9;
  background: #fff;
  font-size: 11px;
}

.char-input-mid {
  width: 84px;
  height: 20px;
  border: 1px solid #7f9db9;
  background: #fff;
  font-size: 11px;
}

.char-input-full {
  flex: 1;
  height: 20px;
  border: 1px solid #7f9db9;
  background: #fff;
  font-size: 11px;
}

.char-checks-row {
  margin: 2px 0;
  gap: 10px;
}

.char-check {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.kashida-label {
  margin-left: auto;
}

.kashida-select {
  width: 80px;
  height: 20px;
  border: 1px solid #7f9db9;
  background: #fff;
  font-size: 11px;
}

.metrics-row {
  gap: 6px;
  font-size: 10px;
}

.spin-wrap {
  position: relative;
  display: flex;
  align-items: center;
  width: 54px;
  height: 20px;
  border: 1px solid #7f9db9;
  background: #fff;
}

.metric-inp {
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  padding: 0 14px 0 3px;
  font-size: 10px;
  outline: none;
}

.spin-btns {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 12px;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #ccc;
  background: #f0f0f0;
}

.spin-btns button {
  flex: 1;
  padding: 0;
  border: none;
  background: #ece9d8;
  border-bottom: 1px solid #bbb;
  font-size: 5px;
  cursor: pointer;
}

.spin-btns button:last-child {
  border-bottom: none;
}

.ligatures-row {
  gap: 10px;
  margin-top: 2px;
}

.char-actions {
  width: 66px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.char-actions .inpage-dialog-btn {
  width: 100%;
}

/* ====================================================
   5. BORDER ATTRIBUTES MODAL
   ==================================================== */
.border-modal {
  width: 270px;
}

.border-content {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.border-left-groups {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.border-groupbox {
  padding: 4px 8px 6px 8px;
}

.border-box-inner {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.border-select {
  width: 100%;
  height: 20px;
  border: 1px solid #7f9db9;
  background: #fff;
  font-size: 11px;
}

.style-toggle-btn {
  width: 60px;
  height: 20px;
}

.border-action-btns {
  width: 66px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.border-action-btns .inpage-dialog-btn {
  width: 100%;
}

/* ====================================================
   6. HYPHENATION MODAL
   ==================================================== */
.hyphenation-modal {
  width: 270px;
}

.hyphenation-content {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.hyphenation-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hyphen-groupbox {
  padding: 4px 6px 6px 6px;
}

.hyphen-max-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  font-size: 10px;
}

.hyphen-num-input {
  width: 24px;
  height: 18px;
  border: 1px solid #7f9db9;
  background: #fff;
  text-align: center;
  font-size: 11px;
}

.hyphen-action-btns {
  width: 66px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hyphen-action-btns .inpage-dialog-btn {
  width: 100%;
}

/* ====================================================
   7. TABS MODAL
   ==================================================== */
.tabs-modal {
  width: 350px;
}

.tabs-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tabs-top-row {
  display: flex;
  gap: 8px;
}

.tab-input-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pos-col {
  width: 70px;
}

.align-col {
  width: 76px;
}

.leader-col {
  width: 76px;
}

.tab-top-input,
.tab-top-select {
  height: 20px;
  border: 1px solid #7f9db9;
  background: #fff;
  font-size: 11px;
  box-sizing: border-box;
}

.tabs-body-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.tabs-listbox {
  width: 160px;
  height: 80px;
  background: #fff;
  border: 1px solid #7f9db9;
  overflow-y: auto;
}

.tab-item {
  padding: 2px 4px;
  cursor: pointer;
  font-size: 11px;
}

.tab-item.selected {
  background-color: #0078d7;
  color: #fff;
}

.tabs-mid-btns,
.tabs-right-btns {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tabs-mid-btns .inpage-dialog-btn,
.tabs-right-btns .inpage-dialog-btn {
  width: 66px;
}
</style>
