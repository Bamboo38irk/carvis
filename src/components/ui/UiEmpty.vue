<script setup>
import AppIcon from '@/components/AppIcon.vue'

defineProps({
  icon: { type: String, default: 'receipt' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
})
</script>

<template>
  <div class="empty">
    <span class="empty__icon"><AppIcon :name="icon" :size="26" /></span>
    <h3 class="empty__title">{{ title }}</h3>
    <p v-if="description" class="empty__description">{{ description }}</p>
    <div v-if="$slots.default" class="empty__actions"><slot /></div>
  </div>
</template>

<style lang="scss" scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-2;
  padding: $space-10 $space-5;
  text-align: center;

  &__icon {
    @include icon-badge(64px);
    background: var(--lime-soft);
    margin-bottom: $space-2;
  }

  &__title {
    @include card-title;
  }

  &__description {
    max-width: 400px;
    color: var(--text-muted);
    font-size: $font-size-base;
    line-height: $line-base;
  }

  &__actions {
    margin-top: $space-3;
  }
}
</style>
