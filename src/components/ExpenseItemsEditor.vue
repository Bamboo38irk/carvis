<script setup>
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import { useFormat } from '@/composables/useFormat.js'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])

const { money, currencySymbol } = useFormat()

const KIND_OPTIONS = [
  { value: 'part', label: 'Запчасть' },
  { value: 'labour', label: 'Работа' },
]

const rows = computed(() => props.modelValue)

const lineTotal = (item) => Math.max(0, Number(item.quantity) || 0) * Math.max(0, Number(item.unitPrice) || 0)

const total = computed(() => rows.value.reduce((sum, item) => sum + lineTotal(item), 0))

const parts = computed(() =>
  rows.value.filter((item) => item.kind === 'part').reduce((sum, item) => sum + lineTotal(item), 0),
)
const labour = computed(() => total.value - parts.value)

const blankRow = (kind = 'part') => ({ kind, name: '', quantity: '1', unitPrice: '', partCode: '' })

const update = (next) => emit('update:modelValue', next)

const add = (kind) => update([...rows.value, blankRow(kind)])

const remove = (index) => update(rows.value.filter((unused, position) => position !== index))

const patch = (index, field, value) =>
  update(rows.value.map((item, position) => (position === index ? { ...item, [field]: value } : item)))
</script>

<template>
  <section class="items">
    <header class="items__head">
      <p class="items__title">Работы и запчасти</p>
      <p class="items__hint">
        Необязательно. Если заполнить — сумма расхода сложится из строк сама.
      </p>
    </header>

    <div v-if="rows.length" class="items__list">
      <article v-for="(item, index) in rows" :key="index" class="row">
        <UiSelect
          class="row__kind"
          :model-value="item.kind"
          :options="KIND_OPTIONS"
          @update:model-value="patch(index, 'kind', $event)"
        />
        <UiInput
          class="row__name"
          :model-value="item.name"
          :placeholder="item.kind === 'labour' ? 'Замена колодок' : 'Колодки передние'"
          @update:model-value="patch(index, 'name', $event)"
        />
        <UiInput
          class="row__code"
          :model-value="item.partCode"
          :placeholder="item.kind === 'labour' ? 'нормо-часы' : 'артикул'"
          @update:model-value="patch(index, 'partCode', $event)"
        />
        <UiInput
          class="row__qty"
          type="number"
          min="0"
          step="0.5"
          :model-value="item.quantity"
          :placeholder="item.kind === 'labour' ? '1,5' : '2'"
          @update:model-value="patch(index, 'quantity', $event)"
        />
        <UiInput
          class="row__price"
          type="number"
          min="0"
          step="0.01"
          :suffix="currencySymbol"
          :model-value="item.unitPrice"
          placeholder="0"
          @update:model-value="patch(index, 'unitPrice', $event)"
        />
        <span class="row__total">{{ money(lineTotal(item)) }}</span>
        <button
          class="row__remove"
          type="button"
          aria-label="Убрать строку"
          @click="remove(index)"
        >
          <AppIcon name="trash" :size="15" />
        </button>
      </article>
    </div>

    <div class="items__actions">
      <UiButton variant="secondary" size="sm" icon="plus" type="button" @click="add('part')">
        Запчасть
      </UiButton>
      <UiButton variant="secondary" size="sm" icon="plus" type="button" @click="add('labour')">
        Работа
      </UiButton>
    </div>

    <p v-if="rows.length" class="items__total">
      Запчасти {{ money(parts) }} · работы {{ money(labour) }} ·
      <b>итого {{ money(total) }}</b>
    </p>
  </section>
</template>

<style lang="scss" scoped>
.items {
  display: flex;
  flex-direction: column;
  gap: $space-3;
  padding: $space-4;
  border: 1px dashed var(--border-strong);
  border-radius: $radius-md;
  background: var(--surface-2);

  @include down($bp-sm) {
    padding: $space-3;
  }

  &__title {
    font-size: $font-size-base;
    font-weight: $weight-semibold;
  }

  &__hint {
    margin-top: 2px;
    font-size: $font-size-sm;
    line-height: $line-xs;
    color: var(--text-soft);
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: $space-2;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: $space-2;
  }

  &__total {
    font-size: $font-size-sm;
    color: var(--text-muted);
  }
}

.row {
  display: grid;
  grid-template-columns: 116px minmax(0, 1fr) 110px 70px 110px auto 28px;
  align-items: center;
  gap: $space-2;

  @include down($bp-md) {
    grid-template-columns: 116px minmax(0, 1fr) 70px 110px auto 28px;

    &__code {
      display: none;
    }
  }

  @include down($bp-sm) {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 6px;
    padding: $space-3;
    border: 1px solid var(--border);
    border-radius: $radius-sm;
    background: var(--surface);

    &__kind {
      grid-column: 1 / -1;
    }

    &__name {
      grid-column: 1 / -1;
    }

    &__code {
      display: block;
      grid-column: 1 / -1;
    }

    &__qty,
    &__price {
      grid-column: auto;
    }
  }

  &__total {
    font-variant-numeric: tabular-nums;
    font-weight: $weight-semibold;
    text-align: right;
    white-space: nowrap;
  }

  &__remove {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: $radius-sm;
    background: none;
    color: var(--text-soft);
    cursor: pointer;

    &:hover {
      background: var(--surface-2);
      color: var(--danger);
    }
  }
}
</style>
