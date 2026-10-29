import { useUiStore } from '@/stores/ui.js'

export function useToast() {
  const ui = useUiStore()

  return {
    success: (message) => ui.notify(message, 'success'),
    error: (message) => ui.notify(message, 'error', 6000),
  }
}
