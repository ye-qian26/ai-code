import api from './request'

export const appApi = {
  add: (data) => api.post('/app/add', data),
  update: (data) => api.post('/app/update', data),
  delete: (id) => api.post('/app/delete', { id }),
  getVO: (id) => api.get('/app/get/vo', { params: { id } }),
  listMyByPage: (data) => api.post('/app/my/list/page/vo', data),
  listGoodByPage: (data) => api.post('/app/good/list/page/vo', data),
  deploy: (appId) => api.post('/app/deploy', { appId }),
  download: (appId) => `/api/app/download/${appId}`,

  // SSE Chat
  chatStream: (appId, message) => `/api/app/chat/gen/code?appId=${appId}&message=${encodeURIComponent(message)}`,

  // Admin
  adminDelete: (id) => api.post('/app/admin/delete', { id }),
  adminUpdate: (data) => api.post('/app/admin/update', data),
  adminListByPage: (data) => api.post('/app/admin/list/page/vo', data),
  adminGetVO: (id) => api.get('/app/admin/get/vo', { params: { id } })
}