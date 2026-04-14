import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userApi } from '../api/user'

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const loading = ref(false)

  const isLoggedIn = computed(() => user.value !== null)
  const isAdmin = computed(() => user.value?.userRole === 'admin')

  const fetchCurrentUser = async () => {
    loading.value = true
    try {
      const res = await userApi.getLoginUser()
      if (res.data) {
        user.value = res.data
      }
    } catch (error) {
      user.value = null
    } finally {
      loading.value = false
    }
  }

  const login = async (loginForm) => {
    const res = await userApi.login(loginForm)
    if (res.data) {
      user.value = res.data
    }
    return res
  }

  const logout = async () => {
    await userApi.logout()
    user.value = null
  }

  const register = async (registerForm) => {
    return await userApi.register(registerForm)
  }

  return {
    user,
    loading,
    isLoggedIn,
    isAdmin,
    fetchCurrentUser,
    login,
    logout,
    register
  }
})