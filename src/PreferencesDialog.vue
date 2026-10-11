<script setup>
import { ref, reactive, watch } from 'vue'

const props = defineProps({
  kind: {
    type: String, // 'app' | 'doc' | 'typo' | 'story' | 'spelling'
    required: true
  },
  modelValue: {
    type: Object,
    required: true
  },
  colors: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'close', 'saveDefault', 'help'])

// InPage Official Default Configurations
const DEFAULTS = {
  app: {
    applicationType: 'ltr', // 'ltr' | 'rtl'
    marginGuidesColor: '#808080',
    userGuidesColor: '#0000ff',
    columnGuidesColor: '#808080',
    arrowMovement: 1, // mm
    arrowWithControl: 0.1, // mm
    greekTextBelow: 7, // pt
    greekPictures: false,
    rightButtonAction: 'Floating Menu', // 'Floating Menu' | 'Zoom'
    rightButtonZoom: 100, // %
    logFileGenerate: true,
    logFilePath: '',
    autoSavePath: '',
    autoSaveEnabled: false,
    autoSaveMinutes: 10,
    autoSaveMaintainVersions: 1,
    allowCustomPostScript: false
  },
  doc: {
    unitGeneral: 'Millimeters', // 'Millimeters' | 'Inches' | 'Points' | 'Centimeters'
    unitCharacter: 'Points', // 'Points' | 'Millimeters'
    pasteboardAcross: 15, // %
    pasteboardDown: 25, // mm
    snapDistance: 2, // mm
    guidesPosition: 'Front', // 'Front' | 'Behind'
    rulersVisible: true,
    rulerOriginAcross: 0, // mm
    rulerOriginDown: 0, // mm
    pageNumberStart: 1,
    pageNumberStyle: '1 2 3', // '1 2 3' | 'I II III' | 'i ii iii' | 'A B C' | 'a b c'
    viewPercent: 100
  },
  typo: {
    nastaliqFirstSpace: 0, // %
    nastaliqSubsequentSpace: 25, // %
    boxedAbove: 10, // %
    boxedBelow: 15, // %
    boxedText: 7, // %
    autoLineSpacing: 50, // %
    reduceLatinFontsize: 18, // %
    characterSpaceExtra: 20, // %
    underlinesShift: 40, // %
    underlinesWidth: 7, // %
    justPriorityNastaliq: 10,
    justPriorityLatin: 10,
    usePrinterWidths: false,
    autoKerning: true,
    autoKashida: true,
    footnoteFont: '',
    footnoteSize: 75, // %
    footnoteShift: 25 // %
  },
  story: {
    storyFontSize: '12pt',
    printFontSize: '12pt',
    previewFontSize: '12pt',
    promptingSpeed: 'Low', // 'Low' | 'Medium' | 'High'
    printFooter: false
  },
  spelling: {
    ignoreUppercase: false,
    ignoreWithNumbers: false,
    dictLanguage: 'American English', // 'American English' | 'UK English'
    spellLanguage: 'English' // 'English' | 'Urdu' | 'Both'
  }
}

// Local working draft cloned from props
const form = reactive({
  app: { ...DEFAULTS.app, ...(props.modelValue.app || {}) },
  doc: { ...DEFAULTS.doc, ...(props.modelValue.doc || {}) },
  typo: { ...DEFAULTS.typo, ...(props.modelValue.typo || {}) },
  story: { ...DEFAULTS.story, ...(props.modelValue.story || {}) },
  spelling: { ...DEFAULTS.spelling, ...(props.modelValue.spelling || {}) }
})

watch(() => props.modelValue, (val) => {
  if (val) {
    if (val.app) Object.assign(form.app, val.app)
    if (val.doc) Object.assign(form.doc, val.doc)
    if (val.typo) Object.assign(form.typo, val.typo)
    if (val.story) Object.assign(form.story, val.story)
    if (val.spelling) Object.assign(form.spelling, val.spelling)
  }
}, { deep: true })

const savedNotice = ref(false)
const colorPickerTarget = ref(null) // 'margin' | 'user' | 'column' | null

function cycleGuideColor(target) {
  const palette = ['#808080', '#0000ff', '#ff0000', '#008000', '#ff00ff', '#00cccc', '#000000']
  const key = target === 'margin' ? 'marginGuidesColor' : target === 'user' ? 'userGuidesColor' : 'columnGuidesColor'
  const cur = form.app[key]
  const idx = palette.indexOf(cur)
  form.app[key] = palette[(idx + 1) % palette.length]
}

function handleOk() {
  emit('update:modelValue', JSON.parse(JSON.stringify(form)))
  emit('close')
}

function handleCancel() {
  emit('close')
}

function handleDefaults() {
  const k = props.kind
  if (DEFAULTS[k]) {
    Object.assign(form[k], DEFAULTS[k])
  }
}

function handleSaveDefault() {
  emit('saveDefault', { kind: props.kind, data: JSON.parse(JSON.stringify(form[props.kind])) })
  savedNotice.value = true
  setTimeout(() => { savedNotice.value = false }, 1500)
}

