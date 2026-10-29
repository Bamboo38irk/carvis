<script setup>
import AppIcon from '@/components/AppIcon.vue'
import { useUiStore } from '@/stores/ui.js'

const ui = useUiStore()

const ICONS = { success: 'check', error: 'alert' }
</script>

<template>
  <Teleport to="body">
    <div class="toasts" role="status" aria-live="polite">
      <TransitionGroup name="toast">
        <div v-for="toast in ui.toasts" :key="toast.id" class="toast" :class="`toast--${toast.type}`">
          <AppIcon :name="ICONS[toast.type]" :size="16" />
          <span class="toast__message">{{ toast.message }}</span>
          <button
            class="toast__close"
            type="button"
            aria-label="Скрыть"
            @click="ui.dismissToast(toast.id)"
          >
            <AppIcon name="x" :size="14" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
.toasts {
  position: fixed;
  right: $space-6;
  bottom: $space-6;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: $space-2;
  max-width: min(400px, calc(100vw - #{$space-10}));
}

.toast {
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: $space-4 $space-5;
  background: var(--dark);
  color: var(--text-on-dark);
  border-radius: $radius-pill;
  box-shadow: var(--shadow-lg);
  font-size: $font-size-base;
  font-weight: $weight-medium;

  &--success svg {
    color: var(--lime);
  }

  &--error svg {
    color: #ff9a9a;
  }

  &__message {
    flex: 1;
  }

  &__close {
    border: 0;
    background: transparent;
    color: var(--muted-on-dark);
    cursor: pointer;
    padding: 2px;

    &:hover {
      color: var(--text-on-dark);
    }
  }
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
