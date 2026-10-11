<template>
  <Transition name="splash-fade">
    <div
      v-if="modelValue"
      class="khusrau-splash-overlay"
      :class="{ 'about-mode': mode === 'about' }"
      role="dialog"
      aria-modal="true"
      aria-label="Khusrau 5.0 Splash Screen"
      @click="onDismiss"
      @keydown.esc="close"
    >
      <div class="khusrau-splash-card" @click.stop>
        <!-- Close Button (for About mode or quick dismiss) -->
        <button
          v-if="mode === 'about'"
          class="splash-close-btn"
          aria-label="Close"
          title="Close (Esc)"
          @click="close"
        >
          ✕
        </button>

        <!-- Left Pane: Branding, Status & Engineering Credits -->
        <div class="splash-brand-pane">
          <!-- Subtle Mughal arabesque watermark in background -->
          <svg class="brand-watermark" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            <path d="M50 5 L60 35 L90 25 L70 50 L95 70 L65 70 L50 95 L35 70 L5 70 L30 50 L10 25 L40 35 Z" stroke-width="0.7" opacity="0.12" />
            <circle cx="50" cy="50" r="30" stroke-width="0.5" stroke-dasharray="2 2" opacity="0.1" />
            <circle cx="50" cy="50" r="42" stroke-width="0.5" opacity="0.08" />
          </svg>

          <!-- Top Brand Header -->
          <div class="brand-header">
            <div class="brand-badge-row">
              <div class="brand-icon-emblem">
                <span class="emblem-urdu">خسرو</span>
                <span class="emblem-sub">Kh</span>
              </div>
              <div class="brand-titles">
                <div class="brand-name-row">
                  <h1 class="brand-name">Khusrau</h1>
                  <span class="version-tag">5.0</span>
                </div>
                <div class="brand-suite">Urdu Publishing Suite</div>
              </div>
            </div>

            <!-- Author & Attribution -->
            <div class="brand-author-card">
              <span class="author-label">Developed by</span>
              <strong class="author-name">Tariq Abdullah</strong>
            </div>
          </div>

          <!-- Loading Progress & Status (in preloader mode) -->
          <div class="splash-progress-section" v-if="mode === 'preloader'">
            <div class="status-line">
              <span class="status-pulse" :class="{ ready: isReady }"></span>
              <span class="status-message">{{ currentStatus }}</span>
              <span class="status-percent">{{ Math.round(progress) }}%</span>
            </div>
            <div class="progress-bar-track">
              <div class="progress-bar-fill" :style="{ width: progress + '%' }"></div>
            </div>
          </div>

          <!-- In About mode: Feature badges -->
          <div class="splash-about-features" v-else>
            <div class="feature-chip">Jameel Noori Nastaleeq</div>
            <div class="feature-chip">InPage v3 Unicode</div>
            <div class="feature-chip">Legacy v1/v2 Engine</div>
            <div class="feature-chip">600+ Urdu Typefaces</div>
          </div>

          <!-- Engineering Credits Roster (Adobe-style) -->
          <div class="splash-credits-roster">
            <div class="roster-title">ENGINEERING & ARCHITECTURE</div>
            <div class="roster-list">
              <div class="roster-row">
                <span class="roster-role">Software Architecture:</span>
                <span class="roster-val">Tariq Abdullah</span>
              </div>
              <div class="roster-row">
                <span class="roster-role">Nastaleeq Shaping Engine:</span>
                <span class="roster-val">HarfBuzz OpenType, Kasheeda</span>
              </div>
              <div class="roster-row">
                <span class="roster-role">Native Document Pipeline:</span>
                <span class="roster-val">OLE InPage v3 Unicode & v1 Legacy</span>
              </div>
              <div class="roster-row">
                <span class="roster-role">Desktop Publishing Layout:</span>
                <span class="roster-val">Multi-Column Flow, Text Runaround</span>
              </div>
              <div class="roster-row">
                <span class="roster-role">Urdu Typography Catalog:</span>
                <span class="roster-val">600+ Curated Fonts with Word-Style Families</span>
              </div>
            </div>
          </div>

          <!-- Bottom Footer / Legal & Skip Action -->
          <div class="splash-brand-footer">
            <div class="legal-text">© 2026 Khusrau Publishing Systems. All rights reserved.</div>
            <div class="launch-hint" @click="onDismiss">
              {{ mode === 'preloader' ? (isReady ? 'Starting Khusrau 5.0…' : 'Click to launch workspace') : 'Click outside to close' }}
            </div>
          </div>
        </div>

        <!-- Right Pane: Mughal, Indo-Islamic Architecture & Calligraphy Showcase -->
        <div class="splash-art-pane">
          <Transition name="art-crossfade" mode="out-in">
            <div :key="activeArt.id" class="art-slide">
              <img
                :src="activeArt.src"
                :alt="activeArt.title"
                class="art-image"
                loading="eager"
              />
              <div class="art-vignette-overlay"></div>

              <!-- Artwork Caption & Switcher Pill -->
              <div class="art-caption-dock" @click.stop>
                <div class="art-meta-text">
                  <span class="art-heritage-tag">Mughal & Indo-Islamic Heritage</span>
                  <div class="art-title">{{ activeArt.title }}</div>
                </div>
                <div class="art-nav-buttons">
                  <button
                    class="art-nav-btn"
                    @click.stop="prevArt"
                    title="Previous artwork"
                    aria-label="Previous artwork"
                  >
                    ‹
                  </button>
                  <span class="art-counter">{{ activeArtIndex + 1 }} / {{ artworks.length }}</span>
                  <button
                    class="art-nav-btn"
                    @click.stop="nextArt"
                    title="Next artwork"
                    aria-label="Next artwork"
                  >
                    ›
                  </button>
                  <button
                    class="art-nav-btn random-btn"
                    @click.stop="pickRandomArt"
                    title="Show random artwork"
                    aria-label="Show random artwork"
                  >
                    ✦
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: true
  },
  mode: {
    type: String,
    default: 'preloader' // 'preloader' | 'about'
  },
  minDuration: {
    type: Number,
    default: 2600 // ms
  }
})

