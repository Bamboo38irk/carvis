<script setup>
import { ref } from 'vue'
import SectionCard from '@/components/SectionCard.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiModal from '@/components/ui/UiModal.vue'
import { useMediaQuery } from '@/composables/useMediaQuery.js'

const props = defineProps({
  active: { type: Number, default: 0 },
  label: { type: String, default: 'Фильтры' },
  hint: { type: String, default: '' },
  card: { type: Boolean, default: false },
  title: { type: String, default: '' },
})

const emit = defineEmits(['reset'])

const compact = useMediaQuery('(max-width: 639px)')
const open = ref(false)

function reset() {
  emit('reset')
  open.value = false
}
</script>

<template>
  <SectionCard v-if="!compact && props.card" :title="props.title">
    <template v-if="props.active" #actions>
      <UiButton variant="ghost" size="sm" icon="x" @click="emit('reset')">Сбросить</UiButton>
    </template>
    <slot />
  </SectionCard>

  <div v-else-if="!compact" class="filter-row">
    <div class="filter-row__controls"><slot /></div>
    <UiButton v-if="props.active" variant="ghost" icon="x" @click="emit('reset')">
      Сбросить
    </UiButton>
  </div>

  <template v-else>
    <div class="filter-bar">
      <UiButton variant="secondary" icon="filter" @click="open = true">
        {{ props.label }}
        <span v-if="props.active" class="filter-bar__count">{{ props.active }}</span>
      </UiButton>
      <p v-if="props.hint" class="filter-bar__hint">{{ props.hint }}</p>
      <UiButton v-if="props.active" variant="ghost" size="sm" icon="x" @click="emit('reset')">
        Сбросить
      </UiButton>
    </div>

    <UiModal :open="open" :title="props.label" size="sm" @close="open = false">
      <div class="filter-sheet">
        <slot />
      </div>
      <template #footer>
        <UiButton v-if="props.active" variant="secondary" @click="reset">Сбросить</UiButton>
        <UiButton @click="open = false">Показать</UiButton>
      </template>
    </UiModal>
  </template>
</template>

<style lang="scss" scoped>
.filter-row {
  display: flex;
  align-items: flex-start;
  gap: $space-3;

  &__controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: $space-3;
    flex: 1;
    min-width: 0;
  }
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: $space-2;
  flex-wrap: wrap;

  &__count {
    display: inline-grid;
    place-items: center;
    min-width: 20px;
    height: 20px;
    margin-left: 2px;
    padding: 0 6px;
    border-radius: $radius-pill;
    background: var(--lime-strong);
    color: var(--text);
    font-size: $font-size-xs;
    font-weight: $weight-bold;
    font-variant-numeric: tabular-nums;
  }

  &__hint {
    font-size: $font-size-sm;
    line-height: $line-sm;
    color: var(--text-muted);
  }
}

.filter-sheet {
  @include form-row($space-3);
}
</style>
