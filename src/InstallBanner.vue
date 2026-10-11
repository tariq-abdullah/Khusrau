<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  installEvent: Object
})

const emit = defineEmits(['install', 'installed', 'dismiss'])

const isStandalone = ref(false)
const dismissed = ref(false)
const showInstructions = ref(false)

function checkIsStandalone() {
  if (typeof window === 'undefined') return false
  try {
    return (
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      (window.matchMedia && window.matchMedia('(display-mode: window-controls-overlay)').matches) ||
      (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches) ||
      window.navigator.standalone === true ||
      (document.referrer && document.referrer.includes('android-app://'))
    )
  } catch {
    return false
  }
}

const shouldShow = computed(() => {
  return !isStandalone.value && !dismissed.value
})

async function triggerInstall() {
  if (props.installEvent) {
    try {
      await props.installEvent.prompt()
      const choice = await props.installEvent.userChoice
      if (choice && choice.outcome === 'accepted') {
        dismissed.value = true
        emit('installed')
      }
    } catch (err) {
      console.warn('Install error', err)
      showInstructions.value = true
    }
  } else {
    // If beforeinstallprompt hasn't fired or is not supported by browser (e.g. Safari / Firefox / macOS)
    showInstructions.value = true
    emit('install')
  }
}

function dismissBanner() {
  dismissed.value = true
  emit('dismiss')
}

let mediaQueryListener = null

onMounted(() => {
  isStandalone.value = checkIsStandalone()

  if (typeof window !== 'undefined' && window.matchMedia) {
    try {
      const mq = window.matchMedia('(display-mode: standalone)')
      mediaQueryListener = (e) => {
        isStandalone.value = e.matches
      }
      mq.addEventListener ? mq.addEventListener('change', mediaQueryListener) : mq.addListener(mediaQueryListener)
    } catch {}
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('appinstalled', () => {
      isStandalone.value = true
      dismissed.value = true
      emit('installed')
    })
  }
})

onBeforeUnmount(() => {
  if (mediaQueryListener && typeof window !== 'undefined' && window.matchMedia) {
    try {
      const mq = window.matchMedia('(display-mode: standalone)')
      mq.removeEventListener ? mq.removeEventListener('change', mediaQueryListener) : mq.removeListener(mediaQueryListener)
    } catch {}
  }
})
</script>

<template>
  <Transition name="banner-slide">
    <div v-if="shouldShow" class="pwa-install-banner" role="region" aria-label="Install app banner">
      <button
        type="button"
        class="pwa-install-action-btn"
        aria-label="Install Khusrau 5.0 as an app on this device"
        title="Install Khusrau 5.0 as an app"
        @click="triggerInstall"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" class="install-glyph" aria-hidden="true">
          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
        </svg>
        <span>Install App</span>
      </button>
    </div>
  </Transition>

  <!-- Quick Helper Dialog for browsers without native prompt (e.g. Safari / macOS) -->
  <Teleport to="body">
    <div v-if="showInstructions" class="pwa-instructions-overlay" @click="showInstructions = false">
      <div class="pwa-instructions-card" @click.stop>
        <div class="instructions-header">
          <h4>Install Khusrau 5.0 on your device</h4>
          <button type="button" class="instructions-close" @click="showInstructions = false">✕</button>
        </div>
        <div class="instructions-body">
          <div class="instruction-item">
            <span class="instruction-step">1</span>
            <div>
              <strong>Chrome / Edge:</strong> Click the <strong>Install</strong> icon (⤓) in the browser address bar, or click <strong>Menu ⋮ &gt; Cast, save, and share &gt; Install Khusrau</strong>.
            </div>
          </div>
          <div class="instruction-item">
            <span class="instruction-step">2</span>
            <div>
              <strong>Safari (Mac / iOS):</strong> Click the <strong>Share</strong> button (⎙ / ↑) and choose <strong>Add to Dock</strong> or <strong>Add to Home Screen</strong>.
            </div>
          </div>
          <div class="instruction-item">
            <span class="instruction-step">3</span>
            <div>
              <strong>Offline & Native:</strong> Works completely offline with full Urdu typography and fast native window speed.
            </div>
          </div>
        </div>
        <div class="instructions-footer">
          <button type="button" class="instructions-ok-btn" @click="showInstructions = false">Got it</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.pwa-install-banner {
  display: flex !important;
  align-items: center;
  flex-shrink: 0;
  z-index: 21;
  user-select: none;
}

.pwa-install-action-btn {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  gap: 5px;
  background: linear-gradient(180deg, #1d4ed8 0%, #1e40af 100%);
  color: #ffffff !important;
  border: 1px solid #1e3a8a !important;
  border-radius: 14px !important;
  padding: 0 11px !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
  cursor: pointer;
  transition: all 0.15s ease;
  height: 28px !important;
  min-height: 28px !important;
  width: auto !important;
  min-width: max-content !important;
  line-height: 1;
  box-shadow: 0 1px 3px rgba(30, 60, 100, 0.25);
}

.pwa-install-action-btn:hover {
  background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%);
  box-shadow: 0 2px 5px rgba(37, 99, 235, 0.35);
  transform: translateY(-0.5px);
}

.install-glyph {
  flex-shrink: 0;
}

/* Slide Transition */
.banner-slide-enter-active,
.banner-slide-leave-active {
  transition: all 0.2s ease-out;
}

.banner-slide-enter-from,
.banner-slide-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Instructions Modal */
.pwa-instructions-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  display: grid;
  place-items: center;
  z-index: 2000;
  padding: 16px;
}

.pwa-instructions-card {
  width: min(440px, 92vw);
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #dadce0;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.3);
  padding: 18px 20px;
  box-sizing: border-box;
  animation: modal-pop 0.18s ease-out;
}

@keyframes modal-pop {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.instructions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.instructions-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #1e3a8a;
}

.instructions-close {
  background: transparent;
  border: none;
  font-size: 16px;
  color: #64748b;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

.instructions-close:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.instructions-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 12px;
  color: #334155;
  line-height: 1.45;
}

.instruction-item {
  display: flex;
  align-items: flex-start;
  gap: 9px;
}

.instruction-step {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #dbeafe;
  color: #1e40af;
  font-weight: bold;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

.instructions-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.instructions-ok-btn {
  background: #1e40af;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 6px 18px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
}

.instructions-ok-btn:hover {
  background: #1d4ed8;
}
</style>