function dictToText() {
  const words = form.spelling.spellLanguage === 'Urdu' ? 'اردو\nالفاظ\nلغت\nکتاب' : 'sample\ndictionary\nwords\ninpage';
  const blob = new Blob([words], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (form.spelling.spellLanguage.toLowerCase()) + '_dictionary.txt';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function textToDict() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.txt';
  inp.onchange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      savedNotice.value = true;
      setTimeout(() => { savedNotice.value = false }, 1500);
    }
  };
  inp.click();
}

function onKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault()
    handleOk()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    handleCancel()
  }
}
</script>

<template>
  <div class="inpage-modal-backdrop" @click.self="handleCancel">
    <!-- ============================================================ -->
    <!-- 1. APPLICATION PREFERENCES                                   -->
    <!-- ============================================================ -->
    <div
      v-if="kind === 'app'"
      class="inpage-modal pref-app-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Application Preferences"
      tabindex="-1"
      @keydown="onKeydown"
    >
      <div class="inpage-modal-titlebar">
        <span class="inpage-modal-title">Application Preferences</span>
        <button type="button" class="inpage-titlebar-close" aria-label="Close" @click="handleCancel">✕</button>
      </div>

      <div class="inpage-modal-content pref-app-content">
        <div class="pref-grid-main">
          <!-- Col 1 -->
          <div class="pref-col col-1">
            <!-- Application Type -->
            <fieldset class="inpage-groupbox">
              <legend class="inpage-legend">Application Type</legend>
              <div class="radio-stack">
                <label class="radio-label">
                  <input v-model="form.app.applicationType" type="radio" value="ltr" />
                  <span>Left To Right</span>
                </label>
                <label class="radio-label">
                  <input v-model="form.app.applicationType" type="radio" value="rtl" />
                  <span>Right To Left</span>
                </label>
              </div>
            </fieldset>

            <!-- Arrow Keys Movement -->
            <fieldset class="inpage-groupbox">
              <legend class="inpage-legend">Arrow Keys Movement</legend>
              <div class="spin-wrap arrow-spin">
                <input :value="form.app.arrowMovement + 'mm'" @change="form.app.arrowMovement = parseFloat($event.target.value) || 1" type="text" />
                <div class="spin-btns">
                  <button type="button" @click="form.app.arrowMovement = +(form.app.arrowMovement + 0.5).toFixed(2)">▲</button>
                  <button type="button" @click="form.app.arrowMovement = Math.max(0.01, +(form.app.arrowMovement - 0.5).toFixed(2))">▼</button>
                </div>
              </div>
              <div class="field-row-arrow">
                <label>With Control:</label>
                <div class="spin-wrap arrow-spin-sm">
                  <input :value="form.app.arrowWithControl + 'mm'" @change="form.app.arrowWithControl = parseFloat($event.target.value) || 0.1" type="text" />
                  <div class="spin-btns">
                    <button type="button" @click="form.app.arrowWithControl = +(form.app.arrowWithControl + 0.05).toFixed(2)">▲</button>
                    <button type="button" @click="form.app.arrowWithControl = Math.max(0.01, +(form.app.arrowWithControl - 0.05).toFixed(2))">▼</button>
                  </div>
                </div>
              </div>
            </fieldset>

            <!-- Greek -->
            <fieldset class="inpage-groupbox">
              <legend class="inpage-legend">Greek</legend>
              <div class="field-row-greek">
                <label>Text Below:</label>
                <div class="spin-wrap greek-spin">
                  <input :value="form.app.greekTextBelow + 'pt'" @change="form.app.greekTextBelow = parseFloat($event.target.value) || 7" type="text" />
                  <div class="spin-btns">
                    <button type="button" @click="form.app.greekTextBelow += 1">▲</button>
                    <button type="button" @click="form.app.greekTextBelow = Math.max(1, form.app.greekTextBelow - 1)">▼</button>
                  </div>
                </div>
              </div>
              <label class="pref-check-label">
                <input v-model="form.app.greekPictures" type="checkbox" />
                <span>Pictures</span>
              </label>
            </fieldset>

            <!-- Right Button -->
            <fieldset class="inpage-groupbox">
              <legend class="inpage-legend">Right Button</legend>
              <select v-model="form.app.rightButtonAction" class="pref-select-full">
                <option value="Floating Menu">Floating Menu</option>
                <option value="Zoom">Zoom</option>
              </select>
              <div class="field-row-zoom">
                <label>Zoom % :</label>
                <div class="spin-wrap zoom-spin">
                  <input :value="form.app.rightButtonZoom + '%'" @change="form.app.rightButtonZoom = parseInt($event.target.value) || 100" />
                  <div class="spin-btns">
                    <button type="button" @click="form.app.rightButtonZoom += 25">▲</button>
                    <button type="button" @click="form.app.rightButtonZoom = Math.max(25, form.app.rightButtonZoom - 25)">▼</button>
                  </div>
                </div>
              </div>
            </fieldset>
          </div>

          <!-- Col 2 -->
          <div class="pref-col col-2">
            <!-- Guides Color -->
            <fieldset class="inpage-groupbox guides-color-group">
              <legend class="inpage-legend">Guides Color</legend>
              <div class="guides-color-row">
                <div class="color-swatch-box" :style="{ backgroundColor: form.app.marginGuidesColor }"></div>
                <button type="button" class="inpage-dialog-btn color-guide-btn" @click="cycleGuideColor('margin')">
                  Margins...
                </button>
              </div>
              <div class="guides-color-row">
                <div class="color-swatch-box" :style="{ backgroundColor: form.app.userGuidesColor }"></div>
                <button type="button" class="inpage-dialog-btn color-guide-btn" @click="cycleGuideColor('user')">
                  User...
                </button>
              </div>
              <div class="guides-color-row">
                <div class="color-swatch-box" :style="{ backgroundColor: form.app.columnGuidesColor }"></div>
                <button type="button" class="inpage-dialog-btn color-guide-btn" @click="cycleGuideColor('column')">
                  Column...
                </button>
              </div>
            </fieldset>

            <!-- Log File -->
            <fieldset class="inpage-groupbox">
              <legend class="inpage-legend">Log File</legend>
              <label class="pref-check-label">
                <input v-model="form.app.logFileGenerate" type="checkbox" />
                <span>Generate</span>
              </label>
              <div class="path-row">
                <label>Path:</label>
                <span class="path-val">{{ form.app.logFilePath }}</span>
              </div>
            </fieldset>

            <!-- AutoSave -->
            <fieldset class="inpage-groupbox autosave-group">
              <legend class="inpage-legend">AutoSave</legend>
              <div class="autosave-path-row">
                <label>Path:</label>
                <input v-model="form.app.autoSavePath" type="text" class="pref-text-inp" />
              </div>
              <div class="autosave-time-row">
                <label class="pref-check-label inline-check">
                  <input v-model="form.app.autoSaveEnabled" type="checkbox" />
                  <span>every:</span>
                </label>
                <input v-model.number="form.app.autoSaveMinutes" type="number" min="1" max="120" class="mini-inp" />
                <span>minutes</span>
              </div>
              <div class="autosave-versions-row">
                <label>Maintain</label>
                <input v-model.number="form.app.autoSaveMaintainVersions" type="number" min="1" max="10" class="mini-inp" />
                <span class="prev-ver-text">previous versions<br />(.B01, .B02 so on)</span>
              </div>
            </fieldset>
          </div>

          <!-- Col 3: Actions -->
          <div class="pref-actions-col">
            <button type="button" class="inpage-dialog-btn default-btn" @click="handleOk">OK</button>
            <button type="button" class="inpage-dialog-btn" @click="handleCancel">Cancel</button>
            <button type="button" class="inpage-dialog-btn" @click="emit('help')">Help</button>
            <button type="button" class="inpage-dialog-btn" @click="handleDefaults">Defaults</button>
          </div>
        </div>

        <div class="pref-bottom-row">
          <label class="pref-check-label">
            <input v-model="form.app.allowCustomPostScript" type="checkbox" />
            <span>Allow Custom PostScript in Printing</span>
          </label>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- 2. DOCUMENT PREFERENCES                                      -->
    <!-- ============================================================ -->
    <div
      v-else-if="kind === 'doc'"
      class="inpage-modal pref-doc-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Document Preferences"
      tabindex="-1"
      @keydown="onKeydown"
    >
      <div class="inpage-modal-titlebar">
        <span class="inpage-modal-title">Document Preferences</span>
        <button type="button" class="inpage-titlebar-close" aria-label="Close" @click="handleCancel">✕</button>
      </div>

      <div class="inpage-modal-content pref-doc-content">
        <div class="pref-grid-main">
          <!-- Col 1 -->
          <div class="pref-col col-1">
            <!-- Measurement Units -->
            <fieldset class="inpage-groupbox">
              <legend class="inpage-legend">Measurement Units</legend>
              <div class="doc-row">
                <label>General:</label>
                <select v-model="form.doc.unitGeneral" class="doc-select">
                  <option value="Millimeters">Millimeters</option>
                  <option value="Inches">Inches</option>
                  <option value="Points">Points</option>
                  <option value="Centimeters">Centimeters</option>
                </select>
              </div>
              <div class="doc-row">
                <label>Character:</label>
                <select v-model="form.doc.unitCharacter" class="doc-select">
                  <option value="Points">Points</option>
                  <option value="Millimeters">Millimeters</option>
                </select>
              </div>
            </fieldset>

            <!-- Guides -->
            <fieldset class="inpage-groupbox">
              <legend class="inpage-legend">Guides</legend>
              <div class="doc-row">
                <label>Snap Distance:</label>
                <input
                  :value="form.doc.snapDistance + 'mm'"
                  @change="form.doc.snapDistance = parseFloat($event.target.value) || 2"
                  class="doc-inp-sm"
                />
              </div>
              <fieldset class="inpage-groupbox nested-group">
                <legend class="inpage-legend">Position</legend>
                <div class="radio-inline">
                  <label class="radio-label">
                    <input v-model="form.doc.guidesPosition" type="radio" value="Front" />
                    <span>Front</span>
                  </label>
                  <label class="radio-label">
                    <input v-model="form.doc.guidesPosition" type="radio" value="Behind" />
                    <span>Behind</span>
                  </label>
                </div>
              </fieldset>
            </fieldset>

            <!-- Page Number -->
            <fieldset class="inpage-groupbox">
              <legend class="inpage-legend">Page Number</legend>
              <div class="doc-row">
                <label>Start:</label>
                <div class="spin-wrap pnum-spin">
                  <input v-model.number="form.doc.pageNumberStart" type="number" min="1" max="9999" />
                  <div class="spin-btns">
                    <button type="button" @click="form.doc.pageNumberStart += 1">▲</button>
                    <button type="button" @click="form.doc.pageNumberStart = Math.max(1, form.doc.pageNumberStart - 1)">▼</button>
                  </div>
                </div>
              </div>
              <div class="doc-row">
                <label>Style:</label>
                <select v-model="form.doc.pageNumberStyle" class="doc-select-sm">
                  <option value="1 2 3">1 2 3</option>
                  <option value="I II III">I II III</option>
                  <option value="i ii iii">i ii iii</option>
                  <option value="A B C">A B C</option>
                  <option value="a b c">a b c</option>
                </select>
              </div>
            </fieldset>
          </div>

          <!-- Col 2 -->
          <div class="pref-col col-2">
            <!-- Pasteboard Size -->
            <fieldset class="inpage-groupbox">
              <legend class="inpage-legend">Pasteboard Size</legend>
              <div class="doc-row">
                <label>Across:</label>
                <input
                  :value="form.doc.pasteboardAcross + '%'"
                  @change="form.doc.pasteboardAcross = parseFloat($event.target.value) || 15"
                  class="doc-inp-sm"
                />
              </div>
              <div class="doc-row">
                <label>Down:</label>
                <input
                  :value="form.doc.pasteboardDown + 'mm'"
                  @change="form.doc.pasteboardDown = parseFloat($event.target.value) || 25"
                  class="doc-inp-sm"
                />
              </div>
            </fieldset>

            <!-- Rulers -->
            <fieldset class="inpage-groupbox">
              <legend class="inpage-legend">Rulers</legend>
              <label class="pref-check-label">
                <input v-model="form.doc.rulersVisible" type="checkbox" />
                <span>Visible</span>
              </label>
              <fieldset class="inpage-groupbox nested-group">
                <legend class="inpage-legend">Origin</legend>
                <div class="doc-row">
                  <label>Across:</label>
                  <input
                    :value="form.doc.rulerOriginAcross + 'mm'"
                    @change="form.doc.rulerOriginAcross = parseFloat($event.target.value) || 0"
                    class="doc-inp-sm"
                  />
                </div>
                <div class="doc-row">
                  <label>Down:</label>
                  <input
                    :value="form.doc.rulerOriginDown + 'mm'"
                    @change="form.doc.rulerOriginDown = parseFloat($event.target.value) || 0"
                    class="doc-inp-sm"
                  />
                </div>
              </fieldset>
            </fieldset>

            <!-- View % & Save as Default -->
            <div class="view-default-section">
              <div class="view-row">
                <label>View % :</label>
                <div class="spin-wrap view-spin">
                  <input :value="form.doc.viewPercent + '%'" @change="form.doc.viewPercent = parseInt($event.target.value) || 100" />
                  <div class="spin-btns">
                    <button type="button" @click="form.doc.viewPercent += 25">▲</button>
                    <button type="button" @click="form.doc.viewPercent = Math.max(25, form.doc.viewPercent - 25)">▼</button>
                  </div>
                </div>
              </div>
              <button type="button" class="inpage-dialog-btn save-def-btn" @click="handleSaveDefault">
                Save as Default
              </button>
              <span v-if="savedNotice" class="saved-alert">Saved!</span>
            </div>
          </div>

          <!-- Col 3: Actions -->
          <div class="pref-actions-col">
            <button type="button" class="inpage-dialog-btn default-btn" @click="handleOk">OK</button>
            <button type="button" class="inpage-dialog-btn" @click="handleCancel">Cancel</button>
            <button type="button" class="inpage-dialog-btn" @click="emit('help')">Help</button>
            <button type="button" class="inpage-dialog-btn" @click="handleDefaults">Defaults</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- 3. TYPOGRAPHIC PREFERENCES                                   -->
    <!-- ============================================================ -->
    <div
      v-else-if="kind === 'typo'"
      class="inpage-modal pref-typo-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Typographic Preferences"
      tabindex="-1"
      @keydown="onKeydown"
    >
      <div class="inpage-modal-titlebar">
        <span class="inpage-modal-title">Typographic Preferences</span>
        <button type="button" class="inpage-titlebar-close" aria-label="Close" @click="handleCancel">✕</button>
      </div>

      <div class="inpage-modal-content pref-typo-content">
        <div class="pref-grid-main">
          <!-- Col 1 -->
          <div class="pref-col col-1">
            <!-- Nastaliq Space Width -->
            <fieldset class="inpage-groupbox">
              <legend class="inpage-legend">Nastaliq Space Width:</legend>
              <div class="typo-row">
                <label>First Space Width:</label>
                <div class="spin-wrap typo-spin">
                  <input :value="form.typo.nastaliqFirstSpace + '%'" @change="form.typo.nastaliqFirstSpace = parseInt($event.target.value) || 0" />
                  <div class="spin-btns">
                    <button type="button" @click="form.typo.nastaliqFirstSpace += 5">▲</button>
                    <button type="button" @click="form.typo.nastaliqFirstSpace = Math.max(0, form.typo.nastaliqFirstSpace - 5)">▼</button>
                  </div>
                </div>
              </div>
              <div class="typo-row">
                <label>Subsequent Space Width:</label>
                <div class="spin-wrap typo-spin">
                  <input :value="form.typo.nastaliqSubsequentSpace + '%'" @change="form.typo.nastaliqSubsequentSpace = parseInt($event.target.value) || 25" />
                  <div class="spin-btns">
                    <button type="button" @click="form.typo.nastaliqSubsequentSpace += 5">▲</button>
                    <button type="button" @click="form.typo.nastaliqSubsequentSpace = Math.max(0, form.typo.nastaliqSubsequentSpace - 5)">▼</button>
                  </div>
                </div>
              </div>
            </fieldset>

            <div class="typo-row standalone-typo-row">
              <label>Auto Line Spacing:</label>
              <div class="spin-wrap typo-spin">
                <input :value="form.typo.autoLineSpacing + '%'" @change="form.typo.autoLineSpacing = parseInt($event.target.value) || 50" />
                <div class="spin-btns">
                  <button type="button" @click="form.typo.autoLineSpacing += 5">▲</button>
                  <button type="button" @click="form.typo.autoLineSpacing = Math.max(0, form.typo.autoLineSpacing - 5)">▼</button>
                </div>
              </div>
            </div>

            <div class="typo-row standalone-typo-row">
              <label>Reduce Latin Fontsize:</label>
              <div class="spin-wrap typo-spin">
                <input :value="form.typo.reduceLatinFontsize + '%'" @change="form.typo.reduceLatinFontsize = parseInt($event.target.value) || 18" />
                <div class="spin-btns">
                  <button type="button" @click="form.typo.reduceLatinFontsize += 2">▲</button>
                  <button type="button" @click="form.typo.reduceLatinFontsize = Math.max(0, form.typo.reduceLatinFontsize - 2)">▼</button>
                </div>
              </div>
            </div>

            <div class="typo-row standalone-typo-row">
              <label>Character Space Extra:</label>
              <input
                :value="form.typo.characterSpaceExtra + '%'"
                @change="form.typo.characterSpaceExtra = parseInt($event.target.value) || 20"
                class="typo-plain-inp"
              />
            </div>

            <!-- Justification Priorities -->
            <fieldset class="inpage-groupbox">
              <legend class="inpage-legend">Justification Priorities</legend>
              <div class="typo-row">
                <label>Nastaliq Space:</label>
                <div class="spin-wrap typo-spin">
                  <input v-model.number="form.typo.justPriorityNastaliq" type="number" min="0" max="100" />
                  <div class="spin-btns">
                    <button type="button" @click="form.typo.justPriorityNastaliq += 1">▲</button>
                    <button type="button" @click="form.typo.justPriorityNastaliq = Math.max(0, form.typo.justPriorityNastaliq - 1)">▼</button>
                  </div>
                </div>
              </div>
              <div class="typo-row">
                <label>Latin Space:</label>
                <div class="spin-wrap typo-spin">
                  <input v-model.number="form.typo.justPriorityLatin" type="number" min="0" max="100" />
                  <div class="spin-btns">
                    <button type="button" @click="form.typo.justPriorityLatin += 1">▲</button>
                    <button type="button" @click="form.typo.justPriorityLatin = Math.max(0, form.typo.justPriorityLatin - 1)">▼</button>
                  </div>
                </div>
              </div>
            </fieldset>

            <!-- Bottom Left Checks -->
            <div class="typo-bottom-checks">
              <label class="pref-check-label"><input v-model="form.typo.usePrinterWidths" type="checkbox" /><span>Use Printer Widths</span></label>
              <label class="pref-check-label"><input v-model="form.typo.autoKerning" type="checkbox" /><span>Auto Kerning</span></label>
              <label class="pref-check-label"><input v-model="form.typo.autoKashida" type="checkbox" /><span>Auto Kashida</span></label>
            </div>
          </div>

          <!-- Col 2 -->
          <div class="pref-col col-2">
            <!-- Boxed Styles -->
            <fieldset class="inpage-groupbox">
              <legend class="inpage-legend">Boxed Styles</legend>
              <div class="typo-row">
                <label>Above:</label>
                <div class="spin-wrap typo-spin">
                  <input :value="form.typo.boxedAbove + '%'" @change="form.typo.boxedAbove = parseInt($event.target.value) || 10" />
                  <div class="spin-btns">
                    <button type="button" @click="form.typo.boxedAbove += 5">▲</button>
                    <button type="button" @click="form.typo.boxedAbove = Math.max(0, form.typo.boxedAbove - 5)">▼</button>
                  </div>
                </div>
              </div>
              <div class="typo-row">
                <label>Below:</label>
                <div class="spin-wrap typo-spin">
                  <input :value="form.typo.boxedBelow + '%'" @change="form.typo.boxedBelow = parseInt($event.target.value) || 15" />
                  <div class="spin-btns">
                    <button type="button" @click="form.typo.boxedBelow += 5">▲</button>
                    <button type="button" @click="form.typo.boxedBelow = Math.max(0, form.typo.boxedBelow - 5)">▼</button>
                  </div>
                </div>
              </div>
              <div class="typo-row">
                <label>Text:</label>
                <div class="spin-wrap typo-spin">
                  <input :value="form.typo.boxedText + '%'" @change="form.typo.boxedText = parseInt($event.target.value) || 7" />
                  <div class="spin-btns">
                    <button type="button" @click="form.typo.boxedText += 1">▲</button>
                    <button type="button" @click="form.typo.boxedText = Math.max(0, form.typo.boxedText - 1)">▼</button>
                  </div>
                </div>
              </div>
            </fieldset>

            <!-- Underlines -->
            <fieldset class="inpage-groupbox">
              <legend class="inpage-legend">Underlines</legend>
              <div class="typo-row">
                <label>Shift:</label>
                <div class="spin-wrap typo-spin">
                  <input :value="form.typo.underlinesShift + '%'" @change="form.typo.underlinesShift = parseInt($event.target.value) || 40" />
                  <div class="spin-btns">
                    <button type="button" @click="form.typo.underlinesShift += 5">▲</button>
                    <button type="button" @click="form.typo.underlinesShift = Math.max(0, form.typo.underlinesShift - 5)">▼</button>
                  </div>
                </div>
              </div>
              <div class="typo-row">
                <label>Width:</label>
                <div class="spin-wrap typo-spin">
                  <input :value="form.typo.underlinesWidth + '%'" @change="form.typo.underlinesWidth = parseInt($event.target.value) || 7" />
                  <div class="spin-btns">
                    <button type="button" @click="form.typo.underlinesWidth += 1">▲</button>
                    <button type="button" @click="form.typo.underlinesWidth = Math.max(1, form.typo.underlinesWidth - 1)">▼</button>
                  </div>
                </div>
              </div>
            </fieldset>

            <!-- Footnote fields -->
            <div class="typo-row typo-footnote-row">
              <label>Footnote Font:</label>
              <select v-model="form.typo.footnoteFont" class="typo-select-full">
                <option value="">&nbsp;</option>
                <option value="Jameel Noori Nastaleeq">Jameel Noori Nastaleeq</option>
                <option value="Noori Nastaliq">Noori Nastaliq</option>
                <option value="Noto Nastaliq Urdu">Noto Nastaliq Urdu</option>
                <option value="Arial">Arial</option>
              </select>
            </div>
            <div class="typo-row typo-footnote-row">
              <label>Footnote Size:</label>
              <input
                :value="form.typo.footnoteSize + '%'"
                @change="form.typo.footnoteSize = parseInt($event.target.value) || 75"
                class="typo-plain-inp"
              />
            </div>
            <div class="typo-row typo-footnote-row">
              <label>Footnote Shift:</label>
              <input
                :value="form.typo.footnoteShift + '%'"
                @change="form.typo.footnoteShift = parseInt($event.target.value) || 25"
                class="typo-plain-inp"
              />
            </div>

            <!-- Save as Default -->
            <div class="typo-save-wrap">
              <button type="button" class="inpage-dialog-btn save-def-btn" @click="handleSaveDefault">
                Save As Default
              </button>
              <span v-if="savedNotice" class="saved-alert">Saved!</span>
            </div>
          </div>

          <!-- Col 3: Actions -->
          <div class="pref-actions-col">
            <button type="button" class="inpage-dialog-btn default-btn" @click="handleOk">OK</button>
            <button type="button" class="inpage-dialog-btn" @click="handleCancel">Cancel</button>
            <button type="button" class="inpage-dialog-btn" @click="emit('help')">Help</button>
            <button type="button" class="inpage-dialog-btn" @click="handleDefaults">Defaults</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- 4. STORY EDITOR PREFERENCES                                  -->
    <!-- ============================================================ -->
    <div
      v-else-if="kind === 'story'"
      class="inpage-modal pref-story-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Story Editor Preferences"
      tabindex="-1"
      @keydown="onKeydown"
    >
      <div class="inpage-modal-titlebar">
        <span class="inpage-modal-title">Story Editor Preferences</span>
        <button type="button" class="inpage-titlebar-close" aria-label="Close" @click="handleCancel">✕</button>
      </div>

      <div class="inpage-modal-content pref-story-content">
        <div class="story-grid-main">
          <div class="story-fields">
            <div class="story-row">
              <label>Font Size:</label>
              <select v-model="form.story.storyFontSize" class="story-select">
                <option v-for="pt in ['8pt', '10pt', '12pt', '14pt', '18pt', '24pt']" :key="pt" :value="pt">{{ pt }}</option>
              </select>
            </div>
            <div class="story-row">
              <label>Print Font Size:</label>
              <select v-model="form.story.printFontSize" class="story-select">
                <option v-for="pt in ['8pt', '10pt', '12pt', '14pt', '18pt', '24pt']" :key="pt" :value="pt">{{ pt }}</option>
              </select>
            </div>
            <div class="story-row">
              <label>Preview Font Size:</label>
              <select v-model="form.story.previewFontSize" class="story-select">
                <option v-for="pt in ['8pt', '10pt', '12pt', '14pt', '18pt', '24pt']" :key="pt" :value="pt">{{ pt }}</option>
              </select>
            </div>
            <div class="story-row">
              <label>Prompting Speed:</label>
              <select v-model="form.story.promptingSpeed" class="story-select">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <label class="pref-check-label story-check">
              <input v-model="form.story.printFooter" type="checkbox" />
              <span>Print Footer</span>
            </label>
          </div>

          <div class="pref-actions-col">
            <button type="button" class="inpage-dialog-btn default-btn" @click="handleOk">OK</button>
            <button type="button" class="inpage-dialog-btn" @click="handleCancel">Cancel</button>
            <button type="button" class="inpage-dialog-btn" @click="emit('help')">Help</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- 5. SPELLING PREFERENCES                                      -->
    <!-- ============================================================ -->
    <div
      v-else-if="kind === 'spelling'"
      class="inpage-modal pref-spelling-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Spelling Preferences"
      tabindex="-1"
      @keydown="onKeydown"
    >
      <div class="inpage-modal-titlebar">
        <span class="inpage-modal-title">Spelling Preferences</span>
        <button type="button" class="inpage-titlebar-close" aria-label="Close" @click="handleCancel">✕</button>
      </div>

      <div class="inpage-modal-content pref-spelling-content">
        <div class="spelling-grid-main">
          <div class="spelling-fields">
            <!-- Ignore -->
            <fieldset class="inpage-groupbox">
              <legend class="inpage-legend">Ignore</legend>
              <label class="pref-check-label">
                <input v-model="form.spelling.ignoreUppercase" type="checkbox" />
                <span>UPPERCASE words</span>
              </label>
              <label class="pref-check-label">
                <input v-model="form.spelling.ignoreWithNumbers" type="checkbox" />
                <span>Words with Numbers</span>
              </label>
            </fieldset>

            <!-- Dictionary Language -->
            <fieldset class="inpage-groupbox">
              <legend class="inpage-legend">Dictionary Language</legend>
              <div class="radio-stack">
                <label class="radio-label">
                  <input v-model="form.spelling.dictLanguage" type="radio" value="American English" />
                  <span>American English</span>
                </label>
                <label class="radio-label">
                  <input v-model="form.spelling.dictLanguage" type="radio" value="UK English" />
                  <span>UK English</span>
                </label>
              </div>
            </fieldset>

            <!-- Language -->
            <fieldset class="inpage-groupbox">
              <legend class="inpage-legend">Language</legend>
              <div class="radio-stack">
                <label class="radio-label">
                  <input v-model="form.spelling.spellLanguage" type="radio" value="English" />
                  <span>English</span>
                </label>
                <label class="radio-label">
                  <input v-model="form.spelling.spellLanguage" type="radio" value="Urdu" />
                  <span>Urdu</span>
                </label>
                <label class="radio-label">
                  <input v-model="form.spelling.spellLanguage" type="radio" value="Both" />
                  <span>Both</span>
                </label>
              </div>
            </fieldset>

            <!-- Action buttons -->
            <div class="spelling-left-btns">
              <button type="button" class="inpage-dialog-btn spell-extra-btn" @click="dictToText">
                Dictionary To Text...
              </button>
              <button type="button" class="inpage-dialog-btn spell-extra-btn" @click="textToDict">
                Text to Dictionary...
              </button>
            </div>
          </div>

          <div class="pref-actions-col">
            <button type="button" class="inpage-dialog-btn default-btn" @click="handleOk">OK</button>
            <button type="button" class="inpage-dialog-btn" @click="handleCancel">Cancel</button>
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

