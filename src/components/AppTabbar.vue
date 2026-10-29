<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import ExpenseFormModal from '@/components/ExpenseFormModal.vue'
const route = useRoute()

const addOpen = ref(false)

const TABS = [
  { key: 'dashboard', to: { name: 'dashboard' }, label: 'Обзор', icon: 'dashboard' },
  { key: 'expenses', to: { name: 'expenses' }, label: 'Расходы', icon: 'list' },
  { key: 'vehicles', to: { name: 'vehicles' }, label: 'Гараж', icon: 'car' },
  { key: 'fuel', to: { name: 'fuel' }, label: 'Топливо', icon: 'fuel' },
]

const current = computed(() => route.name)
</script>

<template>
  <nav class="tabbar no-print" aria-label="Основная навигация">
    <RouterLink
      v-for="tab in TABS.slice(0, 2)"
      :key="tab.key"
      :to="tab.to"
      class="tabbar__tab"
      :class="{ 'is-active': current === tab.key }"
    >
      <span class="tabbar__icon">
        <AppIcon :name="tab.icon" :size="20" />
      </span>
      <span class="tabbar__label">{{ tab.label }}</span>
    </RouterLink>

    <button class="tabbar__add" type="button" aria-label="Добавить расход" @click="addOpen = true">
      <AppIcon name="plus" :size="24" />
    </button>

    <RouterLink
      v-for="tab in TABS.slice(2)"
      :key="tab.key"
      :to="tab.to"
      class="tabbar__tab"
      :class="{ 'is-active': current === tab.key }"
    >
      <span class="tabbar__icon">
        <AppIcon :name="tab.icon" :size="20" />
      </span>
      <span class="tabbar__label">{{ tab.label }}</span>
    </RouterLink>

    <ExpenseFormModal :open="addOpen" @close="addOpen = false" />
  </nav>
</template>

<style lang="scss" scoped>
.tabbar {
  display: none;
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 36;
  align-items: stretch;
  height: calc(#{$tabbar-height} + var(--safe-bottom));
  padding: 0 var(--safe-right) var(--safe-bottom) var(--safe-left);
  background: var(--surface);
  border-top: 1px solid var(--border);
  box-shadow: 0 -2px 16px rgba(26, 26, 26, 0.06);

  @include down($bp-md) {
    display: flex;
  }

  @media print {
    display: none !important;
  }

  &__tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    flex: 1;
    min-width: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--text-soft);
    font-family: inherit;
    font-size: $font-size-xs;
    font-weight: $weight-medium;
    cursor: pointer;

    &:hover {
      text-decoration: none;
    }

    &.is-active {
      color: var(--text);

      .tabbar__icon {
        background: var(--lime);
      }
    }
  }

  &__icon {
    position: relative;
    display: grid;
    place-items: center;
    width: 46px;
    height: 28px;
    border-radius: $radius-pill;
    transition: background-color 0.16s ease;
  }

  &__label {
    max-width: 100%;
    line-height: $line-xs;
    @include truncate;
  }

  &__add {
    display: grid;
    place-items: center;
    width: 54px;
    height: 54px;
    flex: none;
    align-self: center;
    margin: -18px $space-2 0;
    border: 0;
    border-radius: 50%;
    background: var(--dark);
    color: var(--text-on-dark);
    box-shadow: 0 8px 20px rgba(26, 26, 26, 0.28);
    cursor: pointer;

    &:active {
      transform: scale(0.94);
    }
  }
}
</style>
