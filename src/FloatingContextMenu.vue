<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'

const props = defineProps({
  visible: Boolean,
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 }
})

const emit = defineEmits(['action', 'close'])

const menuEl = ref(null)
const openSubmenu = ref(false)
const adjustedPos = ref({ top: 0, left: 0 })

function computePosition() {
  if (!props.visible) return
  const menuWidth = 160
  const menuHeight = 220
  let left = props.x
  let top = props.y

  if (typeof window !== 'undefined') {
    if (left + menuWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - menuWidth - 8)
    }
    if (top + menuHeight > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - menuHeight - 8)
    }
  }

  adjustedPos.value = { top, left }
}

watch(() => [props.visible, props.x, props.y], () => {
  if (props.visible) {
    openSubmenu.value = false
    nextTick(computePosition)
  }
}, { immediate: true })

function handleAction(cmd) {
  emit('action', cmd)
  emit('close')
}

function handleGlobalClick(e) {
  if (!props.visible) return
  if (!menuEl.value || !menuEl.value.contains(e.target)) {
    emit('close')
  }
}

function handleKeyDown(e) {
  if (e.key === 'Escape' && props.visible) {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleGlobalClick, true)
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('resize', () => emit('close'))
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleGlobalClick, true)
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('resize', () => emit('close'))
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="menuEl"
      class="inpage-floating-context-menu"
      :style="{ top: adjustedPos.top + 'px', left: adjustedPos.left + 'px' }"
      role="menu"
      aria-label="Context Menu"
      @click.stop
    >
      <!-- Zoom Item with Submenu -->
      <div
        class="context-menu-item with-submenu"
        role="menuitem"
        tabindex="0"
        @mouseenter="openSubmenu = true"
        @mouseleave="openSubmenu = false"
        @click="openSubmenu = !openSubmenu"
      >
        <span>Zoom</span>
        <span class="submenu-arrow">›</span>

        <!-- Zoom Submenu -->
        <div v-if="openSubmenu" class="context-submenu-flyout" role="menu">
          <button type="button" role="menuitem" @click.stop="handleAction('zoom50')">
            50%
          </button>
          <button type="button" role="menuitem" @click.stop="handleAction('zoom100')">
            Actual (100%)
          </button>
          <button type="button" role="menuitem" @click.stop="handleAction('zoom200')">
            200%
          </button>
          <hr class="context-divider" />
          <button type="button" role="menuitem" @click.stop="handleAction('fit')">
            Fit in Window
          </button>
        </div>
      </div>

      <!-- Import... -->
      <button type="button" class="context-menu-item" role="menuitem" @click="handleAction('import')">
        Import…
      </button>

      <!-- Select All -->
      <button type="button" class="context-menu-item" role="menuitem" @click="handleAction('all')">
        Select All
      </button>

      <hr class="context-divider" />

      <!-- Paste -->
      <button type="button" class="context-menu-item" role="menuitem" @click="handleAction('paste')">
        Paste
      </button>

      <hr class="context-divider" />

      <!-- Character... -->
      <button type="button" class="context-menu-item" role="menuitem" @click="handleAction('character')">
        Character…
      </button>

      <!-- Paragraph... -->
      <button type="button" class="context-menu-item" role="menuitem" @click="handleAction('paragraph')">
        Paragraph…
      </button>

      <!-- Table... -->
      <button type="button" class="context-menu-item" role="menuitem" @click="handleAction('table')">
        Table…
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.inpage-floating-context-menu {
  position: fixed;
  z-index: 9999;
  width: 145px;
  background: #ffffff;
  border: 1px solid #d4d4d4;
  border-radius: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.08);
  padding: 4px 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, Arial, sans-serif;
  box-sizing: border-box;
  user-select: none;
  animation: context-menu-fade-in 0.1s ease-out;
}

@keyframes context-menu-fade-in {
  from {
    opacity: 0;
    transform: scale(0.97);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.context-menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
  border: none;
  background: transparent;
  height: 25px;
  min-height: 25px;
  padding: 2px 14px;
  font-size: 11.5px;
  color: #1f1f1f;
  cursor: pointer;
  box-sizing: border-box;
  line-height: 1;
  transition: background 0.08s ease;
}

.context-menu-item:hover,
.context-menu-item:focus-visible {
  background: #eaf1fb;
  color: #0b57d0;
  outline: none;
}

.context-menu-item.with-submenu {
  position: relative;
}

.submenu-arrow {
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  color: #555555;
  margin-left: auto;
}

.context-menu-item:hover .submenu-arrow {
  color: #0b57d0;
}

.context-divider {
  border: 0;
  border-top: 1px solid #e5e5e5;
  margin: 3px 6px;
}

/* Zoom Submenu Flyout */
.context-submenu-flyout {
  position: absolute;
  left: calc(100% - 2px);
  top: -4px;
  width: 130px;
  background: #ffffff;
  border: 1px solid #d4d4d4;
  border-radius: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.08);
  padding: 4px 0;
  z-index: 10000;
  box-sizing: border-box;
  animation: context-menu-fade-in 0.1s ease-out;
}

.context-submenu-flyout button {
  width: 100%;
  display: flex;
  align-items: center;
  text-align: left;
  border: none;
  background: transparent;
  height: 24px;
  min-height: 24px;
  padding: 2px 14px;
  font-size: 11.5px;
  color: #1f1f1f;
  cursor: pointer;
  box-sizing: border-box;
  line-height: 1;
  transition: background 0.08s ease;
}

.context-submenu-flyout button:hover,
.context-submenu-flyout button:focus-visible {
  background: #eaf1fb;
  color: #0b57d0;
  outline: none;
}
</style>
