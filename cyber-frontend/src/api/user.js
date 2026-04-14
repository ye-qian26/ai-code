import api from './request'

export const userApi = {
  register: (data) => api.post('/user/register', data),
  login: (data) => api.post('/user/login', data),
  logout: () => api.post('/user/logout'),
  getLoginUser: () => api.get('/user/get/login'),
  getUserVO: (id) => api.get('/user/get/vo', { params: { id } }),

  // Admin
  addUser: (data) => api.post('/user/add', data),
  deleteUser: (id) => api.post('/user/delete', { id }),
  updateUser: (data) => api.post('/user/update', data),
  listUserByPage: (data) => api.post('/user/list/page/vo', data)
}