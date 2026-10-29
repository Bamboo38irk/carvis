<script setup>
defineProps({
  height: { type: String, default: '16px' },
  width: { type: String, default: '100%' },
})
</script>

<template>
  <span class="skeleton" :style="{ height, width }" />
</template>

<style lang="scss" scoped>
.skeleton {
  display: block;
  border-radius: 8px;
  background: linear-gradient(
    90deg,
    var(--surface-3) 25%,
    var(--border) 50%,
    var(--surface-3) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.3s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
