import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authApi } from '@/api/index.js'
import { setUnauthorizedHandler, tokenStorage } from '@/api/client.js'
import { useCatalogStore } from '@/stores/catalog.js'
import { useExpensesStore } from '@/stores/expenses.js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(tokenStorage.get())

  const isAuthenticated = computed(() => Boolean(user.value && token.value))

  function setSession(payload) {
    token.value = payload.token
    user.value = payload.user
    tokenStorage.set(payload.token)
  }

  function clearSession() {
    token.value = null
    user.value = null
    tokenStorage.set(null)
    useExpensesStore().reset()
    useCatalogStore().reset()
  }

  setUnauthorizedHandler(clearSession)

  async function restore() {
    if (!token.value) return
    try {
      user.value = await authApi.me()
    } catch (error) {
      if (error.status === 401) clearSession()
    }
  }

  const login = async (credentials) => setSession(await authApi.login(credentials))

  async function logout() {
    await authApi.logout().catch(() => null)
    clearSession()
  }

  async function updateProfile(payload) {
    user.value = await authApi.updateProfile(payload)
  }

  return {
    user,
    isAuthenticated,
    restore,
    login,
    logout,
    updateProfile,
  }
})
