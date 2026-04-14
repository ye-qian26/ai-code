import api from './request'

export const chatApi = {
  listByApp: (appId, pageSize, lastCreateTime) =>
    api.get(`/chatHistory/app/${appId}`, {
      params: { pageSize, lastCreateTime }
    }),

  // Admin
  adminListByPage: (data) => api.post('/chatHistory/admin/list/page/vo', data)
}