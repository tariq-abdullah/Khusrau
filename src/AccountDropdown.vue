<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const open = ref(false)
const signedIn = ref(true)

const currentAccount = ref({
  name: 'Tariq Abdullah',
  email: 'tariq.abdullah@khusrau.net',
  initials: 'T',
  role: 'Author • Khusrau 5.0'
})

const secondaryAccount = ref({
  name: 'Khusrau Guest',
  email: 'guest@khusrau.net',
  initials: 'G',
  role: 'Guest Profile'
})

const activeAccountIndex = ref(0)
const feedbackMessage = ref('')

function toggleMenu() {
  open.value = !open.value
  feedbackMessage.value = ''
}

function closeMenu() {
  open.value = false
  feedbackMessage.value = ''
}

function handleKeyDown(e) {
  if (e.key === 'Escape' && open.value) {
    closeMenu()
  }
}

function switchAccount(index) {
  activeAccountIndex.value = index
  feedbackMessage.value = index === 0 ? 'Switched to Tariq Abdullah' : 'Switched to Khusrau Guest'
  setTimeout(() => { feedbackMessage.value = '' }, 2500)
}

function addAccount() {
  feedbackMessage.value = 'Add account: Authentication backend will connect here.'
  setTimeout(() => { feedbackMessage.value = '' }, 3000)
}

function manageAccount() {
  feedbackMessage.value = 'Account settings: Profile & sync preferences.'
  setTimeout(() => { feedbackMessage.value = '' }, 3000)
}

function toggleSignOut() {
  signedIn.value = !signedIn.value
  feedbackMessage.value = signedIn.value ? 'Signed back in' : 'Signed out (Local mode)'
  setTimeout(() => { feedbackMessage.value = '' }, 2500)
}

