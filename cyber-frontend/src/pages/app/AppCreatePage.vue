<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { appApi } from '../../api/app'

const router = useRouter()

const form = ref({
  initPrompt: ''
})

const loading = ref(false)
const error = ref('')

const handleCreate = async () => {
  if (!form.value.initPrompt) {
    error.value = 'Please describe your application'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const res = await appApi.add(form.value)
    // Redirect to chat page with new=true to auto-send initial prompt
    router.push({
      name: 'app-chat',
      params: { id: res.data },
      query: { new: 'true' }
    })
  } catch (err) {
    error.value = err.message || 'Creation failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="create-page">
    <div class="create-container container container-narrow">
      <header class="create-header">
        <p class="masthead">New Project</p>
        <h1 class="headline">Create an Application</h1>
        <p class="section-subtitle">Describe your vision, and AI will bring it to life</p>
      </header>

      <div class="divider-accent"></div>

      <div class="create-content">
        <form class="create-form" @submit.prevent="handleCreate">
          <div class="form-group">
            <label class="form-label">Your Vision</label>
            <textarea
              v-model="form.initPrompt"
              class="form-input"
              placeholder="Describe the application you want to create. What features should it have? What should it look like? Who will use it?"
              rows="8"
            ></textarea>
            <p class="caption">Be specific and detailed for better results</p>
          </div>

          <div v-if="error" class="message message-error">
            {{ error }}
          </div>

          <div class="form-actions">
            <button class="btn" @click="router.push('/')">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="loading">
              {{ loading ? 'Creating...' : 'Begin Creation' }}
            </button>
          </div>
        </form>

        <aside class="tips-section">
          <h4 class="tips-title">Tips for Better Results</h4>
          <ul class="tips-list">
            <li>Describe the purpose and target audience</li>
            <li>List specific features you need</li>
            <li>Include design preferences if any</li>
            <li>Mention any technical requirements</li>
          </ul>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
.create-page {
  padding: var(--space-4xl) 0;
  background: var(--off-white);
}

.create-header {
  margin-bottom: var(--space-xl);
}

.create-content {
  margin-top: var(--space-xl);
}

.create-form {
  margin-bottom: var(--space-xl);
}

.form-actions {
  display: flex;
  gap: var(--space-md);
  justify-content: flex-end;
  margin-top: var(--space-lg);
}

.tips-section {
  padding: var(--space-lg);
  background: var(--white);
  border: var(--border-light);
}

.tips-title {
  font-family: var(--font-display);
  font-size: 1rem;
  margin-bottom: var(--space-md);
}

.tips-list {
  list-style: disc;
  padding-left: var(--space-lg);
}

.tips-list li {
  font-family: var(--font-serif);
  font-size: 0.9rem;
  color: var(--medium-gray);
  margin-bottom: var(--space-sm);
  line-height: var(--lh-normal);
}
</style>