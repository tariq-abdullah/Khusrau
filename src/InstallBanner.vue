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
    // If beforeinstallprompt hasn't fired or is not supported by browser (e.g. Safari / Firefox)
    showInstructions.value = true
    emit('install')
  }
}

function dismissBanner() {
  dismissed.value = true
  try {
    sessionStorage.setItem('khusrau-pwa-banner-dismissed', '1')
  } catch {}
  emit('dismiss')
}

let mediaQueryListener = null

onMounted(() => {
  isStandalone.value = checkIsStandalone()

  try {
    if (sessionStorage.getItem('khusrau-pwa-banner-dismissed') === '1') {
      dismissed.value = true
    }
  } catch {}

  if (typeof window !== 'undefined' && window.matchMedia) {
    try {
      const mq = window.matchMedia('(display-mode: standalone)')
      mediaQueryListener = (e) => {
        isStandalone.value = e.matches
      }
      mq.addEventListener ? mq.addEventListener('change', mediaQueryListener) : mq.addListener(mediaQueryListener)
    } catch {}
  }

  window.addEventListener('appinstalled', () => {
    isStandalone.value = true
    dismissed.value = true
    emit('installed')
  })
})

onBeforeUnmount(() => {
  if (mediaQueryListener && window.matchMedia) {
    try {
      const mq = window.matchMedia('(display-mode: standalone)')
      mq.removeEventListener ? mq.removeEventListener('change', mediaQueryListener) : mq.removeListener(mediaQueryListener)
    } catch {}
  }
})
</script>

<template>
  <Transition name="banner-slide">
    <aside v-if="shouldShow" class="pwa-install-banner" role="banner" aria-label="Install app banner">
      <div class="pwa-banner-left">
        <div class="pwa-icon-box">
          <img src="/icon.svg" alt="Khusrau Icon" class="pwa-app-icon" />
        </div>
        <div class="pwa-banner-text">
          <div class="pwa-banner-headline">
            <span class="pwa-badge">PWA</span>
            <strong class="pwa-app-title">Install Khusrau 5.0 as an app</strong>
          </div>
          <span class="pwa-banner-desc">
            Fast offline access, native window experience, and dedicated Urdu typography on this device.
          </span>
        </div>
      </div>

      <div class="pwa-banner-right">
        <button
          type="button"
          class="pwa-install-action-btn"
          aria-label="Install Khusrau 5.0 as an app on this device"
          @click="triggerInstall"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" class="install-glyph">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
          </svg>
          <span>Install App</span>
        </button>
        <button
          type="button"
          class="pwa-banner-dismiss-btn"
          title="Dismiss banner"
          aria-label="Dismiss banner"
          @click="dismissBanner"
        >
          ✕
        </button>
      </div>

      <!-- Quick Helper Dialog for browsers without native prompt (e.g. Safari / macOS) -->
      <div v-if="showInstructions" class="pwa-instructions-overlay" @click="showInstructions = false">
        <div class="pwa-instructions-card" @click.stop>
          <div class="instructions-header">
            <h4>Install Khusrau on your device</h4>
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
                <strong>Offline support:</strong> The app will automatically work without internet connection once installed.
              </div>
            </div>
          </div>
          <div class="instructions-footer">
            <button type="button" class="instructions-ok-btn" @click="showInstructions = false">Got it</button>
          </div>
        </div>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.pwa-install-banner {
  background: linear-gradient(90deg, #f0f6ff 0%, #ffffff 50%, #f6faff 100%);
  border-bottom: 1px solid #bfdbfe;
  box-shadow: 0 1px 3px rgba(30, 60, 100, 0.08);
  padding: 4px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
  z-index: 35;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Tahoma, sans-serif;
  box-sizing: border-box;
}

.pwa-banner-left {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  flex: 1;
}

.pwa-icon-box {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: white;
  border: 1px solid #bfdbfe;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.pwa-app-icon {
  width: 18px;
  height: 18px;
  display: block;
}

.pwa-banner-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 1px;
}

.pwa-banner-headline {
  display: flex;
  align-items: center;
  gap: 6px;
  line-height: 1.2;
}

.pwa-badge {
  font-size: 8.5px;
  font-weight: 700;
  color: #1e40af;
  background: #dbeafe;
  border: 1px solid #bfdbfe;
  border-radius: 3px;
  padding: 0 4px;
  letter-spacing: 0.4px;
  line-height: 1.2;
}

.pwa-app-title {
  font-size: 11.5px;
  color: #1e3a8a;
  font-weight: 600;
  white-space: nowrap;
}

.pwa-banner-desc {
  font-size: 10px;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pwa-banner-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.pwa-install-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: linear-gradient(180deg, #1d4ed8 0%, #1e40af 100%);
  color: #ffffff;
  border: 1px solid #1e3a8a;
  border-radius: 100px;
  padding: 3px 12px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  min-height: 22px;
  line-height: 1;
  box-shadow: 0 1px 2px rgba(30, 60, 100, 0.2);
}

.pwa-install-action-btn:hover {
  background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%);
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);
}

.install-glyph {
  flex-shrink: 0;
}

.pwa-banner-dismiss-btn {
  background: transparent;
  border: none;
  font-size: 14px;
  color: #64748b;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
  line-height: 1;
  min-height: auto;
}

.pwa-banner-dismiss-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #0f172a;
}

/* Slide Transition */
.banner-slide-enter-active,
.banner-slide-leave-active {
  transition: all 0.2s ease-out;
}

.banner-slide-enter-from,
.banner-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Instructions Modal */
.pwa-instructions-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
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
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
  padding: 16px 18px;
  box-sizing: border-box;
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
}

.instructions-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 11.5px;
  color: #334155;
  line-height: 1.45;
}

.instruction-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
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
  margin-top: 14px;
}

.instructions-ok-btn {
  background: #1e40af;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 6px 16px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

@media (max-width: 600px) {
  .pwa-banner-desc {
    display: none;
  }
}
</style>