function handleClickOutside(e) {
  if (!e.target.closest('.google-account-container')) {
    closeMenu()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="google-account-container" @click.stop>
    <!-- Ribbon Account Avatar Button -->
    <button
      type="button"
      class="nav-account-btn ribbon-account-btn"
      :class="{ 'menu-open': open }"
      :aria-expanded="open"
      aria-haspopup="true"
      aria-label="Google Account"
      :data-tooltip="signedIn ? (activeAccountIndex === 0 ? currentAccount.name + ' (' + currentAccount.email + ')' : secondaryAccount.name + ' (' + secondaryAccount.email + ')') : 'Sign in to Khusrau Account'"
      @click="toggleMenu"
    >
      <span v-if="signedIn" class="account-avatar-pill" :class="'avatar-theme-' + activeAccountIndex">
        {{ activeAccountIndex === 0 ? currentAccount.initials : secondaryAccount.initials }}
      </span>
      <span v-else class="account-avatar-pill avatar-signed-out">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      </span>
    </button>

    <!-- Google-style Account Dropdown Card -->
    <div v-if="open" class="google-account-dropdown" role="dialog" aria-label="Google Account Menu">
      <!-- Card Header: Email & Close -->
      <div class="account-card-header">
        <span class="account-header-email">
          {{ signedIn ? (activeAccountIndex === 0 ? currentAccount.email : secondaryAccount.email) : 'Not signed in' }}
        </span>
        <button type="button" class="account-close-btn" aria-label="Close account menu" @click="closeMenu">✕</button>
      </div>

      <!-- Feedback notice if action clicked -->
      <div v-if="feedbackMessage" class="account-feedback-banner">
        {{ feedbackMessage }}
      </div>

      <!-- Profile Overview Section -->
      <div class="account-profile-section">
        <div class="large-avatar-wrapper">
          <div class="large-avatar" :class="'avatar-theme-' + activeAccountIndex">
            {{ signedIn ? (activeAccountIndex === 0 ? currentAccount.initials : secondaryAccount.initials) : '?' }}
          </div>
          <button v-if="signedIn" type="button" class="avatar-camera-btn" title="Change profile picture" aria-label="Change photo" @click="manageAccount">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
              <path d="M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4z"/>
              <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
            </svg>
          </button>
        </div>
        <div class="profile-name">
          {{ signedIn ? (activeAccountIndex === 0 ? currentAccount.name : secondaryAccount.name) : 'Guest Workspace' }}
        </div>
        <div class="profile-role">
          {{ signedIn ? (activeAccountIndex === 0 ? currentAccount.role : secondaryAccount.role) : 'Offline local mode' }}
        </div>
        <button type="button" class="google-pill-btn manage-account-btn" @click="manageAccount">
          Manage your Khusrau Account
        </button>
      </div>

      <!-- Account Switcher Box -->
      <div v-if="signedIn" class="account-switcher-box">
        <div
          class="account-row-item"
          :class="{ active: activeAccountIndex === 0 }"
          role="button"
          tabindex="0"
          @click="switchAccount(0)"
        >
          <div class="mini-avatar avatar-theme-0">{{ currentAccount.initials }}</div>
          <div class="account-item-info">
            <div class="account-item-name">{{ currentAccount.name }}</div>
            <div class="account-item-sub">{{ currentAccount.email }}</div>
          </div>
          <span v-if="activeAccountIndex === 0" class="active-check-icon">✓</span>
        </div>

        <div
          class="account-row-item"
          :class="{ active: activeAccountIndex === 1 }"
          role="button"
          tabindex="0"
          @click="switchAccount(1)"
        >
          <div class="mini-avatar avatar-theme-1">{{ secondaryAccount.initials }}</div>
          <div class="account-item-info">
            <div class="account-item-name">{{ secondaryAccount.name }}</div>
            <div class="account-item-sub">{{ secondaryAccount.email }}</div>
          </div>
          <span v-if="activeAccountIndex === 1" class="active-check-icon">✓</span>
        </div>

        <div class="account-row-action" role="button" tabindex="0" @click="addAccount">
          <span class="action-icon">+</span>
          <span class="action-label">Add another account</span>
        </div>
      </div>

      <!-- Cloud Sync & Storage Indicator -->
      <div class="account-sync-section">
        <div class="sync-row">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="#1a73e8" class="cloud-icon">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
          </svg>
          <div class="sync-info">
            <span class="sync-title">Cloud Storage & Drive Backup</span>
            <span class="sync-sub">Synced with local storage • 14.2 MB of 15 GB used</span>
          </div>
        </div>
      </div>

      <!-- Bottom Sign Out / Sign In Pill -->
      <div class="account-actions-bottom">
        <button type="button" class="google-pill-btn sign-out-btn" @click="toggleSignOut">
          {{ signedIn ? 'Sign out of all accounts' : 'Sign in to Google Account' }}
        </button>
      </div>

      <!-- Footer Policy & Terms -->
      <div class="account-footer-links">
        <a href="#privacy" @click.prevent="feedbackMessage = 'Privacy Policy: Data is stored privately on your device.'">Privacy Policy</a>
        <span class="footer-dot">•</span>
        <a href="#terms" @click.prevent="feedbackMessage = 'Terms of Service: Khusrau 5.0 Urdu Suite.'">Terms of Service</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.google-account-container {
  position: relative;
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
  flex-shrink: 0;
}

.nav-account-btn,
.ribbon-account-btn {
  width: 32px;
  height: 32px;
  min-height: 32px;
  padding: 0;
  border-radius: 50%;
  border: 1.5px solid #b8c4d4;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.18s ease;
  box-sizing: border-box;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.nav-account-btn:hover,
.ribbon-account-btn:hover {
  border-color: #1a73e8;
  box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.25), 0 2px 6px rgba(0, 0, 0, 0.15);
  transform: scale(1.04);
}

.nav-account-btn.menu-open,
.ribbon-account-btn.menu-open {
  border-color: #1a73e8;
  box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.35);
}

.account-avatar-pill {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Google Sans", sans-serif;
  font-size: 14.5px;
  font-weight: 600;
  color: white;
  line-height: 1;
}

.avatar-theme-0 {
  background: linear-gradient(135deg, #1a73e8 0%, #1557b0 100%);
}

.avatar-theme-1 {
  background: linear-gradient(135deg, #0f9d58 0%, #0b8043 100%);
}

.avatar-signed-out {
  background: #5f6368;
  color: #fff;
}

/* Google-style Dropdown Card */
.google-account-dropdown {
  position: absolute;
  top: 38px;
  right: 0;
  width: 330px;
  max-width: 90vw;
  background: #ffffff;
  border: 1px solid #dadce0;
  border-radius: 24px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.18), 0 1px 4px rgba(0, 0, 0, 0.08);
  padding: 16px 14px 14px;
  z-index: 1000;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Google Sans", Tahoma, sans-serif;
  box-sizing: border-box;
  animation: google-dropdown-pop 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  color: #202124;
}

@keyframes google-dropdown-pop {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-6px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.account-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 6px;
}

.account-header-email {
  font-size: 12px;
  color: #5f6368;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-close-btn {
  background: transparent;
  border: none;
  font-size: 14px;
  color: #5f6368;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 50%;
  line-height: 1;
  min-height: auto;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.account-close-btn:hover {
  background: #f1f3f4;
  color: #202124;
}

.account-feedback-banner {
  background: #e8f0fe;
  color: #1967d2;
  font-size: 11px;
  padding: 6px 10px;
  border-radius: 8px;
  margin: 4px 0 8px;
  text-align: center;
  border: 1px solid #c2e7ff;
}

/* Profile Section */
.account-profile-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 6px 0 10px;
}

.large-avatar-wrapper {
  position: relative;
  width: 60px;
  height: 60px;
  margin-bottom: 8px;
}

.large-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 600;
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.avatar-camera-btn {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 22px;
  height: 22px;
  min-height: auto;
  border-radius: 50%;
  background: #ffffff;
  border: 1px solid #dadce0;
  color: #5f6368;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.avatar-camera-btn:hover {
  background: #f1f3f4;
  color: #1a73e8;
}

.profile-name {
  font-size: 16px;
  font-weight: 600;
  color: #202124;
  line-height: 1.2;
}

.profile-role {
  font-size: 11px;
  color: #5f6368;
  margin: 2px 0 8px;
}

.google-pill-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border: 1px solid #747775;
  border-radius: 100px;
  font-size: 12.5px;
  font-weight: 500;
  color: #0b57d0;
  padding: 6px 18px;
  cursor: pointer;
  transition: all 0.15s ease;
  min-height: auto;
  line-height: 1.3;
}

.google-pill-btn:hover {
  background: #f8fafd;
  border-color: #0b57d0;
  color: #0842a0;
}

/* Account Switcher Box */
.account-switcher-box {
  background: #f8fafd;
  border: 1px solid #e0e2e5;
  border-radius: 16px;
  margin: 10px 0;
  overflow: hidden;
}

.account-row-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.12s ease;
}