const emit = defineEmits(['update:modelValue', 'ready', 'close'])

// Mughal, Indo-Islamic Architectural and Calligraphic Masterpieces
const artworks = [
  {
    id: 1,
    src: '/splash/khusrau_splash_1.jpg',
    title: 'Mughal Marble Jali & Pietra Dura Inlay',
    scripture: 'خدا کا نور جمالِ حیات',
    theme: 'White marble lattice screen with morning sunbeams and illuminated Nastaliq calligraphy'
  },
  {
    id: 2,
    src: '/splash/khusrau_splash_2.jpg',
    title: 'Indo-Islamic Muqarnas & Cobalt Dome',
    scripture: 'کاشی کاری و گنبدِ فلک',
    theme: 'Lapis lazuli mosaic vaulting, arabesque spiraling fractals, and celestial golden Thuluth script'
  },
  {
    id: 3,
    src: '/splash/khusrau_splash_3.jpg',
    title: 'Royal Mughal Pavilion & Illuminated Margin',
    scripture: 'یہ زندگی ہے عجب، یہ زفالی ہے یہ سماں سُہانا',
    theme: 'Twilight red sandstone pavilion and lotus water pool framed in gold-leaf arabesque borders'
  }
]

// Pick one randomly on mount
const activeArtIndex = ref(Math.floor(Math.random() * artworks.length))
const activeArt = computed(() => artworks[activeArtIndex.value] || artworks[0])

function nextArt() {
  activeArtIndex.value = (activeArtIndex.value + 1) % artworks.length
}

function prevArt() {
  activeArtIndex.value = (activeArtIndex.value - 1 + artworks.length) % artworks.length
}

function pickRandomArt() {
  if (artworks.length <= 1) return
  let next = activeArtIndex.value
  while (next === activeArtIndex.value) {
    next = Math.floor(Math.random() * artworks.length)
  }
  activeArtIndex.value = next
}

// Progress and Initialization Stages
const progress = ref(props.mode === 'about' ? 100 : 0)
const isReady = ref(props.mode === 'about')
const currentStatus = ref('Initializing Khusrau 5.0…')

const stages = [
  { at: 10, msg: 'Initializing typography core & HarfBuzz…' },
  { at: 30, msg: 'Loading Jameel Noori Nastaleeq shaping rules…' },
  { at: 55, msg: 'Indexing Urdu font catalog (600+ typefaces)…' },
  { at: 75, msg: 'Calibrating document canvas & layout grids…' },
  { at: 90, msg: 'Mounting InPage v3 Unicode & legacy v1 engine…' },
  { at: 100, msg: 'Khusrau 5.0 is ready.' }
]

let timer = null
let autoDismissTimer = null

