import { defineStore } from 'pinia'
import { ref } from 'vue'

let toastId = 0

export const useUiStore = defineStore('ui', () => {
  const mobileNavOpen = ref(false)
  const toasts = ref([])

  const setMobileNav = (open) => {
    mobileNavOpen.value = open
  }

  function dismissToast(id) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function notify(message, type, timeout = 4000) {
    const id = ++toastId
    toasts.value = [...toasts.value, { id, message, type }]
    if (timeout) {
      setTimeout(() => dismissToast(id), timeout)
    }
    return id
  }

  return {
    mobileNavOpen,
    toasts,
    setMobileNav,
    notify,
    dismissToast,
  }
})
