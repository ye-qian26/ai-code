<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { appApi } from '../../api/app'

const router = useRouter()

const apps = ref([])
const loading = ref(false)
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)
const searchName = ref('')

const hasMore = computed(() => apps.value.length < total.value)

const fetchApps = async (reset = false) => {
  if (reset) {
    pageNum.value = 1
    apps.value = []
  }
  loading.value = true
  try {
    const res = await appApi.listMyByPage({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      appName: searchName.value || undefined
    })
    apps.value = [...apps.value, ...res.data.records]
    total.value = res.data.totalRow
  } catch (err) {
    console.error('Failed to fetch apps:', err)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  fetchApps(true)
}

const loadMore = () => {
  if (hasMore.value && !loading.value) {
    pageNum.value++
    fetchApps()
  }
}

const goToChat = (id) => {
  router.push({ name: 'app-chat', params: { id } })
}

const goToEdit = (id) => {
  router.push({ name: 'app-edit', params: { id } })
}

const handleDelete = async (id) => {
  if (!confirm('Are you sure you want to delete this application?')) return

  try {
    await appApi.delete(id)
    apps.value = apps.value.filter(app => app.id !== id)
    total.value--
  } catch (err) {
    alert(`Delete failed: ${err.message}`)
  }
}

onMounted(() => {
  fetchApps()
})
</script>

<template>
  <div class="my-apps-page">
    <div class="page-container container">
      <header class="page-header">
        <div class="header-content">
          <p class="masthead">Your Work</p>
          <h1 class="headline">My Applications</h1>
          <p class="section-subtitle">Manage and develop your creations</p>
        </div>
        <button class="btn btn-primary" @click="router.push({ name: 'app-create' })">
          New Application
        </button>
      </header>

      <div class="divider-accent"></div>

      <!-- Search -->
      <div class="search-bar">
        <input
          v-model="searchName"
          type="text"
          class="form-input"
          placeholder="Search by name..."
        />
        <button class="btn" @click="handleSearch">Search</button>
      </div>

      <div v-if="loading && apps.length === 0" class="loading">
        <div class="spinner"></div>
      </div>

      <div v-else-if="apps.length === 0" class="empty-state">
        <p>You haven't created any applications yet.</p>
        <button class="btn btn-primary" @click="router.push({ name: 'app-create' })">
          Create Your First App
        </button>
      </div>

      <div v-else class="apps-list">
        <article
          v-for="app in apps"
          :key="app.id"
          class="app-item"
        >
          <div class="item-image">
            <img v-if="app.cover" :src="app.cover" :alt="app.appName" />
            <div v-else class="image-placeholder">
              <span>No image</span>
            </div>
          </div>

          <div class="item-content">
            <p class="item-masthead">{{ app.codeGenType || 'Application' }}</p>
            <h3 class="item-title headline">{{ app.appName || 'Untitled' }}</h3>
            <p class="item-excerpt">{{ app.initPrompt?.slice(0, 100) || 'No description' }}...</p>
            <p class="item-meta caption">
              <span class="tag">{{ app.deployKey ? 'Published' : 'Draft' }}</span>
              <span>{{ app.createTime?.slice(0, 10) || '' }}</span>
            </p>
          </div>

          <div class="item-actions">
            <button class="btn btn-small" @click="goToChat(app.id)">Open</button>
            <button class="btn btn-small" @click="goToEdit(app.id)">Edit</button>
            <button class="btn btn-small btn-text" @click="handleDelete(app.id)">Delete</button>
          </div>
        </article>
      </div>

      <div v-if="hasMore" class="load-more">
        <button class="btn" @click="loadMore" :disabled="loading">
          {{ loading ? 'Loading...' : 'Load More' }}
        </button>
      </div>

      <!-- Stats -->
      <div class="stats-bar">
        <p class="stats-text">
          <strong>{{ total }}</strong> applications total
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.my-apps-page {
  padding: var(--space-3xl) 0;
  background: var(--off-white);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-xl);
}

.header-content {
  max-width: 400px;
}

.search-bar {
  display: flex;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.search-bar .form-input {
  max-width: 300px;
}

.apps-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  margin-top: var(--space-xl);
}

.app-item {
  display: flex;
  gap: var(--space-lg);
  padding: var(--space-lg);
  background: var(--white);
  border: var(--border-light);
}

.item-image {
  width: 120px;
  height: 80px;
  overflow: hidden;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  background: var(--pale-gray);
  display: flex;
  align-items: center;
  justify-content: center;
  font-style: italic;
  font-size: 0.8rem;
  color: var(--light-gray);
}

.item-content {
  flex: 1;
}

.item-masthead {
  font-size: 0.7rem;
  color: var(--accent-red);
  letter-spacing: 0.1em;
}

.item-title {
  font-size: 1.25rem;
  margin-bottom: var(--space-sm);
}

.item-excerpt {
  font-size: 0.9rem;
  color: var(--medium-gray);
  margin-bottom: var(--space-sm);
}

.item-meta {
  display: flex;
  gap: var(--space-md);
}

.item-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  align-items: flex-end;
}

.load-more {
  display: flex;
  justify-content: center;
  margin-top: var(--space-xl);
}

.stats-bar {
  margin-top: var(--space-xl);
  padding: var(--space-md);
  background: var(--white);
  border: var(--border-light);
  text-align: center;
}

.stats-text {
  font-family: var(--font-serif);
  font-size: 0.9rem;
  color: var(--medium-gray);
}

.stats-text strong {
  font-family: var(--font-display);
  color: var(--dark-gray);
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: var(--space-lg);
  }

  .search-bar {
    flex-direction: column;
  }

  .search-bar .form-input {
    max-width: 100%;
  }

  .app-item {
    flex-direction: column;
  }

  .item-image {
    width: 100%;
    height: 150px;
  }

  .item-actions {
    flex-direction: row;
    justify-content: flex-start;
  }
}
</style>