function updateProgress() {
  if (props.mode === 'about') {
    progress.value = 100
    isReady.value = true
    currentStatus.value = 'Khusrau 5.0 is ready.'
    return
  }

  const startTime = Date.now()
  const duration = props.minDuration

  timer = setInterval(() => {
    const elapsed = Date.now() - startTime
    const ratio = Math.min(elapsed / duration, 1)

    // Ease-out progress curve
    const eased = 1 - Math.pow(1 - ratio, 2.2)
    progress.value = Math.min(100, eased * 100)

    for (let i = stages.length - 1; i >= 0; i--) {
      if (progress.value >= stages[i].at) {
        currentStatus.value = stages[i].msg
        break
      }
    }

    if (ratio >= 1) {
      clearInterval(timer)
      timer = null
      progress.value = 100
      isReady.value = true
      currentStatus.value = 'Khusrau 5.0 is ready.'
      emit('ready')

      // Auto dismiss after a short grace period
      autoDismissTimer = setTimeout(() => {
        close()
      }, 550)
    }
  }, 35)
}

function onDismiss() {
  close()
}

function close() {
  if (timer) clearInterval(timer)
  if (autoDismissTimer) clearTimeout(autoDismissTimer)
  emit('update:modelValue', false)
  emit('close')
}

onMounted(() => {
  if (props.modelValue && props.mode === 'preloader') {
    updateProgress()
  }
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  if (autoDismissTimer) clearTimeout(autoDismissTimer)
})
</script>

<style scoped>
/* Full-screen backdrop overlay */
.khusrau-splash-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at center, rgba(14, 22, 38, 0.88), rgba(4, 7, 14, 0.96));
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  padding: 16px;
  user-select: none;
  cursor: pointer;
}

.khusrau-splash-overlay.about-mode {
  cursor: default;
}

/* Splash Card Container (Photoshop CC Split Screen Architecture) */
.khusrau-splash-card {
  position: relative;
  width: 820px;
  max-width: 95vw;
  height: 500px;
  max-height: 92vh;
  display: flex;
  background: #090f1a;
  border-radius: 12px;
  overflow: hidden;
  box-shadow:
    0 25px 60px -12px rgba(0, 0, 0, 0.85),
    0 0 0 1px rgba(212, 175, 55, 0.28),
    0 0 35px rgba(26, 115, 232, 0.15);
  cursor: default;
}

/* Close button */
.splash-close-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 40;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(10, 16, 28, 0.75);
  color: #e2e8f0;
  font-size: 15px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
}
.splash-close-btn:hover {
  background: rgba(220, 38, 38, 0.85);
  border-color: rgba(255, 255, 255, 0.4);
  color: #fff;
  transform: scale(1.08);
}