.account-row-item:hover {
  background: #f0f4f9;
}

.account-row-item.active {
  background: #eaf1fb;
}

.mini-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: white;
  flex-shrink: 0;
}

.account-item-info {
  flex: 1;
  min-width: 0;
  text-align: left;
}

.account-item-name {
  font-size: 12.5px;
  font-weight: 500;
  color: #202124;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-item-sub {
  font-size: 10.5px;
  color: #5f6368;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.active-check-icon {
  font-size: 14px;
  color: #1a73e8;
  font-weight: bold;
}

.account-row-action {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-top: 1px solid #e0e2e5;
  cursor: pointer;
  background: #ffffff;
  transition: background 0.12s ease;
}

.account-row-action:hover {
  background: #f8fafd;
}

.action-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  color: #5f6368;
}

.action-label {
  font-size: 12px;
  color: #3c4043;
  font-weight: 500;
}

/* Sync Section */
.account-sync-section {
  padding: 8px 6px;
  border-top: 1px solid #f1f3f4;
  margin-top: 4px;
}

.sync-row {
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
}

.cloud-icon {
  flex-shrink: 0;
}

.sync-info {
  display: flex;
  flex-direction: column;
}

.sync-title {
  font-size: 11.5px;
  font-weight: 500;
  color: #1f1f1f;
}

.sync-sub {
  font-size: 10px;
  color: #5f6368;
}

/* Actions Bottom */
.account-actions-bottom {
  display: flex;
  justify-content: center;
  margin: 10px 0 6px;
}

.sign-out-btn {
  color: #3c4043;
  border-color: #dadce0;
  font-size: 12px;
  width: 100%;
}

.sign-out-btn:hover {
  background: #f8f9fa;
  border-color: #dadce0;
  color: #202124;
}

/* Footer Links */
.account-footer-links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px solid #f1f3f4;
  font-size: 10.5px;
  color: #5f6368;
}

.account-footer-links a {
  color: inherit;
  text-decoration: none;
}

.account-footer-links a:hover {
  text-decoration: underline;
}

.footer-dot {
  font-size: 8px;
}
</style>
