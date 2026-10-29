<script setup>
defineProps({
  tone: { type: String, required: true },
})
</script>

<template>
  <span class="badge" :class="`badge--${tone}`">
    <slot />
  </span>
</template>

<style lang="scss" scoped>
.badge {
  @include chip;
  height: 24px;
  font-weight: $weight-bold;
  border: 1px solid transparent;

  &--warning {
    background: var(--warning-soft);
    border-color: rgba(183, 129, 26, 0.28);
    color: var(--warning);
  }
  &--accent {
    background: var(--lavender-soft);
    border-color: rgba(180, 155, 243, 0.5);
    color: #6a4fbf;
  }
}
</style>
