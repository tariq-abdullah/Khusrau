<script setup>
import { ref, watch, onMounted, computed, nextTick } from 'vue'

const emit = defineEmits(['create', 'close', 'help'])

const PRESETS = [
  { name: 'A4 210x297mm', width: 210, height: 297 },
  { name: 'Letter 8.5x11in', width: 215.9, height: 279.4 },
  { name: 'Legal 8.5x14in', width: 215.9, height: 355.6 },
  { name: 'A5 148x210mm', width: 148, height: 210 },
  { name: 'B4 250x353mm', width: 250, height: 353 },
  { name: 'B5 176x250mm', width: 176, height: 250 },
  { name: 'Custom', width: 210, height: 297 }
]

const STORAGE_KEY = 'inpage_doc_defaults'

// State variables
const pagePreset = ref('A4 210x297mm')
const width = ref(210)
const height = ref(297)
const orientation = ref('portrait') // 'portrait' | 'landscape'
const pages = ref(1)

const marginLeft = ref(12.7)
const marginRight = ref(12.7)
const marginTop = ref(12.7)
const marginBottom = ref(12.7)

const direction = ref('rtl') // 'rtl' | 'ltr'
const columns = ref(1)
const gutter = ref(4.23)

const autoTextBox = ref(true)
const doubleSided = ref(false)
const facingPages = ref(false)

const savedNotice = ref(false)

// Display strings with 'mm' suffix
const widthDisplay = computed({
  get: () => `${formatNumber(width.value)}mm`,
  set: (val) => {
    width.value = parseMm(val)
    checkIfCustom()
  }
})

const heightDisplay = computed({
  get: () => `${formatNumber(height.value)}mm`,
  set: (val) => {
    height.value = parseMm(val)
    checkIfCustom()
  }
})

const marginLeftDisplay = computed({
  get: () => `${formatNumber(marginLeft.value)}mm`,
  set: (val) => { marginLeft.value = parseMm(val) }
})

const marginRightDisplay = computed({
  get: () => `${formatNumber(marginRight.value)}mm`,
  set: (val) => { marginRight.value = parseMm(val) }
})

const marginTopDisplay = computed({
  get: () => `${formatNumber(marginTop.value)}mm`,
  set: (val) => { marginTop.value = parseMm(val) }
})

const marginBottomDisplay = computed({
  get: () => `${formatNumber(marginBottom.value)}mm`,
  set: (val) => { marginBottom.value = parseMm(val) }
})

const gutterDisplay = computed({
  get: () => `${formatNumber(gutter.value)}mm`,
  set: (val) => { gutter.value = parseMm(val) }
})

function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '0'
  return parseFloat(Number(num).toFixed(2)).toString()
}

function parseMm(str) {
  if (typeof str === 'number') return Math.max(0, str)
  const cleaned = (str || '').replace(/[^\d.-]/g, '')
  const val = parseFloat(cleaned)
  return isNaN(val) ? 0 : Math.max(0, val)
}

function checkIfCustom() {
  const minDim = Math.min(width.value, height.value)
  const maxDim = Math.max(width.value, height.value)

  const match = PRESETS.find(p =>
    p.name !== 'Custom' &&
    Math.abs(Math.min(p.width, p.height) - minDim) < 0.2 &&
    Math.abs(Math.max(p.width, p.height) - maxDim) < 0.2
  )

  if (match) {
    pagePreset.value = match.name
  } else {
    pagePreset.value = 'Custom'
  }
}

function onPresetChange() {
  const found = PRESETS.find(p => p.name === pagePreset.value)
  if (!found || found.name === 'Custom') return

  if (orientation.value === 'landscape') {
    width.value = Math.max(found.width, found.height)
    height.value = Math.min(found.width, found.height)
  } else {
    width.value = Math.min(found.width, found.height)
    height.value = Math.max(found.width, found.height)
  }
}

function setOrientation(newOrient) {
  if (orientation.value === newOrient) return
  orientation.value = newOrient

  // Switching orientation switches value of width and height!
  const prevWidth = width.value
  const prevHeight = height.value
  width.value = prevHeight
  height.value = prevWidth
}

// When Double Sided is unchecked, Facing Pages must be disabled and unchecked
watch(doubleSided, (val) => {
  if (!val) {
    facingPages.value = false
  }
})

// Spinners
function stepPages(delta) {
  pages.value = Math.max(1, Math.min(200, pages.value + delta))
}

function stepColumns(delta) {
  columns.value = Math.max(1, Math.min(12, columns.value + delta))
}

