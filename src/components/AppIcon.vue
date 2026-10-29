<script setup>
import { computed } from 'vue'

const PATHS = {
  dashboard: 'M4 13h7V4H4v9Zm0 7h7v-5H4v5Zm9 0h7v-9h-7v9Zm0-16v5h7V4h-7Z',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  tags: 'M3 12.5V5a2 2 0 0 1 2-2h7.5L21 11.5 12.5 20 3 12.5Z|M7.5 7.5h.01',
  car: 'M5.1 17H3.2a1 1 0 0 1-1-1v-2.1c0-.5.4-1 .9-1.1l2.4-.5 2.9-3.3c.4-.4 1-.7 1.6-.7h3.4c.6 0 1.2.2 1.6.7l2.8 3.2 2.7.7c.5.1.9.6.9 1.1V16a1 1 0 0 1-1 1h-1.6M8.9 17h6.1|M7 18.9a1.9 1.9 0 1 0 0-3.8 1.9 1.9 0 0 0 0 3.8Zm9.9 0a1.9 1.9 0 1 0 0-3.8 1.9 1.9 0 0 0 0 3.8Z',
  truck: 'M2.8 15.6V7.6h10.4v8M13.2 10.6h3.5l3.5 3.4v1.6h-2.6M6 19.2a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4Zm11.4 0a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4ZM7.7 15.6h8',
  motorcycle: 'M5.3 18.8a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6Zm13.4 0a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6ZM8.6 15.5h4.2l3-5.8M13.8 9.7h3.6M7.4 9.7h2.8l1.4 2.4',
  trailer: 'M2.6 15.4V8h12.6v7.4M15.2 12.6h3.4a2.8 2.8 0 0 1 2.8 2.8M6.6 19a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Zm5.6 0a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2ZM8.2 15.4h2.4',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  pie: 'M12 3a9 9 0 1 0 9 9h-9V3Z|M12 3a9 9 0 0 1 9 9',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z|M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 5 5',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  logo: 'M3 17a9 9 0 1 1 18 0|M12 17 17 10.6|M12 19.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z',
  fuel: 'M3 21V6a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v15M2 21h13M6 8h4M13 10h3a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0 2-2V9l-3-3',
  droplet: 'M12 3s6 5.7 6 10a6 6 0 0 1-12 0c0-4.3 6-10 6-10Z',
  wheel: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z|M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z|M12 3v6M12 15v6M3 12h6M15 12h6',
  wrench: 'M15.5 3a5.5 5.5 0 0 0-5 7.7L3 18.2 5.8 21l7.5-7.5A5.5 5.5 0 1 0 15.5 3Z|M15.5 8.5h.01',
  shield: 'M12 3 5 6v6c0 4.5 3 7.7 7 9 4-1.3 7-4.5 7-9V6l-7-3Z|M9.5 12l1.8 1.8 3.4-3.6',
  parking: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z|M10 17V7h3a3 3 0 0 1 0 6h-3',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Z|M9.5 8h5M9.5 12h5',
  alert: 'M12 3 2 20h20L12 3Z|M12 9v5M12 17.5h.01',
  gauge: 'M12 20a8 8 0 1 1 8-8|M12 20a8 8 0 0 1-8-8|M12 12l4.5-4',
  trash: 'M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6',
  pencil: 'M4 20h4L20 8l-4-4L4 16v4Z|M14.5 5.5 18.5 9.5',
  'chevron-right': 'M9 6l6 6-6 6',
  'chevron-left': 'M15 6l-6 6 6 6',
  'chevron-down': 'M6 9l6 6 6-6',
  calendar: 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z|M3 10h18M8 3v4M16 3v4',
  wallet: 'M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z|M16 12.5h.01|M3 10h18',
  'trending-up': 'M3 17l6-6 4 4 8-8|M15 7h6v6',
  'trending-down': 'M3 7l6 6 4-4 8 8|M15 17h6v-6',
  check: 'M5 13l4 4L19 7',
  x: 'M6 6l12 12M18 6L6 18',
  filter: 'M3 5h18l-7 8v6l-4-2v-4L3 5Z',
  sparkle: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z|M12 7.5V12l3 2',
  download: 'M12 4v11M7.5 11l4.5 4 4.5-4M5 20h14',
  menu: 'M4 7h16M4 12h16M4 17h16',
  users: 'M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20|M9.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z|M17 4.2a3.5 3.5 0 0 1 0 6.6M21 20v-1.5a4 4 0 0 0-3-3.8',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z|M4.5 20.5a7.5 7.5 0 0 1 15 0',
  link: 'M9.5 14.5 14.5 9.5|M11 6.5l1.5-1.5a4.2 4.2 0 0 1 6 6L17 12.5M13 17.5 11.5 19a4.2 4.2 0 0 1-6-6L7 11.5',
  print: 'M7 8V4h10v4M7 18H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v6H7z',
  copy: 'M9 9h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z|M15 6V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2',
  lock: 'M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z|M8.5 11V8a3.5 3.5 0 1 1 7 0v3',
  bank: 'M3 10 12 4l9 6M5 10v9h14v-9M9 19v-5h6v5',
}

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 18 },
})

const segments = computed(() => (PATHS[props.name] ?? PATHS.receipt).split('|'))
</script>

<template>
  <svg
    class="app-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke-width="1.7"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="(segment, index) in segments" :key="index" :d="segment" />
  </svg>
</template>

<style lang="scss" scoped>
.app-icon {
  flex: none;
  display: block;
}
</style>
