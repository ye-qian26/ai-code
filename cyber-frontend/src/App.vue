<script setup>
import { onMounted } from 'vue'
import { useUserStore } from './stores/user'
import MagazineHeader from './components/MagazineHeader.vue'

const userStore = useUserStore()

onMounted(() => {
  userStore.fetchCurrentUser()
})
</script>

<template>
  <div class="app">
    <MagazineHeader />
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <footer class="site-footer">
      <div class="footer-inner container">
        <div class="footer-divider"></div>
        <p class="footer-text">AI CODE — Intelligent Application Generation</p>
        <p class="footer-copyright">© 2024</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding-top: 80px;
}

.site-footer {
  background: var(--off-white);
  border-top: var(--border-light);
  padding: var(--space-xl) 0;
}

.footer-inner {
  text-align: center;
}

.footer-divider {
  width: 40px;
  height: 1px;
  background: var(--black);
  margin: 0 auto var(--space-md);
}

.footer-text {
  font-family: var(--font-display);
  font-size: 0.9rem;
  letter-spacing: 0.1em;
  color: var(--dark-gray);
  margin-bottom: var(--space-sm);
}

.footer-copyright {
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: var(--light-gray);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>