<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { userApi } from '../../api/user'

const columns = [
  { title: 'ID', dataIndex: 'id', width: 60 },
  { title: '账号', dataIndex: 'userAccount', width: 120 },
  { title: '用户名', dataIndex: 'userName', width: 100 },
  { title: '头像', dataIndex: 'userAvatar', width: 100 },
  { title: '简介', dataIndex: 'userProfile', width: 150 },
  { title: '角色', dataIndex: 'userRole', width: 80 },
  { title: '创建时间', dataIndex: 'createTime', width: 150 },
  { title: '操作', key: 'action', width: 100, fixed: 'right' }
]

const data = ref([])
const loading = ref(false)
const total = ref(0)

const searchParams = reactive({
  userAccount: '',
  userName: '',
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
    if (searchParams.userAccount) params.userAccount = searchParams.userAccount
    if (searchParams.userName) params.userName = searchParams.userName
    
    const res = await userApi.listUserByPage(params)
    if (res.data?.records) {
      data.value = res.data.records
      total.value = res.data.total || 0
    }
  } catch (err) {
    console.error('Failed to fetch users:', err)
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

const handleDelete = async (id) => {
  if (!id) return
  try {
    if (confirm('确定要删除这个用户吗？')) {
      await userApi.deleteUser(id)
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
  <div class="admin-users-page">
    <div class="page-container container">
      <header class="page-header">
        <div class="header-content">
          <p class="masthead">Administration</p>
          <h1 class="headline">Users</h1>
          <p class="section-subtitle">Manage system users</p>
        </div>
      </header>

      <div class="divider-accent"></div>

      <div class="search-bar">
        <input
          v-model="searchParams.userAccount"
          type="text"
          class="form-input search-input"
          placeholder="Search by account..."
        />
        <input
          v-model="searchParams.userName"
          type="text"
          class="form-input search-input"
          placeholder="Search by name..."
        />
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
            <tr v-for="user in data" :key="user.id">
              <td>{{ user.id }}</td>
              <td class="table-account">{{ user.userAccount }}</td>
              <td>{{ user.userName || '-' }}</td>
              <td>
                <img v-if="user.userAvatar" :src="user.userAvatar" class="user-avatar" />
                <span v-else>-</span>
              </td>
              <td class="table-profile">{{ user.userProfile?.slice(0, 20) || '-' }}</td>
              <td>
                <span class="tag" :class="user.userRole === 'admin' ? 'tag-red' : 'tag-blue'">
                  {{ user.userRole === 'admin' ? '管理员' : '普通用户' }}
                </span>
              </td>
              <td>{{ user.createTime?.slice(0, 10) || '-' }}</td>
              <td>
                <button class="btn btn-danger btn-small" @click="handleDelete(user.id)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="loading" class="loading">
        <div class="spinner"></div>
      </div>

      <div v-if="!loading && data.length === 0" class="empty-state">
        <p>No users found.</p>
      </div>

      <div class="pagination">
        <button class="btn btn-small" @click="doTableChange({ current: searchParams.pageNum - 1, pageSize: searchParams.pageSize })" :disabled="searchParams.pageNum === 1">Previous</button>
        <span class="page-num">{{ searchParams.pageNum }} / {{ Math.ceil(total / searchParams.pageSize) || 1 }}</span>
        <button class="btn btn-small" @click="doTableChange({ current: searchParams.pageNum + 1, pageSize: searchParams.pageSize })" :disabled="searchParams.pageNum * searchParams.pageSize >= total">Next</button>
      </div>

      <div class="stats-bar">
        <p class="stats-text"><strong>{{ total }}</strong> users total</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-users-page {
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

.table-account {
  font-family: var(--font-display);
  font-weight: 600;
}

.table-profile {
  font-family: var(--font-serif);
  font-size: 0.85rem;
  color: var(--medium-gray);
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
}

.tag-red {
  background: #ff4d4f;
  color: white;
}

.tag-blue {
  background: #1890ff;
  color: white;
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