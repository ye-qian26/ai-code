<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

const isLoggedIn = computed(() => userStore.isLoggedIn)
const isAdmin = computed(() => userStore.isAdmin)
const user = computed(() => userStore.user)

const handleLogout = async () => {
  await userStore.logout()
  router.push('/')
}

const goTo = (path) => {
  router.push(path)
}
</script>

<template>
  <header class="header">
    <div class="header-inner container">
      <!-- Logo / Masthead -->
      <div class="brand" @click="goTo('/')">
        <span class="masthead">AI CODE</span>
        <span class="brand-line"></span>
      </div>

      <!-- Navigation -->
      <nav class="nav">
        <router-link to="/" class="nav-link">Home</router-link>
        <router-link v-if="isLoggedIn" to="/my-apps" class="nav-link">My Apps</router-link>
        <router-link v-if="isLoggedIn && isAdmin" to="/admin/apps" class="nav-link">Admin</router-link>
      </nav>

      <!-- User Section -->
      <div class="user-section">
        <template v-if="isLoggedIn">
          <span class="user-name">{{ user?.userName || user?.userAccount }}</span>
          <span v-if="isAdmin" class="tag tag-red">Admin</span>
          <button class="btn btn-small" @click="goTo('/app/create')">Create</button>
          <button class="btn btn-small btn-text" @click="handleLogout">Logout</button>
        </template>
        <template v-else>
          <button class="btn btn-small" @click="goTo('/login')">Sign In</button>
          <button class="btn btn-small btn-primary" @click="goTo('/register')">Subscribe</button>
        </template>
      </div>
    </div>

    <!-- Red accent line -->
    <div class="header-accent"></div>
  </header>
</template>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 80px;
  background: var(--white);
  border-bottom: var(--border-light);
  z-index: 100;
  display: flex;
  align-items: center;
}

.header-inner {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  flex-direction: column;
  cursor: pointer;
}

.masthead {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--black);
}

.brand-line {
  width: 60px;
  height: 2px;
  background: var(--accent-red);
  margin-top: var(--space-xs);
}

.nav {
  display: flex;
  gap: var(--space-xl);
}

.nav-link {
  font-family: var(--font-body);
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--dark-gray);
  padding: var(--space-sm) 0;
  position: relative;
}

.nav-link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 1px;
  background: var(--black);
  transition: width var(--transition);
}

.nav-link:hover::after,
.nav-link.router-link-active::after {
  width: 100%;
}

.nav-link.router-link-active {
  color: var(--black);
}

.user-section {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.user-name {
  font-family: var(--font-serif);
  font-size: 0.9rem;
  font-style: italic;
  color: var(--dark-gray);
}

.header-accent {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--accent-red);
  opacity: 0;
  transition: opacity var(--transition);
}

.header:hover .header-accent {
  opacity: 1;
}

@media (max-width: 768px) {
  .header-inner {
    padding: var(--space-md);
  }

  .nav {
    gap: var(--space-lg);
  }

  .nav-link {
    font-size: 0.85rem;
  }

  .user-section {
    gap: var(--space-sm);
  }

  .user-name {
    display: none;
  }
}
</style>