function stepGutter(delta) {
  gutter.value = Math.max(0, Math.min(100, parseFloat((gutter.value + delta).toFixed(2))))
}

function loadDefaults() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const d = JSON.parse(raw)
    if (d.pagePreset) pagePreset.value = d.pagePreset
    if (d.width) width.value = Number(d.width)
    if (d.height) height.value = Number(d.height)
    if (d.orientation) orientation.value = d.orientation
    if (d.pages) pages.value = Number(d.pages)
    if (d.marginLeft !== undefined) marginLeft.value = Number(d.marginLeft)
    if (d.marginRight !== undefined) marginRight.value = Number(d.marginRight)
    if (d.marginTop !== undefined) marginTop.value = Number(d.marginTop)
    if (d.marginBottom !== undefined) marginBottom.value = Number(d.marginBottom)
    if (d.direction) direction.value = d.direction
    if (d.columns) columns.value = Number(d.columns)
    if (d.gutter !== undefined) gutter.value = Number(d.gutter)
    if (d.autoTextBox !== undefined) autoTextBox.value = !!d.autoTextBox
    if (d.doubleSided !== undefined) doubleSided.value = !!d.doubleSided
    if (d.facingPages !== undefined) facingPages.value = !!d.facingPages
  } catch {
    // Ignore invalid storage
  }
}

function saveAsDefault() {
  const def = {
    pagePreset: pagePreset.value,
    width: width.value,
    height: height.value,
    orientation: orientation.value,
    pages: pages.value,
    marginLeft: marginLeft.value,
    marginRight: marginRight.value,
    marginTop: marginTop.value,
    marginBottom: marginBottom.value,
    direction: direction.value,
    columns: columns.value,
    gutter: gutter.value,
    autoTextBox: autoTextBox.value,
    doubleSided: doubleSided.value,
    facingPages: facingPages.value
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(def))
  savedNotice.value = true
  setTimeout(() => { savedNotice.value = false }, 1800)
}

function syncActiveInput() {
  const active = document.activeElement
  if (!active) return
  if (active.id === 'newdoc-width') width.value = parseMm(active.value)
  else if (active.id === 'newdoc-height') height.value = parseMm(active.value)
  else if (active.id === 'newdoc-margin-left') marginLeft.value = parseMm(active.value)
  else if (active.id === 'newdoc-margin-right') marginRight.value = parseMm(active.value)
  else if (active.id === 'newdoc-margin-top') marginTop.value = parseMm(active.value)
  else if (active.id === 'newdoc-margin-bottom') marginBottom.value = parseMm(active.value)
  else if (active.id === 'newdoc-gutter') gutter.value = parseMm(active.value)
}

function handleOk() {
  syncActiveInput()
  emit('create', {
    pagePreset: pagePreset.value,
    width: width.value,
    height: height.value,
    orientation: orientation.value,
    pages: pages.value,
    marginLeft: marginLeft.value,
    marginRight: marginRight.value,
    marginTop: marginTop.value,
    marginBottom: marginBottom.value,
    direction: direction.value,
    columns: columns.value,
    gutter: gutter.value,
    autoTextBox: autoTextBox.value,
    doubleSided: doubleSided.value,
    facingPages: facingPages.value
  })
}

function onKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault()
    handleOk()
    return
  } else if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
    return
  }

  // Accelerators with Alt key
  if (e.altKey) {
    const k = e.key.toLowerCase()
    if (k === 'r') {
      e.preventDefault()
      setOrientation('portrait')
    } else if (k === 'a') {
      e.preventDefault()
      setOrientation('landscape')
    } else if (k === 'w') {
      e.preventDefault()
      document.getElementById('newdoc-width')?.focus()
    } else if (k === 'h') {
      e.preventDefault()
      document.getElementById('newdoc-height')?.focus()
    } else if (k === 'e') {
      e.preventDefault()
      document.getElementById('newdoc-pages')?.focus()
    } else if (k === 's') {
      e.preventDefault()
      saveAsDefault()
    } else if (k === 'd') {
      e.preventDefault()
      doubleSided.value = !doubleSided.value
    } else if (k === 't') {
      e.preventDefault()
      autoTextBox.value = !autoTextBox.value
    } else if (k === 'f' && doubleSided.value) {
      e.preventDefault()
      facingPages.value = !facingPages.value
    }
  }
}

onMounted(() => {
  loadDefaults()
})
</script>