.inpage-modal-content {
  padding: 6px 10px 10px 10px;
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
  padding: 0 8px;
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

.default-btn {
  border: 1px solid #0055ea;
  outline: 1px solid #000;
  font-weight: 500;
}

/* Actions Column (OK, Cancel, Help, Defaults) */
.pref-actions-col {
  width: 66px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pref-actions-col .inpage-dialog-btn {
  width: 100%;
}

/* Shared Spin input */
.spin-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 20px;
  background: #fff;
  border: 1px solid #7f9db9;
  box-sizing: border-box;
}

.spin-wrap input {
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  padding: 0 16px 0 4px;
  font-family: inherit;
  font-size: 11px;
  outline: none;
  box-sizing: border-box;
}

.spin-btns {
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

.spin-btns button {
  flex: 1;
  padding: 0;
  border: none;
  background: #ece9d8;
  border-bottom: 1px solid #bbb;
  font-size: 6px;
  cursor: pointer;
}

.spin-btns button:last-child {
  border-bottom: none;
}

.radio-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.radio-inline {
  display: flex;
  gap: 12px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 11px;
}

.pref-check-label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  font-size: 11px;
  margin: 2px 0;
}

/* ============================================================ */
/* 1. APPLICATION PREFERENCES STYLES                            */
/* ============================================================ */
.pref-app-modal {
  width: 440px;
}

.pref-grid-main {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.pref-col {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.col-1 {
  width: 140px;
}

.col-2 {
  width: 196px;
}

.arrow-spin {
  width: 100%;
  margin-bottom: 4px;
}

.field-row-arrow,
.field-row-greek,
.field-row-zoom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.arrow-spin-sm,
.greek-spin,
.zoom-spin {
  width: 60px;
}

.pref-select-full {
  width: 100%;
  height: 20px;
  border: 1px solid #7f9db9;
  background: #fff;
  font-size: 11px;
  margin-bottom: 4px;
}

.guides-color-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.color-swatch-box {
  width: 28px;
  height: 22px;
  border: 1px solid #555;
  box-sizing: border-box;
}

.color-guide-btn {
  flex: 1;
  height: 22px;
}

.path-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}

.path-val {
  color: #444;
  font-size: 10px;
}

.autosave-path-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}

.pref-text-inp {
  flex: 1;
  height: 18px;
  border: 1px solid #7f9db9;
  background: #fff;
  font-size: 11px;
}

.autosave-time-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}

