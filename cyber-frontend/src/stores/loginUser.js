import { defineStore } from 'pinia'
import { ref } from 'vue'
import { userApi } from '../api/user'

export const useLoginUserStore = defineStore('loginUser', () => {
  const loginUser = ref({
    userName: '未登录',
  })

  const loading = ref(false)

  async function fetchLoginUser() {
    loading.value = true
    try {
      const res = await userApi.getLoginUser()
      if (res.data) {
        loginUser.value = res.data
      }
    } catch (error) {
      loginUser.value = {
        userName: '未登录',
      }
    } finally {
      loading.value = false
    }
  }

  function setLoginUser(newLoginUser) {
    loginUser.value = newLoginUser
  }

  const isOwner = (userId) => {
    return loginUser.value.id === userId
  }

  const isAdmin = () => {
    return loginUser.value.userRole === 'admin'
  }

  return {
    loginUser,
    loading,
    fetchLoginUser,
    setLoginUser,
    isOwner,
    isAdmin,
  }
})