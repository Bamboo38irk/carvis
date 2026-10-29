<script setup>
import AppLogo from '@/components/AppLogo.vue'
</script>

<template>
  <div class="public">
    <header class="public__head no-print">
      <div>
        <p class="public__brand">
          <RouterLink to="/" class="public__home"><AppLogo :mark-size="22" /></RouterLink>
        </p>
        <p class="public__hint">История обслуживания автомобиля</p>
      </div>
    </header>

    <main class="public__content">
      <RouterView />
    </main>
  </div>
</template>

<style lang="scss" scoped>
.public {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: var(--bg);

  &__head {
    display: flex;
    align-items: center;
    gap: $space-3;
    padding: $space-4 $space-6;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }

  &__brand {
    font-size: $font-size-md;
    font-weight: $weight-bold;
    letter-spacing: -0.02em;
  }

  &__home {
    color: inherit;
    text-decoration: none;

    &:hover {
      opacity: 0.75;
    }
  }

  &__hint {
    font-size: $font-size-sm;
    color: var(--text-muted);
  }

  &__content {
    flex: 1;
    width: 100%;
    max-width: 960px;
    margin: 0 auto;
    padding: $space-6 $space-5 $space-8;

    @include down($bp-sm) {
      padding: $space-6 $space-4 $space-4;
    }
  }
}
</style>
