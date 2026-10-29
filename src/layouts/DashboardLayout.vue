<script setup>
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '@/components/AppSidebar.vue'
import AppTabbar from '@/components/AppTabbar.vue'
import AppTopbar from '@/components/AppTopbar.vue'
import { useCatalogStore } from '@/stores/catalog.js'
import { useUiStore } from '@/stores/ui.js'

const catalog = useCatalogStore()
const ui = useUiStore()
const route = useRoute()

onMounted(() => catalog.load())

watch(
  () => route.fullPath,
  () => ui.setMobileNav(false),
)
</script>

<template>
  <div class="shell">
    <AppSidebar />

    <div v-if="ui.mobileNavOpen" class="shell__scrim" @click="ui.setMobileNav(false)" />

    <div class="shell__main">
      <AppTopbar />
      <main class="shell__content">
        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </div>

    <AppTabbar />
  </div>
</template>

<style lang="scss" scoped>
.shell {
  display: grid;
  grid-template-columns: $sidebar-width minmax(0, 1fr);
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--bg);

  &__main {
    display: flex;
    flex-direction: column;
    min-width: 0;
    background: var(--bg);
  }

  &__content {
    flex: 1;
    min-width: 0;
    padding: $space-5 $content-pad $space-9;

    @include down($bp-md) {
      padding: $space-4 $space-4 calc(#{$space-5} + #{$tabbar-height} + var(--safe-bottom));
    }

    @include down($bp-sm) {
      padding: $space-3 $space-3 calc(#{$space-5} + #{$tabbar-height} + var(--safe-bottom));
    }
  }

  &__scrim {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgba(26, 26, 26, 0.4);
  }

  @include down($bp-md) {
    grid-template-columns: minmax(0, 1fr) !important;
    padding: 0 var(--safe-right) 0 var(--safe-left);
  }

  @media print {
    display: block;
    min-height: 0;
    background: #fff;

    &__main {
      background: #fff;
    }

    &__content {
      padding: 0;
    }
  }
}
</style>
