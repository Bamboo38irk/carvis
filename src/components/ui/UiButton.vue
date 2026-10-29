<script setup>
import { Comment, Text, computed, useSlots } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

defineProps({
  variant: { type: String, default: 'primary' },
  size: { type: String, default: 'md' },
  icon: { type: String, default: '' },
  iconRight: { type: String, default: '' },
  type: { type: String, default: 'button' },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  block: { type: Boolean, default: false },
})

const slots = useSlots()

const hasLabel = computed(() => {
  const nodes = slots.default?.() ?? []
  return nodes.some((node) => {
    if (node.type === Comment) return false
    if (node.type === Text) return String(node.children).trim() !== ''
    if (Array.isArray(node.children)) return node.children.length > 0
    return true
  })
})
</script>

<template>
  <button
    :type="type"
    class="btn"
    :class="[`btn--${variant}`, `btn--${size}`, { 'btn--block': block, 'is-loading': loading }]"
    :disabled="disabled || loading"
  >
    <span v-if="loading" class="btn__spinner" aria-hidden="true" />
    <AppIcon v-else-if="icon" :name="icon" :size="size === 'sm' ? 15 : 17" />
    <span v-if="hasLabel" class="btn__label"><slot /></span>
    <AppIcon v-if="iconRight && !loading" :name="iconRight" :size="size === 'sm' ? 15 : 17" />
  </button>
</template>

<style lang="scss" scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: $space-2;
  height: $control-height-lg;
  padding: 0 $space-5;
  border: 0;
  border-radius: $radius-pill;
  font-family: inherit;
  font-size: $font-size-base;
  font-weight: $weight-bold;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.16s ease, color 0.16s ease, opacity 0.16s ease;

  &:focus-visible {
    @include focus-ring;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &--sm {
    height: 34px;
    padding: 0 $space-4;
    font-size: $font-size-sm;
  }

  &--lg {
    height: 52px;
    padding: 0 $space-6;
    font-size: $font-size-md;
  }

  &--block {
    width: 100%;
  }

  &--primary {
    background: var(--dark);
    color: var(--text-on-dark);

    &:hover:not(:disabled) {
      background: var(--accent-hover);
    }
  }

  &--secondary {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    color: var(--text);

    &:hover:not(:disabled) {
      border-color: var(--text);
      background: var(--fill-gray);
    }
  }

  &--ghost {
    background: var(--fill-gray);
    border: 1px solid transparent;
    color: var(--text-muted);

    &:hover:not(:disabled) {
      background: var(--fill-gray-strong);
      border-color: var(--border-strong);
      color: var(--text);
    }
  }

  &--danger {
    background: var(--danger-soft);
    color: var(--danger);

    &:hover:not(:disabled) {
      background: var(--danger);
      color: #fff;
    }
  }

  &__spinner {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid currentColor;
    border-right-color: transparent;
    animation: btn-spin 0.6s linear infinite;
  }
}

@keyframes btn-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