.inline-check {
  margin: 0;
}

.mini-inp {
  width: 38px;
  height: 18px;
  border: 1px solid #7f9db9;
  background: #fff;
  font-size: 11px;
  padding: 0 2px;
}

.autosave-versions-row {
  display: flex;
  align-items: flex-start;
  gap: 4px;
}

.prev-ver-text {
  font-size: 10px;
  line-height: 1.1;
  color: #333;
}

.pref-bottom-row {
  margin-top: 8px;
  padding-left: 2px;
}

/* ============================================================ */
/* 2. DOCUMENT PREFERENCES STYLES                               */
/* ============================================================ */
.pref-doc-modal {
  width: 420px;
}

.doc-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 3px;
}

.doc-select {
  width: 86px;
  height: 20px;
  border: 1px solid #7f9db9;
  background: #fff;
  font-size: 11px;
}

.doc-select-sm {
  width: 86px;
  height: 20px;
  border: 1px solid #7f9db9;
  background: #fff;
  font-size: 11px;
}

.doc-inp-sm {
  width: 66px;
  height: 18px;
  border: 1px solid #7f9db9;
  background: #fff;
  font-size: 11px;
  padding: 1px 4px;
  box-sizing: border-box;
}

.nested-group {
  margin-top: 4px;
  padding: 4px 6px;
}

