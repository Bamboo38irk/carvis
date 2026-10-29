<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import AppLogo from '@/components/AppLogo.vue'
import ExpenseFormModal from '@/components/ExpenseFormModal.vue'
import { useAuthStore } from '@/stores/auth.js'
import { useExpensesStore } from '@/stores/expenses.js'
import { useUiStore } from '@/stores/ui.js'

const auth = useAuthStore()
const ui = useUiStore()
const expenses = useExpensesStore()
const route = useRoute()
const router = useRouter()

const search = ref('')
const addOpen = ref(false)
const menuOpen = ref(false)
const menuRoot = ref(null)

const searchOpen = ref(false)
const searchInput = ref(null)

async function toggleSearch() {
  searchOpen.value = !searchOpen.value
  if (!searchOpen.value) return
  await nextTick()
  searchInput.value?.focus()
}

const onClickOutside = (event) => {
  if (menuOpen.value && menuRoot.value && !menuRoot.value.contains(event.target)) {
    menuOpen.value = false
  }
}

const onEscape = (event) => {
  if (event.key !== 'Escape') return
  menuOpen.value = false
  searchOpen.value = false
}

watch(
  () => route.fullPath,
  () => {
    searchOpen.value = false
    menuOpen.value = false
  },
)

onMounted(() => {
  document.addEventListener('click', onClickOutside)
  window.addEventListener('keydown', onEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
  window.removeEventListener('keydown', onEscape)
})

function submitSearch() {
  const term = search.value.trim()
  if (!term) return
  expenses.filterBy({ search: term })
  router.push({ name: 'expenses', query: { search: term } })
  search.value = ''
  searchOpen.value = false
}

async function logout() {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <header class="topbar no-print">
    <button
      class="topbar__burger"
      type="button"
      aria-label="Меню"
      :aria-expanded="ui.mobileNavOpen"
      @click="ui.setMobileNav(true)"
    >
      <AppIcon name="menu" :size="20" />
    </button>

    <RouterLink :to="{ name: 'dashboard' }" class="topbar__brand">
      <AppLogo :mark-size="20" />
    </RouterLink>

    <form class="search" @submit.prevent="submitSearch">
      <AppIcon name="search" :size="18" />
      <input
        v-model="search"
        type="search"
        placeholder="Поиск по расходам"
        aria-label="Поиск по расходам"
      />
    </form>

    <button
      class="topbar__search-toggle"
      type="button"
      :aria-expanded="searchOpen"
      aria-label="Поиск"
      @click="toggleSearch"
    >
      <AppIcon :name="searchOpen ? 'x' : 'search'" :size="18" />
    </button>

    <div class="topbar__right">
      <button
        v-if="route.name !== 'dashboard'"
        class="topbar__cta"
        type="button"
        @click="addOpen = true"
      >
        <AppIcon name="plus" :size="18" />
        <span>Расход</span>
      </button>

      <div ref="menuRoot" class="topbar__menu">
        <button class="user" type="button" aria-label="Меню профиля" @click="menuOpen = !menuOpen">
          <span class="user__avatar"><AppIcon name="user" :size="18" /></span>
          <span class="user__text">
            <span class="user__name">{{ auth.user?.login }}</span>
          </span>
          <AppIcon name="chevron-down" :size="16" class="user__chevron" />
        </button>

        <div v-if="menuOpen" class="topbar__dropdown" @click="menuOpen = false">
          <RouterLink :to="{ name: 'settings' }" class="topbar__dropdown-item">
            <AppIcon name="settings" :size="18" />
            Настройки
          </RouterLink>
          <button class="topbar__dropdown-item" type="button" @click="logout">
            <AppIcon name="logout" :size="18" />
            Выйти
          </button>
        </div>
      </div>
    </div>

    <ExpenseFormModal :open="addOpen" @close="addOpen = false" />

    <Transition name="search-panel">
      <form v-if="searchOpen" class="search-panel" @submit.prevent="submitSearch">
        <AppIcon name="search" :size="18" />
        <input
          ref="searchInput"
          v-model="search"
          type="search"
          placeholder="Поиск по расходам, местам и заметкам"
          aria-label="Поиск по расходам"
        />
        <button type="submit" aria-label="Найти">
          <AppIcon name="chevron-right" :size="16" />
        </button>
      </form>
    </Transition>
  </header>
</template>

<style lang="scss" scoped>
.topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: $space-4;
  min-height: $topbar-height;
  padding: $space-4 $content-pad;
  background: var(--surface);
  border-bottom: 1px solid var(--border);

  &__burger {
    display: none;
    place-items: center;
    width: $control-height-lg;
    height: $control-height-lg;
    flex: none;
    margin-left: -6px;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--text);
    cursor: pointer;

    &:active {
      background: var(--fill-gray);
    }
  }

  &__brand {
    display: none;
    min-width: 0;
    font-size: $font-size-xl;
    line-height: $line-lg;
    font-weight: $weight-bold;
    letter-spacing: -0.02em;
    color: var(--text);
    @include truncate;

    &:hover {
      text-decoration: none;
    }
  }

  &__right {
    display: flex;
    align-items: center;
    gap: $space-3;
    margin-left: auto;
    flex: none;
  }

  &__cta {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: $control-height-lg;
    padding: 0 $space-5;
    border: 0;
    border-radius: $radius-pill;
    background: var(--dark);
    color: var(--text-on-dark);
    font-family: inherit;
    font-size: $font-size-base;
    font-weight: $weight-medium;
    cursor: pointer;

    &:hover {
      background: var(--accent-hover);
    }
  }

  &__menu {
    position: relative;
  }

  &__dropdown {
    position: absolute;
    top: calc(100% + #{$space-3});
    right: 0;
    z-index: 60;
    width: min(232px, calc(100vw - #{$space-8}));
    padding: $space-3;
    background: var(--surface);
    border-radius: $radius-lg;
    box-shadow: var(--shadow-lg);
  }

  &__dropdown-item {
    display: flex;
    align-items: center;
    gap: $space-3;
    width: 100%;
    height: 38px;
    padding: 0 $space-3;
    border: 0;
    border-radius: $radius-sm;
    background: transparent;
    color: var(--text);
    font-family: inherit;
    font-size: $font-size-base;
    font-weight: $weight-regular;
    text-align: left;
    cursor: pointer;

    svg {
      color: var(--text-muted);
    }

    &:hover {
      background: var(--fill-gray);
      text-decoration: none;
    }
  }

  &__search-toggle {
    display: none;
    place-items: center;
    width: $control-height-lg;
    height: $control-height-lg;
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

  @include down($bp-md) {
    gap: $space-2;
    min-height: 56px;
    padding: calc(#{$space-3} + var(--safe-top)) $space-4 $space-2;
    background: var(--bg);
    border-bottom: 0;

    &__burger {
      display: grid;
    }

    &__brand {
      display: block;
    }

    &__search-toggle {
      display: grid;
      margin-left: auto;
    }

    .search {
      display: none;
    }

    &__cta {
      display: none;
    }

    &__right {
      gap: $space-2;
      margin-left: 0;
    }

    &__search-toggle,
    .user {
      background: var(--surface);
      box-shadow: var(--shadow-sm);
    }

    .user {
      width: $control-height-lg;
      padding: 0;
      justify-content: center;
    }

    .user__chevron {
      display: none;
    }
  }

  @include down($bp-sm) {
    padding: $space-3 $space-3 $space-2;
  }
}

.search-panel {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 55;
  display: flex;
  align-items: center;
  gap: $space-3;
  min-width: 0;
  padding: $space-3 $space-4;
  background: var(--surface);
  border-top: 1px solid var(--border);
  box-shadow: var(--shadow-md);
  color: var(--text-soft);

  input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: transparent;
    color: var(--text);
    font-family: inherit;
    font-size: $font-size-lg;

    &:focus {
      outline: none;
    }

    &::placeholder {
      color: var(--text-soft);
    }
  }

  button {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    flex: none;
    border: 0;
    border-radius: 50%;
    background: var(--accent);
    color: var(--accent-contrast);
    cursor: pointer;
  }
}

.search-panel-enter-active,
.search-panel-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.search-panel-enter-from,
.search-panel-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.search {
  display: flex;
  align-items: center;
  gap: $space-3;
  flex: 1;
  min-width: 0;
  max-width: 420px;
  height: $control-height-lg;
  padding: 0 $space-5;
  background: var(--fill-gray);
  border-radius: $radius-pill;
  color: var(--text-soft);

  &:focus-within {
    @include focus-ring;
  }

  input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: transparent;
    color: var(--text);
    font-family: inherit;
    font-size: $font-size-base;

    &:focus {
      outline: none;
    }

    &::placeholder {
      color: var(--text-soft);
    }
  }

  @include down($bp-md) {
    max-width: none;
  }
}

.user {
  display: flex;
  align-items: center;
  gap: $space-3;
  height: $control-height-lg;
  padding: 0 $space-3 0 4px;
  border: 0;
  border-radius: $radius-pill;
  background: var(--fill-gray);
  cursor: pointer;
  min-width: 0;
  text-align: left;

  &:hover {
    background: var(--fill-gray-strong);
  }

  &__avatar {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    flex: none;
    border-radius: 50%;
    background: var(--lavender);
    color: var(--text);
  }

  &__text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__name {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: $font-size-base;
    line-height: 15px;
    font-weight: $weight-medium;
    color: var(--text);
    @include truncate;
  }

  &__chevron {
    color: var(--text-muted);
    flex: none;
  }

  @include down($bp-lg) {
    &__text {
      display: none;
    }

    padding: 0 6px;
  }
}
</style>
