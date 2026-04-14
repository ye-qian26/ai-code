<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { appApi } from '../../api/app'

const router = useRouter()
const route = useRoute()

const app = ref(null)
const loading = ref(true)
const error = ref('')

const appId = route.params.id

const fetchApp = async () => {
  try {
    const res = await appApi.getVO(appId)
    app.value = res.data
  } catch (err) {
    error.value = err.message || 'Failed to load application'
  } finally {
    loading.value = false
  }
}

const goToChat = () => {
  router.push({ name: 'app-chat', params: { id: appId } })
}

onMounted(() => {
  fetchApp()
})
</script>

<template>
  <div class="detail-page">
    <div class="detail-container container">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
      </div>

      <div v-else-if="error" class="error-state">
        <p class="message message-error">{{ error }}</p>
        <button class="btn" @click="router.push('/')">Return Home</button>
      </div>

      <article v-else-if="app" class="detail-content">
        <!-- Article Header -->
        <header class="article-header">
          <p class="masthead">{{ app.codeGenType || 'Application' }}</p>
          <h1 class="headline article-title">{{ app.appName || 'Untitled Application' }}</h1>
          <p class="byline">By {{ app.user?.userName || 'Anonymous' }}</p>
          <p class="caption">Created {{ app.createTime?.slice(0, 10) || 'Unknown date' }}</p>
        </header>

        <div class="divider"></div>

        <!-- Cover Image -->
        <div class="article-cover">
          <img v-if="app.cover" :src="app.cover" :alt="app.appName" />
          <div v-else class="cover-placeholder">
            <span>No illustration available</span>
          </div>
          <p class="caption">{{ app.appName }}</p>
        </div>

        <!-- Content -->
        <div class="article-body">
          <h2 class="section-title">The Vision</h2>
          <p class="lead">{{ app.initPrompt || 'No description provided.' }}</p>

          <!-- Meta Information -->
          <div class="meta-section">
            <h3 class="meta-title">Details</h3>
            <div class="meta-grid">
              <div class="meta-item">
                <span class="meta-label">Status</span>
                <span class="meta-value">{{ app.deployKey ? 'Published' : 'Draft' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Type</span>
                <span class="meta-value tag">{{ app.codeGenType || 'HTML' }}</span>
              </div>
              <div class="meta-item" v-if="app.deployKey">
                <span class="meta-label">Published</span>
                <span class="meta-value">{{ app.deployedTime?.slice(0, 10) || '-' }}</span>
              </div>
              <div class="meta-item" v-if="app.deployKey">
                <span class="meta-label">URL</span>
                <a :href="app.deployKey" target="_blank" class="meta-value meta-link">
                  View Application
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="article-actions">
          <button class="btn btn-primary" @click="goToChat">
            Open Conversation
          </button>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.detail-page {
  padding: var(--space-3xl) 0;
  background: var(--white);
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
}

.article-header {
  margin-bottom: var(--space-xl);
}

.article-title {
  font-size: 2.5rem;
  margin-bottom: var(--space-md);
}

.article-cover {
  margin-bottom: var(--space-xl);
}

.article-cover img {
  width: 100%;
  max-height: 400px;
  object-fit: cover;
}

.cover-placeholder {
  height: 200px;
  background: var(--pale-gray);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-placeholder span {
  font-family: var(--font-display);
  color: var(--light-gray);
  font-style: italic;
}

.article-cover .caption {
  margin-top: var(--space-sm);
}

.article-body {
  max-width: 700px;
}

.section-title {
  font-size: 1.25rem;
  margin-bottom: var(--space-md);
}

.meta-section {
  margin-top: var(--space-xl);
  padding: var(--space-lg);
  background: var(--off-white);
}

.meta-title {
  font-size: 1rem;
  margin-bottom: var(--space-lg);
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.meta-label {
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: var(--light-gray);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.meta-value {
  font-family: var(--font-serif);
  font-size: 0.9rem;
}

.meta-link {
  color: var(--accent-red);
}

.article-actions {
  margin-top: var(--space-xl);
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .article-title {
    font-size: 1.75rem;
  }

  .meta-grid {
    grid-template-columns: 1fr;
  }
}
</style>