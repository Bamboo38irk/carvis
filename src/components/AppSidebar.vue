<script setup>
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import AppLogo from '@/components/AppLogo.vue'
import { useCatalogStore } from '@/stores/catalog.js'
import { useUiStore } from '@/stores/ui.js'
import { NAV_GROUPS } from '@/config/navigation.js'

const ui = useUiStore()
const catalog = useCatalogStore()

const badges = computed(() => ({
  vehicles: catalog.vehicles.length || null,
}))
</script>

<template>
  <aside class="sidebar no-print" :class="{ 'is-open': ui.mobileNavOpen }">
    <div class="sidebar__top">
      <RouterLink :to="{ name: 'dashboard' }" class="sidebar__brand">
        <AppLogo :mark-size="24" />
      </RouterLink>

      <button
        class="sidebar__close"
        type="button"
        aria-label="Закрыть меню"
        @click="ui.setMobileNav(false)"
      >
        <AppIcon name="x" :size="18" />
      </button>
    </div>

    <nav class="sidebar__nav">
      <div
        v-for="group in NAV_GROUPS"
        :key="group.key"
        class="sidebar__group"
        role="group"
        :aria-labelledby="group.label ? `nav-${group.key}` : undefined"
      >
        <p v-if="group.label" :id="`nav-${group.key}`" class="sidebar__group-label">
          {{ group.label }}
        </p>

        <RouterLink
          v-for="link in group.links"
          :key="link.key"
          :to="link.to"
          class="sidebar__link"
        >
          <AppIcon :name="link.icon" :size="18" />
          <span class="sidebar__link-label">{{ link.label }}</span>
          <span v-if="link.badge && badges[link.badge]" class="sidebar__badge">
            {{ badges[link.badge] }}
          </span>
        </RouterLink>
      </div>
    </nav>

  </aside>
</template>

<style lang="scss" scoped>
.sidebar {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  padding: $space-5 $space-3 calc(#{$space-4} + var(--safe-bottom));
  background: var(--dark);
  color: var(--text-on-dark);
  overflow-y: auto;
  @include scrollbar;

  &__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $space-2;
    margin-bottom: $space-4;
  }

  &__close {
    display: none;
    place-items: center;
    width: 36px;
    height: 36px;
    flex: none;
    border: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-on-dark);
    cursor: pointer;

    &:hover {
      background: rgba(255, 255, 255, 0.18);
    }
  }

  &__brand {
    display: flex;
    align-items: center;
    min-width: 0;
    height: 44px;
    padding: 0 $space-3;
    font-size: $font-size-2xl;
    font-weight: $weight-bold;
    letter-spacing: -0.02em;
    color: var(--text-on-dark);

    --logo-mark: var(--lime);

    &:hover {
      text-decoration: none;
    }
  }

  &__nav {
    display: flex;
    flex-direction: column;
    gap: $space-4;
    flex: 1;
  }

  &__group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__group-label {
    padding: 0 $space-3 $space-1;
    font-size: $font-size-xs;
    line-height: $line-xs;
    font-weight: $weight-medium;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.38);
  }

  &__link {
    display: flex;
    align-items: center;
    gap: $space-3;
    height: 38px;
    padding: 0 $space-3;
    border-radius: $radius-sm;
    color: rgba(255, 255, 255, 0.72);
    font-size: $font-size-base;
    font-weight: $weight-regular;
    transition: background-color 0.16s ease, color 0.16s ease;

    svg {
      flex: none;
    }

    &:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-on-dark);
      text-decoration: none;
    }

    &.router-link-exact-active {
      background: var(--surface);
      color: var(--text);
      font-weight: $weight-medium;
    }
  }

  &__link-label {
    @include truncate;
    flex: 1;
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: $radius-pill;
    background: var(--lime);
    color: var(--text);
    font-size: $font-size-sm;
    font-weight: $weight-medium;
  }

  @include down($bp-md) {
    position: fixed;
    z-index: 50;
    width: min(290px, 84vw);
    padding: calc(#{$space-4} + var(--safe-top)) $space-3
      calc(#{$space-5} + var(--safe-bottom));
    border-radius: 0 $radius-xl $radius-xl 0;
    transform: translateX(-100%);
    transition: transform 0.24s cubic-bezier(0.32, 0.72, 0, 1);

    &.is-open {
      transform: translateX(0);
    }

    &__close {
      display: grid;
    }

    &__link {
      height: 46px;
      font-size: $font-size-md;
    }
  }
}
</style>
