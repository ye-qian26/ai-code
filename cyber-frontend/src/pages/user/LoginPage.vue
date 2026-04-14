<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../../stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const form = ref({
  userAccount: '',
  userPassword: ''
})

const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  if (!form.value.userAccount || !form.value.userPassword) {
    error.value = 'Please enter your credentials'
    return
  }

  loading.value = true
  error.value = ''

  try {
    await userStore.login(form.value)
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  } catch (err) {
    error.value = err.message || 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-container container container-narrow">
      <div class="login-header">
        <p class="masthead">Account</p>
        <h1 class="headline">Sign In</h1>
        <p class="section-subtitle">Access your applications and creations</p>
      </div>

      <div class="divider-accent"></div>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="form-label">Account</label>
          <input
            v-model="form.userAccount"
            type="text"
            class="form-input"
            placeholder="Enter your account name"
            autocomplete="username"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Password</label>
          <input
            v-model="form.userPassword"
            type="password"
            class="form-input"
            placeholder="Enter your password"
            autocomplete="current-password"
          />
        </div>

        <div v-if="error" class="message message-error">
          {{ error }}
        </div>

        <button type="submit" class="btn btn-primary login-btn" :disabled="loading">
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <div class="login-footer">
        <p class="footer-text">Don't have an account?</p>
        <router-link to="/register" class="btn btn-text">Subscribe</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  padding: var(--space-4xl) 0;
  background: var(--off-white);
}

.login-container {
  max-width: 400px;
}

.login-header {
  margin-bottom: var(--space-xl);
}

.login-form {
  margin-top: var(--space-xl);
}

.login-btn {
  width: 100%;
  margin-top: var(--space-lg);
}

.login-footer {
  margin-top: var(--space-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
}

.footer-text {
  font-family: var(--font-serif);
  font-size: 0.9rem;
  color: var(--medium-gray);
  font-style: italic;
}
</style>