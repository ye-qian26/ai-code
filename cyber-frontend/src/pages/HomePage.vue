<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { appApi } from '../api/app'

const router = useRouter()

const apps = ref([])
const loading = ref(false)
const pageNum = ref(1)
const pageSize = ref(12)
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
    const res = await appApi.listGoodByPage({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      appName: searchName.value || undefined
    })
    apps.value = [...apps.value, ...res.data.records]
    total.value = res.data.totalRow
  } catch (error) {
    console.error('Failed to fetch apps:', error)
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

const goToDetail = (id) => {
  router.push({ name: 'app-detail', params: { id } })
}

const goToChat = (id) => {
  router.push({ name: 'app-chat', params: { id } })
}

onMounted(() => {
  fetchApps()
})
</script>

<template>
  <div class="home-page">
    <!-- Hero Section - Magazine Cover Style -->
    <section class="hero-section">
      <div class="hero-container container">
        <div class="hero-content">
          <p class="masthead">Featured</p>
          <h1 class="headline hero-title">
            AI-Powered<br>
            Application<br>
            Generation
          </h1>
          <p class="lead hero-lead">
            Transform your ideas into fully functional applications through natural conversation.
            No coding required—just describe what you need.
          </p>
          <div class="hero-actions">
            <button class="btn btn-primary" @click="router.push('/app/create')">
              Create an App
            </button>
          </div>
        </div>
        <div class="hero-divider"></div>
      </div>
    </section>

    <!-- Featured Apps Section -->
    <section class="featured-section section">
      <div class="container">
        <header class="section-header">
          <p class="masthead">Collection</p>
          <h2 class="section-title">Featured Applications</h2>
          <p class="section-subtitle">Curated selections from our community</p>
        </header>

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

        <div v-else class="apps-grid grid grid-3">
          <article
            v-for="app in apps"
            :key="app.id"
            class="app-card card"
            @click="goToDetail(app.id)"
          >
            <div class="card-image">
              <img v-if="app.cover" :src="app.cover" :alt="app.appName" />
              <div v-else class="image-placeholder">
                <span class="placeholder-text">Illustration</span>
              </div>
            </div>
            <div class="card-content">
              <p class="card-masthead">{{ app.codeGenType || 'Web App' }}</p>
              <h3 class="card-title headline">{{ app.appName || 'Untitled' }}</h3>
              <p class="card-excerpt">
                {{ app.initPrompt?.slice(0, 80) || 'No description available' }}...
              </p>
              <p class="card-byline byline">
                By {{ app.user?.userName || 'Anonymous' }}
              </p>
            </div>
          </article>
        </div>

        <div v-if="hasMore" class="load-more">
          <button class="btn" @click="loadMore" :disabled="loading">
            {{ loading ? 'Loading...' : 'Load More' }}
          </button>
        </div>

        <div v-if="!loading && apps.length === 0" class="empty-state">
          <p>No featured applications at this time.</p>
        </div>
      </div>
    </section>

    <!-- About Section -->
    <section class="about-section section">
      <div class="container container-narrow">
        <div class="divider-accent"></div>
        <h2 class="about-title">How It Works</h2>
        <div class="about-content">
          <p class="lead">
            Our AI understands your requirements and generates complete, deployable applications.
            Simply describe your vision, and watch it come to life.
          </p>
          <ol class="steps-list">
            <li>
              <strong>Describe</strong>
              <p>Tell us what you need in plain language.</p>
            </li>
            <li>
              <strong>Generate</strong>
              <p>AI creates your application through conversation.</p>
            </li>
            <li>
              <strong>Deploy</strong>
              <p>Launch your app instantly with one click.</p>
            </li>
          </ol>
        </div>
      </div>
    </section>

    <!-- Stats Bar -->
    <section class="stats-section">
      <div class="container">
        <div class="stats-grid">
          <div class="stat">
            <span class="stat-number">{{ total }}</span>
            <span class="stat-label">Applications</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat">
            <span class="stat-number">AI</span>
            <span class="stat-label">Powered</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat">
            <span class="stat-number">24/7</span>
            <span class="stat-label">Available</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero-section {
  padding: var(--space-4xl) 0;
  background: var(--white);
}

.hero-container {
  display: flex;
  flex-direction: column;
}

.hero-content {
  max-width: 600px;
}

.hero-title {
  font-size: 3.5rem;
  line-height: 1;
  margin-bottom: var(--space-lg);
  letter-spacing: -0.03em;
}

.hero-lead {
  margin-bottom: var(--space-xl);
}

.hero-divider {
  width: 80px;
  height: 2px;
  background: var(--accent-red);
  margin-top: var(--space-xl);
}

/* Featured Section */
.featured-section {
  background: var(--off-white);
}

.search-bar {
  display: flex;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.search-bar .form-input {
  max-width: 300px;
}

.apps-grid {
  margin-top: var(--space-xl);
}

.app-card {
  cursor: pointer;
  overflow: hidden;
}

.app-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.card-image {
  height: 180px;
  background: var(--pale-gray);
}

.image-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--pale-gray);
}

.placeholder-text {
  font-family: var(--font-display);
  font-size: 0.9rem;
  color: var(--light-gray);
  font-style: italic;
}

.card-content {
  padding: var(--space-lg);
}

.card-masthead {
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  margin-bottom: var(--space-sm);
  color: var(--accent-red);
}

.card-title {
  font-size: 1.25rem;
  margin-bottom: var(--space-sm);
}

.card-excerpt {
  font-size: 0.9rem;
  color: var(--medium-gray);
  line-height: var(--lh-normal);
  margin-bottom: var(--space-md);
}

.card-byline {
  font-size: 0.8rem;
}

.load-more {
  display: flex;
  justify-content: center;
  margin-top: var(--space-xl);
}

/* About Section */
.about-section {
  background: var(--white);
}

.about-title {
  font-size: 1.75rem;
  margin-bottom: var(--space-lg);
  margin-top: var(--space-md);
}

.about-content {
  margin-top: var(--space-lg);
}

.steps-list {
  list-style: none;
  counter-reset: steps;
  margin-top: var(--space-xl);
}

.steps-list li {
  counter-increment: steps;
  margin-bottom: var(--space-lg);
  position: relative;
  padding-left: var(--space-2xl);
}

.steps-list li::before {
  content: counter(steps);
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent-red);
  position: absolute;
  left: 0;
  top: 0;
}

.steps-list li strong {
  font-family: var(--font-display);
  font-size: 1rem;
  display: block;
  margin-bottom: var(--space-xs);
}

.steps-list li p {
  font-size: 0.9rem;
  color: var(--medium-gray);
}

/* Stats */
.stats-section {
  padding: var(--space-xl) 0;
  background: var(--near-black);
}

.stats-grid {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-xl);
}

.stat {
  text-align: center;
}

.stat-number {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 700;
  color: var(--white);
  display: block;
}

.stat-label {
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: var(--silver);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: var(--dark-gray);
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }

  .apps-grid {
    grid-template-columns: 1fr;
  }

  .search-bar {
    flex-direction: column;
  }

  .search-bar .form-input {
    max-width: 100%;
  }

  .stats-grid {
    flex-direction: column;
    gap: var(--space-lg);
  }

  .stat-divider {
    width: 40px;
    height: 1px;
  }
}
</style>