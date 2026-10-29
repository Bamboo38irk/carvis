<script setup>
import { useRoute } from 'vue-router'
import AppLogo from '@/components/AppLogo.vue'

const route = useRoute()
</script>

<template>
  <div class="auth">
    <main class="auth__main">
      <RouterLink :to="{ name: 'login' }" class="auth__brand">
        <AppLogo :mark-size="24" />
      </RouterLink>

      <section class="auth__card">
        <h1 v-if="route.meta.title" class="auth__title">{{ route.meta.title }}</h1>
        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </section>
    </main>
  </div>
</template>

<style lang="scss" scoped>
.auth {
  display: grid;
  place-items: center;
  min-height: 100vh;
  min-height: 100dvh;
  padding: $space-6 $space-4 calc(#{$space-6} + var(--safe-bottom));
  background: var(--bg);

  &__main {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $space-6;
    width: min(100%, 420px);
  }

  &__brand {
    font-size: $font-size-2xl;
    font-weight: $weight-bold;
    letter-spacing: -0.02em;
    color: var(--text);
    text-decoration: none;

    &:hover {
      text-decoration: none;
    }
  }

  &__card {
    width: 100%;
    padding: $space-7;
    border: 1px solid var(--border);
    border-radius: $radius-2xl;
    background: var(--surface);
    box-shadow: var(--shadow-md);

    @include down($bp-sm) {
      padding: $space-5 $space-4;
      border-radius: $radius-xl;
    }
  }

  &__title {
    margin-bottom: $space-5;
    font-size: $font-size-2xl;
    line-height: $line-xl;
    font-weight: $weight-bold;
    letter-spacing: -0.02em;
  }
}
</style>
