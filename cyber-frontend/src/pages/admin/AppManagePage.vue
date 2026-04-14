<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { appApi } from '../../api/app'

const router = useRouter()

const apps = ref([])
const loading = ref(false)
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)
const searchId = ref('')
const searchName = ref('')
const searchUserId = ref('')
const searchCodeGenType = ref('')
const searchPriority = ref('')

const fetchApps = async (reset = false) => {
  if (reset) {
    pageNum.value = 1
    apps.value = []
  }
  loading.value = true
  try {
    const params = {
      pageNum: pageNum.value,
      pageSize: pageSize.value
    }
    if (searchId.value) params.id = Number(searchId.value)
    if (searchName.value) params.appName = searchName.value
    if (searchUserId.value) params.userId = Number(searchUserId.value)
    if (searchCodeGenType.value) params.codeGenType = searchCodeGenType.value
    if (searchPriority.value) params.priority = Number(searchPriority.value)

    const res = await appApi.adminListByPage(params)
    apps.value = res.data.records
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

const prevPage = () => {
  if (pageNum.value > 1) {
    pageNum.value--
    fetchApps()
  }
}

const nextPage = () => {
  const maxPage = Math.ceil(total.value / pageSize.value)
  if (pageNum.value < maxPage) {
    pageNum.value++
    fetchApps()
  }
}

const handleDelete = async (id) => {
  if (!confirm('Are you sure you want to delete this application?')) return

  try {
    await appApi.adminDelete(id)
    fetchApps()
  } catch (err) {
    alert(`Delete failed: ${err.message}`)
  }
}

const goToChat = (id) => {
  router.push({ name: 'app-chat', params: { id } })
}

const goToEdit = (id) => {
  router.push({ name: 'admin-app-edit', params: { id } })
}

onMounted(() => {
  fetchApps()
})
</script>

<template>
  <div class="admin-apps-page">
    <div class="page-container container">
      <header class="page-header">
        <div class="header-content">
          <p class="masthead">Administration</p>
          <h1 class="headline">Applications</h1>
          <p class="section-subtitle">Manage all applications in the system</p>
        </div>
      </header>

      <div class="divider-accent"></div>

      <!-- Search -->
      <div class="search-section">
        <div class="search-grid">
          <div class="search-field">
            <label class="search-label">ID</label>
            <input v-model="searchId" type="text" class="form-input" placeholder="App ID" />
          </div>
          <div class="search-field">
            <label class="search-label">Name</label>
            <input v-model="searchName" type="text" class="form-input" placeholder="App name" />
          </div>
          <div class="search-field">
            <label class="search-label">User ID</label>
            <input v-model="searchUserId" type="text" class="form-input" placeholder="Creator ID" />
          </div>
          <div class="search-field">
            <label class="search-label">Type</label>
            <input v-model="searchCodeGenType" type="text" class="form-input" placeholder="HTML/Vue" />
          </div>
          <div class="search-field">
            <label class="search-label">Priority</label>
            <input v-model="searchPriority" type="text" class="form-input" placeholder="Priority" />
          </div>
        </div>
        <button class="btn btn-primary" @click="handleSearch">Search</button>
      </div>

      <!-- Table -->
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Type</th>
              <th>Creator</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="app in apps" :key="app.id">
              <td>{{ app.id }}</td>
              <td class="table-name">{{ app.appName || '-' }}</td>
              <td><span class="tag">{{ app.codeGenType || 'HTML' }}</span></td>
              <td>{{ app.user?.userName || app.userId }}</td>
              <td>{{ app.priority || 0 }}</td>
              <td>{{ app.deployKey ? 'Published' : 'Draft' }}</td>
              <td>{{ app.createTime?.slice(0, 10) || '-' }}</td>
              <td>
                <div class="table-actions">
                  <button class="btn btn-small" @click="goToChat(app.id)">View</button>
                  <button class="btn btn-small" @click="goToEdit(app.id)">Edit</button>
                  <button class="btn btn-small btn-text" @click="handleDelete(app.id)">Delete</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="loading" class="loading">
        <div class="spinner"></div>
      </div>

      <div v-if="!loading && apps.length === 0" class="empty-state">
        <p>No applications found.</p>
      </div>

      <!-- Pagination -->
      <div class="pagination">
        <button class="btn btn-small" @click="prevPage" :disabled="pageNum === 1">Previous</button>
        <span class="page-num">{{ pageNum }} / {{ Math.ceil(total / pageSize) || 1 }}</span>
        <button class="btn btn-small" @click="nextPage" :disabled="pageNum >= Math.ceil(total / pageSize)">Next</button>
      </div>

      <!-- Stats -->
      <div class="stats-bar">
        <p class="stats-text"><strong>{{ total }}</strong> applications total</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-apps-page {
  padding: var(--space-3xl) 0;
  background: var(--off-white);
}

.search-section {
  margin-bottom: var(--space-xl);
}

.search-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.search-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.search-label {
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: var(--light-gray);
  letter-spacing: 0.05em;
}

.table-wrapper {
  overflow-x: auto;
  margin-bottom: var(--space-xl);
  background: var(--white);
  border: var(--border-light);
}

.table-name {
  font-family: var(--font-display);
  font-weight: 600;
}

.table-actions {
  display: flex;
  gap: var(--space-sm);
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
}

@media (max-width: 768px) {
  .search-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>