<template>
  <div class="inpage-modal-backdrop" @click.self="emit('close')">
    <div
      class="inpage-modal"
      role="dialog"
      aria-modal="true"
      aria-label="New Document"
      tabindex="-1"
      @keydown="onKeydown"
    >
      <!-- Title Bar -->
      <div class="inpage-modal-titlebar">
        <span class="inpage-modal-title">New Document</span>
        <button
          type="button"
          class="inpage-titlebar-close"
          aria-label="Close"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <!-- Main Dialog Body -->
      <div class="inpage-modal-content">
        <!-- Column 1: Page -->
        <fieldset class="inpage-groupbox page-groupbox">
          <legend class="inpage-legend"><u>P</u>age</legend>

          <!-- Preset selector -->
          <div class="groupbox-row select-row">
            <select
              v-model="pagePreset"
              class="inpage-select"
              @change="onPresetChange"
            >
              <option v-for="p in PRESETS" :key="p.name" :value="p.name">
                {{ p.name }}
              </option>
            </select>
          </div>

          <!-- Width -->
          <div class="groupbox-row">
            <label class="row-label" for="newdoc-width"><u>W</u>idth:</label>
            <input
              id="newdoc-width"
              v-model.lazy="widthDisplay"
              type="text"
              class="standalone-input"
            />
          </div>

          <!-- Height -->
          <div class="groupbox-row">
            <label class="row-label" for="newdoc-height"><u>H</u>eight:</label>
            <input
              id="newdoc-height"
              v-model.lazy="heightDisplay"
              type="text"
              class="standalone-input"
            />
          </div>

          <!-- Orientation sub-groupbox -->
          <fieldset class="inpage-groupbox orientation-groupbox">
            <legend class="inpage-legend">Orientation</legend>
            <label class="radio-label" @click="setOrientation('portrait')">
              <input
                type="radio"
                name="orientation"
                value="portrait"
                :checked="orientation === 'portrait'"
                @change="setOrientation('portrait')"
              />
              <span class="radio-text">Port<u>r</u>ait</span>
            </label>
            <label class="radio-label" @click="setOrientation('landscape')">
              <input
                type="radio"
                name="orientation"
                value="landscape"
                :checked="orientation === 'landscape'"
                @change="setOrientation('landscape')"
              />
              <span class="radio-text">L<u>a</u>ndscape</span>
            </label>
          </fieldset>

          <!-- Pages count -->
          <div class="groupbox-row pages-row">
            <label class="row-label" for="newdoc-pages">Pag<u>e</u>s:</label>
            <div class="spin-input-wrapper small-spin">
              <input
                id="newdoc-pages"
                v-model.number="pages"
                type="number"
                min="1"
                max="200"
              />
              <div class="spin-buttons">
                <button type="button" class="spin-btn" @click="stepPages(1)">▲</button>
                <button type="button" class="spin-btn" @click="stepPages(-1)">▼</button>
              </div>
            </div>
          </div>
        </fieldset>

        <!-- Column 2: Margins & Direction -->
        <div class="column-middle">
          <!-- Margins groupbox -->
          <fieldset class="inpage-groupbox margins-groupbox">
            <legend class="inpage-legend"><u>M</u>argins</legend>

            <div class="groupbox-row">
              <label class="row-label margin-label" for="newdoc-margin-left">
                <u>{{ doubleSided ? 'I' : 'L' }}</u>{{ doubleSided ? 'nside:' : 'eft:' }}
              </label>
              <input
                id="newdoc-margin-left"
                v-model.lazy="marginLeftDisplay"
                type="text"
                class="standalone-input margin-input"
              />
            </div>

            <div class="groupbox-row">
              <label class="row-label margin-label" for="newdoc-margin-right">
                <u>{{ doubleSided ? 'O' : 'R' }}</u>{{ doubleSided ? 'utside:' : 'ight:' }}
              </label>
              <input
                id="newdoc-margin-right"
                v-model.lazy="marginRightDisplay"
                type="text"
                class="standalone-input margin-input"
              />
            </div>

            <div class="groupbox-row">
              <label class="row-label margin-label" for="newdoc-margin-top">T<u>o</u>p:</label>
              <input
                id="newdoc-margin-top"
                v-model.lazy="marginTopDisplay"
                type="text"
                class="standalone-input margin-input"
              />
            </div>

            <div class="groupbox-row">
              <label class="row-label margin-label" for="newdoc-margin-bottom"><u>B</u>ottom:</label>
              <input
                id="newdoc-margin-bottom"
                v-model.lazy="marginBottomDisplay"
                type="text"
                class="standalone-input margin-input"
              />
            </div>
          </fieldset>

          <!-- Direction groupbox -->
          <fieldset class="inpage-groupbox direction-groupbox">
            <legend class="inpage-legend"><u>D</u>irection</legend>
            <label class="radio-label">
              <input
                type="radio"
                name="direction"
                value="ltr"
                v-model="direction"
              />
              <span class="radio-text">Left To Right</span>
            </label>
            <label class="radio-label active-focus">
              <input
                type="radio"
                name="direction"
                value="rtl"
                v-model="direction"
              />
              <span class="radio-text"><u>R</u>ight To Left</span>
            </label>
          </fieldset>
        </div>

        <!-- Column 3: Columns, Checkboxes & Action Buttons -->
        <div class="column-right">
          <!-- Top row of right column: Columns groupbox + 3 Action Buttons -->
          <div class="columns-actions-wrapper">
            <!-- Columns groupbox -->
            <fieldset class="inpage-groupbox columns-groupbox">
              <legend class="inpage-legend">Colu<u>m</u>ns</legend>

              <div class="groupbox-row columns-count-row">
                <div class="spin-input-wrapper column-spin">
                  <input
                    v-model.number="columns"
                    type="number"
                    min="1"
                    max="12"
                    aria-label="Columns"
                  />
                  <div class="spin-buttons">
                    <button type="button" class="spin-btn" @click="stepColumns(1)">▲</button>
                    <button type="button" class="spin-btn" @click="stepColumns(-1)">▼</button>
                  </div>
                </div>
              </div>

              <div class="groupbox-row gutter-label-row">
                <label class="row-label gutter-label" for="newdoc-gutter"><u>G</u>utter:</label>
              </div>

              <div class="groupbox-row gutter-input-row">
                <div class="spin-input-wrapper column-spin">
                  <input
                    id="newdoc-gutter"
                    v-model.lazy="gutterDisplay"
                    type="text"
                  />
                  <div class="spin-buttons">
                    <button type="button" class="spin-btn" @click="stepGutter(0.5)">▲</button>
                    <button type="button" class="spin-btn" @click="stepGutter(-0.5)">▼</button>
                  </div>
                </div>
              </div>
            </fieldset>

            <!-- Buttons: OK, Cancel, Help -->
            <div class="dialog-main-buttons">
              <button
                type="button"
                class="inpage-dialog-btn default-btn"
                @click="handleOk"
              >
                OK
              </button>
              <button
                type="button"
                class="inpage-dialog-btn"
                @click="emit('close')"
              >
                Cancel
              </button>
              <button
                type="button"
                class="inpage-dialog-btn"
                @click="emit('help')"
              >
                Help
              </button>
            </div>
          </div>

          <!-- Checkboxes section -->
          <div class="checkboxes-section">
            <label class="inpage-checkbox-label">
              <input
                v-model="autoTextBox"
                type="checkbox"
              />
              <span>Automatic <u>T</u>ext Box</span>
            </label>

            <label class="inpage-checkbox-label">
              <input
                v-model="doubleSided"
                type="checkbox"
              />
              <span><u>D</u>ouble Sided</span>
            </label>

            <label
              class="inpage-checkbox-label"
              :class="{ disabled: !doubleSided }"
            >
              <input
                v-model="facingPages"
                type="checkbox"
                :disabled="!doubleSided"
              />
              <span>Facing Pages</span>
            </label>
          </div>

          <!-- Save as Default Button -->
          <div class="save-default-wrapper">
            <button
              type="button"
              class="inpage-dialog-btn save-default-btn"
              @click="saveAsDefault"
            >
              <u>S</u>ave as Default
            </button>
            <span v-if="savedNotice" class="saved-indicator">Saved!</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Modal Backdrop Overlay */