/* Left Pane: Brand, Architecture, Credits */
.splash-brand-pane {
  position: relative;
  width: 390px;
  flex-shrink: 0;
  background: linear-gradient(170deg, #090f1a 0%, #0d1729 60%, #080d17 100%);
  padding: 30px 28px 22px 30px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-right: 1px solid rgba(212, 175, 55, 0.12);
  overflow: hidden;
  color: #cbd5e1;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.brand-watermark {
  position: absolute;
  top: -40px;
  right: -40px;
  width: 240px;
  height: 240px;
  color: #d4af37;
  pointer-events: none;
  z-index: 1;
}

.brand-header {
  position: relative;
  z-index: 2;
}

.brand-badge-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

/* Luxury Monogram Emblem */
.brand-icon-emblem {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: linear-gradient(135deg, #0f2744 0%, #081628 100%);
  border: 1.5px solid #d4af37;
  box-shadow:
    inset 0 0 12px rgba(212, 175, 55, 0.35),
    0 4px 14px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.emblem-urdu {
  font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif;
  font-size: 20px;
  line-height: 1;
  color: #fce79a;
  text-shadow: 0 0 8px rgba(212, 175, 55, 0.6);
  margin-top: -2px;
}

.emblem-sub {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1px;
  color: #60a5fa;
  margin-top: 1px;
}

.brand-titles {
  display: flex;
  flex-direction: column;
}

.brand-name-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.brand-name {
  margin: 0;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: #ffffff;
  background: linear-gradient(135deg, #ffffff 40%, #e2e8f0 70%, #d4af37 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1.05;
}

.version-tag {
  font-size: 13px;
  font-weight: 700;
  color: #d4af37;
  background: rgba(212, 175, 55, 0.12);
  border: 1px solid rgba(212, 175, 55, 0.35);
  border-radius: 4px;
  padding: 1px 6px;
  letter-spacing: 0.5px;
}

.brand-suite {
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: #38bdf8;
  margin-top: 3px;
}

/* Developed by Tariq Abdullah */
.brand-author-card {
  margin-top: 14px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-left: 3px solid #d4af37;
  border-radius: 4px;
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.author-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #94a3b8;
}

.author-name {
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
  letter-spacing: 0.2px;
}

/* Progress & Status */
.splash-progress-section {
  position: relative;
  z-index: 2;
  margin: 14px 0 10px;
}

.status-line {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 6px;
}

.status-pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #38bdf8;
  box-shadow: 0 0 8px #38bdf8;
  animation: pulse 1.2s infinite ease-in-out;
}
.status-pulse.ready {
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;
  animation: none;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}

.status-message {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #cbd5e1;
}

.status-percent {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #38bdf8;
}

.progress-bar-track {
  width: 100%;
  height: 3px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #0284c7 0%, #38bdf8 60%, #d4af37 100%);
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.6);
  transition: width 0.08s ease;
}

/* About mode feature chips */
.splash-about-features {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 12px 0 8px;
}

.feature-chip {
  font-size: 10px;
  background: rgba(56, 189, 248, 0.08);
  border: 1px solid rgba(56, 189, 248, 0.25);
  color: #7dd3fc;
  padding: 2px 7px;
  border-radius: 3px;
}

/* Architectural Credits (Photoshop CC Style) */
.splash-credits-roster {
  position: relative;
  z-index: 2;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 9px 12px;
}

.roster-title {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.2px;
  color: #d4af37;
  margin-bottom: 5px;
}

.roster-list {
  display: flex;
  flex-direction: column;
  gap: 3.5px;
}

.roster-row {
  display: flex;
  font-size: 10px;
  line-height: 1.35;
}

.roster-role {
  color: #64748b;
  width: 145px;
  flex-shrink: 0;
}

.roster-val {
  color: #e2e8f0;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Footer & Legal */
.splash-brand-footer {
  position: relative;
  z-index: 2;
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.legal-text {
  font-size: 9px;
  color: #64748b;
}

.launch-hint {
  font-size: 9px;
  color: #38bdf8;
  cursor: pointer;
  letter-spacing: 0.2px;
  transition: color 0.2s;
}
.launch-hint:hover {
  color: #7dd3fc;
  text-decoration: underline;
}

/* Right Pane: Artwork Showcase */
.splash-art-pane {
  position: relative;
  flex: 1;
  height: 100%;
  overflow: hidden;
  background: #050912;
}

.art-slide {
  position: relative;
  width: 100%;
  height: 100%;
}

.art-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
}

/* Vignette & Seamless Blend into Left Pane (Like Photoshop CC) */
.art-vignette-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(to right, #090f1a 0%, rgba(9, 15, 26, 0.6) 6%, transparent 22%),
    radial-gradient(circle at 80% 20%, transparent 60%, rgba(5, 9, 18, 0.5) 100%),
    linear-gradient(to top, rgba(5, 9, 18, 0.95) 0%, rgba(5, 9, 18, 0.4) 20%, transparent 40%);
}

/* Caption Dock & Art Navigator at Bottom Right */
.art-caption-dock {
  position: absolute;
  bottom: 14px;
  left: 18px;
  right: 18px;
  z-index: 10;
  background: rgba(10, 16, 28, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(212, 175, 55, 0.25);
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.art-meta-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.art-heritage-tag {
  font-size: 8.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #d4af37;
}

.art-title {
  font-size: 11.5px;
  font-weight: 600;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.art-nav-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.art-nav-btn {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #e2e8f0;
  font-size: 12px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: all 0.15s;
}
.art-nav-btn:hover {
  background: rgba(56, 189, 248, 0.25);
  border-color: #38bdf8;
  color: #fff;
}
.art-nav-btn.random-btn {
  color: #d4af37;
  font-size: 11px;
}
.art-nav-btn.random-btn:hover {
  background: rgba(212, 175, 55, 0.25);
  border-color: #d4af37;
  color: #fef08a;
}

.art-counter {
  font-size: 10px;
  font-weight: 600;
  color: #94a3b8;
  padding: 0 4px;
  font-variant-numeric: tabular-nums;
}

/* Fade Transitions */
.splash-fade-enter-active,
.splash-fade-leave-active {
  transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.splash-fade-enter-from,
.splash-fade-leave-to {
  opacity: 0;
  transform: scale(0.97);
}

.art-crossfade-enter-active,
.art-crossfade-leave-active {
  transition: opacity 0.35s ease;
}

.art-crossfade-enter-from,
.art-crossfade-leave-to {
  opacity: 0;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .khusrau-splash-card {
    flex-direction: column-reverse;
    height: auto;
    max-height: 94vh;
    overflow-y: auto;
  }
  .splash-brand-pane {
    width: 100%;
    border-right: 0;
    border-top: 1px solid rgba(212, 175, 55, 0.15);
  }
  .splash-art-pane {
    height: 220px;
  }
}
</style>
