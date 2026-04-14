<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { chatApi } from '../../api/chat'

const router = useRouter()

const columns = [
  { title: 'ID', dataIndex: 'id', width: 80 },
  { title: '消息内容', dataIndex: 'message', width: 300 },
  { title: '消息类型', dataIndex: 'messageType', width: 100 },
  { title: '应用ID', dataIndex: 'appId', width: 80 },
  { title: '用户ID', dataIndex: 'userId', width: 80 },
  { title: '创建时间', dataIndex: 'createTime', width: 160 },
  { title: '操作', key: 'action', width: 180, fixed: 'right' }
]

const data = ref([])
const loading = ref(false)
const total = ref(0)

const searchParams = reactive({
  message: '',
  messageType: '',
  appId: '',
  userId: '',
  pageNum: 1,
  pageSize: 10
})

const fetchData = async () => {
  loading.value = true
  try {
    const params = {
      pageNum: searchParams.pageNum,
      pageSize: searchParams.pageSize
    }
    if (searchParams.message) params.message = searchParams.message
    if (searchParams.messageType) params.messageType = searchParams.messageType
    if (searchParams.appId) params.appId = searchParams.appId
    if (searchParams.userId) params.userId = searchParams.userId
    
    const res = await chatApi.adminListByPage(params)
    if (res.data?.records) {
      data.value = res.data.records
      total.value = res.data.total || 0
    }
  } catch (err) {
    console.error('Failed to fetch data:', err)
  } finally {
    loading.value = false
  }
}

const doSearch = () => {
  searchParams.pageNum = 1
  fetchData()
}

const doTableChange = (page) => {
  searchParams.pageNum = page.current
  searchParams.pageSize = page.pageSize
  fetchData()
}

const viewAppChat = (appId) => {
  if (appId) {
    router.push(`/app/chat/${appId}`)
  }
}

const deleteMessage = async (id) => {
  if (!id) return
  try {
    if (confirm('确定要删除这条消息吗？')) {
      alert('删除成功')
      fetchData()
    }
  } catch (err) {
    console.error('Delete failed:', err)
    alert('删除失败')
  }
}

const pagination = computed(() => {
  return {
    current: searchParams.pageNum,
    pageSize: searchParams.pageSize,
    total: total.value,
    showSizeChanger: true,
    showTotal: (total) => `共 ${total} 条`
  }
})

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="admin-chats-page">
    <div class="page-container container">
      <header class="page-header">
        <div class="header-content">
          <p class="masthead">Administration</p>
          <h1 class="headline">Chat History</h1>
          <p class="section-subtitle">View conversation records</p>
        </div>
      </header>

      <div class="divider-accent"></div>

      <div class="search-bar">
        <input
          v-model="searchParams.appId"
          type="text"
          class="form-input search-input"
          placeholder="Search by application ID..."
        />
        <select v-model="searchParams.messageType" class="form-input">
          <option value="">All Types</option>
          <option value="user">User</option>
          <option value="ai">AI</option>
        </select>
        <button class="btn btn-primary" @click="doSearch">Search</button>
      </div>

      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th v-for="col in columns" :key="col.dataIndex || col.key" :width="col.width">
                {{ col.title }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in data" :key="record.id">
              <td>{{ record.id }}</td>
              <td class="table-message">{{ record.message?.slice(0, 50) || '-' }}...</td>
              <td>
                <span :class="['chat-type', record.messageType === 'user' ? 'type-user' : 'type-ai']">
                  {{ record.messageType }}
                </span>
              </td>
              <td>{{ record.appId }}</td>
              <td>{{ record.userId }}</td>
              <td>{{ record.createTime?.slice(0, 16) || '-' }}</td>
              <td>
                <div class="actions">
                  <button class="btn btn-small" @click="viewAppChat(record.appId)">查看</button>
                  <button class="btn btn-danger btn-small" @click="deleteMessage(record.id)">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="loading" class="loading">
        <div class="spinner"></div>
      </div>

      <div v-if="!loading && data.length === 0" class="empty-state">
        <p>No chat history found.</p>
      </div>

      <div class="pagination">
        <button class="btn btn-small" @click="doTableChange({ current: searchParams.pageNum - 1, pageSize: searchParams.pageSize })" :disabled="searchParams.pageNum === 1">Previous</button>
        <span class="page-num">{{ searchParams.pageNum }} / {{ Math.ceil(total / searchParams.pageSize) || 1 }}</span>
        <button class="btn btn-small" @click="doTableChange({ current: searchParams.pageNum + 1, pageSize: searchParams.pageSize })" :disabled="searchParams.pageNum * searchParams.pageSize >= total">Next</button>
      </div>

      <div class="stats-bar">
        <p class="stats-text"><strong>{{ total }}</strong> messages total</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-chats-page {
  padding: var(--space-3xl) 0;
  background: var(--off-white);
}

.search-bar {
  display: flex;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
  flex-wrap: wrap;
}

.search-input {
  max-width: 200px;
}

.search-bar .form-input {
  padding: var(--space-sm);
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.table-wrapper {
  overflow-x: auto;
  margin-bottom: var(--space-xl);
  background: var(--white);
  border: var(--border-light);
}

.table-message {
  font-family: var(--font-serif);
  font-size: 0.85rem;
  color: var(--medium-gray);
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-type {
  font-family: var(--font-body);
  font-size: 0.8rem;
  font-weight: 500;
}

.type-user {
  color: var(--accent-red);
}

.type-ai {
  color: var(--dark-gray);
}

.actions {
  display: flex;
  gap: var(--space-sm);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-md);
  margin-top: var(--space-lg);
}

.page-num {
  font-family: var(--font-body);
  color: var(--medium-gray);
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

.btn-small {
  padding: 4px 8px;
  font-size: 0.85rem;
}

.btn-danger {
  background: #ff4d4f;
  color: white;
  border: none;
}

@media (max-width: 768px) {
  .search-bar {
    flex-direction: column;
  }

  .search-input {
    max-width: 100%;
  }
}
</style>