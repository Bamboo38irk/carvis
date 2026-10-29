<script setup>
import { useSlots } from 'vue'

defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  padded: { type: Boolean, default: true },
})

const slots = useSlots()
</script>

<template>
  <section
    class="section"
    :class="{ 'section--headless': !title && !slots.actions }"
  >
    <header v-if="title || slots.actions" class="section__head">
      <div v-if="title" class="section__titles">
        <h2 class="section__title">{{ title }}</h2>
        <p v-if="subtitle" class="section__subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="slots.actions" class="section__actions"><slot name="actions" /></div>
    </header>

    <div class="section__body" :class="{ 'section__body--flush': !padded }">
      <slot />
    </div>
  </section>
</template>

<style lang="scss" scoped>
.section {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: $space-5;
  padding: $space-5;
  border: 1px solid var(--border);
  border-radius: $radius-xl;
  background: var(--surface);
  overflow: hidden;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $space-4;
    flex-wrap: wrap;
  }

  &__titles {
    min-width: 0;
  }

  &__title {
    font-size: $font-size-lg;
    line-height: $line-md;
    font-weight: $weight-bold;
    letter-spacing: -0.015em;
  }

  &__subtitle {
    font-size: $font-size-sm;
    line-height: $line-sm;
    color: var(--text-muted);
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: $space-2;
    flex-wrap: wrap;
  }

  &__body {
    flex: 1;
    min-width: 0;

    &--flush {
      margin: 0 -#{$space-5} -#{$space-5};
    }
  }

  &--headless &__body--flush {
    margin-top: -#{$space-5};
  }

  @include down($bp-sm) {
    gap: $space-4;
    padding: $space-4;
    border-radius: $radius-lg;

    &__head {
      gap: $space-3;
    }

    &__title {
      font-size: $font-size-md;
    }

    &__body--flush {
      margin: 0 -#{$space-4} -#{$space-4};
    }

    &--headless &__body--flush {
      margin-top: -#{$space-4};
    }
  }
}
</style>
