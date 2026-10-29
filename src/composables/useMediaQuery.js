import { onBeforeUnmount, ref } from 'vue'

export function useMediaQuery(query) {
  const list = window.matchMedia(query)
  const matches = ref(list.matches)
  const onChange = (event) => {
    matches.value = event.matches
  }

  list.addEventListener('change', onChange)
  onBeforeUnmount(() => list.removeEventListener('change', onChange))

  return matches
}