.pnum-spin,
.view-spin {
  width: 86px;
}

.view-default-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
  position: relative;
}

.view-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.save-def-btn {
  width: 100%;
  height: 22px;
}

.saved-alert {
  position: absolute;
  right: -40px;
  top: 28px;
  color: #007700;
  font-weight: bold;
  font-size: 10px;
}

/* ============================================================ */
/* 3. TYPOGRAPHIC PREFERENCES STYLES                            */
/* ============================================================ */
.pref-typo-modal {
  width: 440px;
}

.typo-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 3px;
}

.standalone-typo-row {
  padding: 0 2px;
}

.typo-spin {
  width: 56px;
}

.typo-plain-inp {
  width: 54px;
  height: 18px;
  border: 1px solid #7f9db9;
  background: #fff;
  font-size: 11px;
  padding: 1px 4px;
  box-sizing: border-box;
}

.typo-bottom-checks {
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.typo-footnote-row {
  margin-top: 4px;
}

.typo-select-full {
  width: 120px;
  height: 20px;
  border: 1px solid #7f9db9;
  background: #fff;
  font-size: 11px;
}

.typo-save-wrap {
  margin-top: 10px;
  position: relative;
}

/* ============================================================ */
/* 4. STORY EDITOR PREFERENCES STYLES                           */
/* ============================================================ */
.pref-story-modal {
  width: 340px;
}

.story-grid-main {
  display: flex;
  gap: 12px;
}

.story-fields {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.story-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.story-select {
  width: 100px;
  height: 20px;
  border: 1px solid #7f9db9;
  background: #fff;
  font-size: 11px;
}

.story-check {
  margin-top: 4px;
}

/* ============================================================ */
/* 5. SPELLING PREFERENCES STYLES                               */
/* ============================================================ */
.pref-spelling-modal {
  width: 300px;
}

.spelling-grid-main {
  display: flex;
  gap: 12px;
}

.spelling-fields {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.spelling-left-btns {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

.spell-extra-btn {
  width: 100%;
}
</style>