.inpage-modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

/* Modal Window Container */
.inpage-modal {
  width: 486px;
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

/* Win32 Dialog Title Bar */
.inpage-modal-titlebar {
  background: #ece9d8;
  color: #000;
  padding: 6px 8px 4px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
}

.inpage-modal-title {
  font-size: 11px;
  font-weight: normal;
  color: #000;
}

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

/* Dialog Body Layout (3 Columns) */
.inpage-modal-content {
  display: flex;
  padding: 4px 10px 10px 10px;
  gap: 8px;
  box-sizing: border-box;
  align-items: flex-start;
}

/* GroupBox (Fieldset) with Etched Border */
.inpage-groupbox {
  border: 1px solid #d0d0c8;
  box-shadow: inset 1px 1px 0 #ffffff;
  border-radius: 3px;
  margin: 0;
  padding: 6px 7px 6px 7px;
  box-sizing: border-box;
  position: relative;
}

.inpage-legend {
  font-size: 11px;
  color: #000;
  padding: 0 4px;
  margin-left: 2px;
}

/* Column 1: Page */
.page-groupbox {
  width: 146px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.groupbox-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.select-row {
  margin-bottom: 2px;
}

.inpage-select {
  width: 100%;
  height: 21px;
  background: #fff;
  border: 1px solid #7f9db9;
  font-family: inherit;
  font-size: 11px;
  padding: 1px 2px;
  box-sizing: border-box;
  outline: none;
}

.row-label {
  font-size: 11px;
  color: #000;
  white-space: nowrap;
}

/* Text Inputs without spinners */
.standalone-input {
  width: 78px;
  height: 20px;
  background: #fff;
  border: 1px solid #7f9db9;
  font-family: inherit;
  font-size: 11px;
  color: #000;
  padding: 1px 4px;
  box-sizing: border-box;
  outline: none;
}

.standalone-input:focus {
  border-color: #0055ea;
}

/* Text & Spin Inputs */
.spin-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 78px;
  height: 20px;
  background: #fff;
  border: 1px solid #7f9db9;
  box-sizing: border-box;
}

.spin-input-wrapper input {
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  padding: 0 16px 0 4px;
  font-family: inherit;
  font-size: 11px;
  color: #000;
  background: transparent;
  box-sizing: border-box;
}

/* Classic Spin Buttons (▲ / ▼) */
.spin-buttons {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 14px;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #ccc;
  background: #f0f0f0;
}

.spin-btn {
  flex: 1;
  padding: 0;
  margin: 0;
  border: none;
  background: #ece9d8;
  border-bottom: 1px solid #bbb;
  font-size: 6px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #222;
}

.spin-btn:last-child {
  border-bottom: none;
}

.spin-btn:hover {
  background: #e2dfce;
}

.spin-btn:active {
  background: #ccc;
}

/* Orientation Nested GroupBox */
.orientation-groupbox {
  margin-top: 3px;
  padding: 3px 6px 5px 6px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

.radio-label input[type='radio'] {
  margin: 0;
  cursor: pointer;
}

.radio-text {
  font-size: 11px;
}

.pages-row {
  margin-top: 2px;
}

.small-spin {
  width: 78px;
}

/* Column 2: Margins & Direction */
.column-middle {
  width: 136px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.margins-groupbox {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.margin-label {
  width: 44px;
}

.margin-input {
  width: 72px;
}

.direction-groupbox {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 4px 6px 5px 6px;
}

.active-focus .radio-text {
  outline: 1px dotted #000;
  outline-offset: 1px;
}

/* Column 3: Columns, Actions, Checkboxes */
.column-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.columns-actions-wrapper {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.columns-groupbox {
  width: 88px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.column-spin {
  width: 100%;
}

.gutter-label-row {
  margin-top: 3px;
}

/* Dialog Action Buttons (OK, Cancel, Help) */
.dialog-main-buttons {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.inpage-dialog-btn {
  height: 22px;
  background: #ece9d8;
  border: 1px solid #707070;
  box-shadow: inset 1px 1px 0 #fff, inset -1px -1px 0 #cfcfcf;
  font-family: Tahoma, 'Segoe UI', Arial, sans-serif;
  font-size: 11px;
  color: #000;
  padding: 0 8px;
  cursor: pointer;
  box-sizing: border-box;
}

.inpage-dialog-btn:hover {
  background: #f2efe0;
}

.inpage-dialog-btn:active {
  box-shadow: inset 1px 1px 0 #888;
}

.default-btn {
  border: 1px solid #0055ea;
  outline: 1px solid #000;
  font-weight: 500;
}

/* Checkboxes Section */
.checkboxes-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 2px;
  margin-top: 1px;
}

.inpage-checkbox-label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  font-size: 11px;
}

.inpage-checkbox-label input[type='checkbox'] {
  margin: 0;
  cursor: pointer;
}

.inpage-checkbox-label.disabled {
  color: #999;
  cursor: default;
}

.inpage-checkbox-label.disabled input[type='checkbox'] {
  cursor: default;
}

/* Save as Default button */
.save-default-wrapper {
  margin-top: 4px;
  position: relative;
}

.save-default-btn {
  width: 100%;
  height: 22px;
}

.saved-indicator {
  position: absolute;
  right: -42px;
  top: 3px;
  font-size: 10px;
  color: #007700;
  font-weight: bold;
}
</style>
