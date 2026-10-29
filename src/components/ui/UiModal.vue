<script setup>
import { onBeforeUnmount, onMounted, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  size: { type: String, default: 'md' },
})

const emit = defineEmits(['close'])

const onKeydown = (event) => {
  if (event.key === 'Escape' && props.open) emit('close')
}

watch(
  () => props.open,
  (open) => {
    document.documentElement.style.overflow = open ? 'hidden' : ''
  },
)

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.documentElement.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal" role="dialog" aria-modal="true">
        <div class="modal__backdrop" @click="emit('close')" />
        <div class="modal__panel" :class="`modal__panel--${size}`">
          <header class="modal__head">
            <div class="modal__titles">
              <h2 class="modal__title">{{ title }}</h2>
              <p v-if="subtitle" class="modal__subtitle">{{ subtitle }}</p>
            </div>
            <button class="modal__close" type="button" aria-label="Закрыть" @click="emit('close')">
              <AppIcon name="x" :size="18" />
            </button>
          </header>

          <div class="modal__body">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="modal__footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
.modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $space-6;

  &__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(26, 26, 26, 0.45);
  }

  &__panel {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-height: calc(100vh - #{$space-10});
    max-height: calc(100dvh - #{$space-10});
    background: var(--surface);
    border-radius: $radius-2xl;
    box-shadow: var(--shadow-lg);
    overflow: hidden;

    &--sm {
      max-width: 440px;
    }
    &--md {
      max-width: 640px;
    }
  }

  &__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: $space-4;
    padding: $space-6 $space-6 $space-4;
  }

  &__titles {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__title {
    font-size: $font-size-2xl;
    line-height: $line-lg;
    font-weight: $weight-bold;
    letter-spacing: -0.02em;
  }

  &__subtitle {
    font-size: $font-size-base;
    line-height: $line-base;
    color: var(--text-muted);
  }

  &__close {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    flex: none;
    border: 0;
    border-radius: 50%;
    background: var(--fill-gray);
    color: var(--text);
    cursor: pointer;

    &:hover {
      background: var(--fill-gray-strong);
    }
  }

  &__body {
    padding: 0 $space-6 $space-6;
    overflow-y: auto;
    @include scrollbar;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: $space-2;
    padding: $space-4 $space-6 $space-6;
  }

  @include down($bp-sm) {
    padding: 0;
    align-items: flex-end;

    &__panel {
      max-width: none;
      border-radius: $radius-2xl $radius-2xl 0 0;
      max-height: 92vh;
      max-height: 92dvh;
    }

    &__head {
      padding: $space-4 $space-4 $space-3;
    }

    &__body {
      padding: 0 $space-4 $space-4;
    }

    &__footer {
      flex-wrap: wrap;
      padding: $space-3 $space-4 calc(#{$space-6} + var(--safe-bottom));

      > * {
        flex: 1 1 auto;
      }
    }
  }
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.16s ease;

  .modal__panel {
    transition: transform 0.2s ease;
  }
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;

  .modal__panel {
    transform: translateY(10px);
  }
}
</style>
