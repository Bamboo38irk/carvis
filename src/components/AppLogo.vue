<script setup>
import AppIcon from '@/components/AppIcon.vue'

defineProps({
  markSize: { type: Number, default: 20 },
})
</script>

<template>
  <span class="logo">
    <span class="logo__word">Карвис</span>
    <AppIcon name="logo" :size="markSize" class="logo__mark" />
  </span>
</template>

<style lang="scss" scoped>
.logo {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font: inherit;
  letter-spacing: -0.02em;

  &__word {
    font: inherit;
  }

  &__mark {
    color: var(--logo-mark, var(--lime-ink));
  }
}
</style>
