<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/user'

const router = useRouter()
const userStore = useUserStore()

const form = ref({
  userAccount: '',
  userPassword: '',
  checkPassword: ''
})

const loading = ref(false)
const error = ref('')

const handleRegister = async () => {
  if (!form.value.userAccount || !form.value.userPassword || !form.value.checkPassword) {
    error.value = 'Please fill in all fields'
    return
  }

  if (form.value.userPassword !== form.value.checkPassword) {
    error.value = 'Passwords do not match'
    return
  }

  if (form.value.userPassword.length < 8) {
    error.value = 'Password must be at least 8 characters'
    return
  }

  loading.value = true
  error.value = ''

  try {
    await userStore.register(form.value)
    router.push('/login')
  } catch (err) {
    error.value = err.message || 'Registration failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register-page">
    <div class="register-container container container-narrow">
      <div class="register-header">
        <p class="masthead">New Reader</p>
        <h1 class="headline">Subscribe</h1>
        <p class="section-subtitle">Create your account to start building</p>
      </div>

      <div class="divider-accent"></div>

      <form class="register-form" @submit.prevent="handleRegister">
        <div class="form-group">
          <label class="form-label">Account Name</label>
          <input
            v-model="form.userAccount"
            type="text"
            class="form-input"
            placeholder="Choose an account name"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Password</label>
          <input
            v-model="form.userPassword"
            type="password"
            class="form-input"
            placeholder="At least 8 characters"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Confirm Password</label>
          <input
            v-model="form.checkPassword"
            type="password"
            class="form-input"
            placeholder="Repeat your password"
          />
        </div>

        <div v-if="error" class="message message-error">
          {{ error }}
        </div>

        <button type="submit" class="btn btn-primary register-btn" :disabled="loading">
          {{ loading ? 'Creating...' : 'Create Account' }}
        </button>
      </form>

      <div class="register-footer">
        <p class="footer-text">Already subscribed?</p>
        <router-link to="/login" class="btn btn-text">Sign In</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-page {
  padding: var(--space-4xl) 0;
  background: var(--off-white);
}

.register-container {
  max-width: 400px;
}

.register-header {
  margin-bottom: var(--space-xl);
}

.register-form {
  margin-top: var(--space-xl);
}

.register-btn {
  width: 100%;
  margin-top: var(--space-lg);
}

.register-footer {
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