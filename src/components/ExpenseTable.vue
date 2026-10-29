<script setup>
import AppIcon from '@/components/AppIcon.vue'
import UiSkeleton from '@/components/ui/UiSkeleton.vue'
import { FUEL_GRADE_LABELS, useFormat } from '@/composables/useFormat.js'
import { useMediaQuery } from '@/composables/useMediaQuery.js'

defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['edit', 'remove'])

const { money, date, number, distance, volumeUnit } = useFormat()

const asCards = useMediaQuery('(max-width: 639px)')

const details = (item, { volume, length }) => {
  const parts = []
  if (item.vendor) parts.push(item.vendor)
  if (item.vehicle?.title) parts.push(item.vehicle.title)
  if (item.liters) {
    const grade = item.fuelGrade ? ` ${FUEL_GRADE_LABELS[item.fuelGrade]}` : ''
    parts.push(`${number(item.liters, 2)} ${volume(item.fuelGrade)}${grade}`)
  } else if (item.odometer) {
    parts.push(length(item.odometer))
  }
  return parts.join(' · ')
}
</script>

<template>
  <ul v-if="asCards" class="cards">
    <template v-if="loading">
      <li v-for="row in 5" :key="row" class="card">
        <UiSkeleton height="42px" />
      </li>
    </template>

    <li v-for="item in loading ? [] : items" :key="item.id" class="card">
      <span class="card__dot" :style="{ background: item.category.color }" />

      <div class="card__body">
        <p class="card__head">
          <span class="card__name">{{ item.category.name }}</span>
          <span class="card__amount">{{ money(item.amount) }}</span>
        </p>
        <p class="card__meta">
          {{ date(item.spentAt) }}
          <template v-if="details(item, { volume: volumeUnit, length: distance })">
            · {{ details(item, { volume: volumeUnit, length: distance }) }}
          </template>
        </p>
        <p v-if="item.note" class="card__note">{{ item.note }}</p>
      </div>

      <div class="card__actions">
        <button type="button" aria-label="Изменить" @click="emit('edit', item)">
          <AppIcon name="pencil" :size="16" />
        </button>
        <button
          type="button"
          class="is-danger"
          aria-label="Удалить"
          @click="emit('remove', item)"
        >
          <AppIcon name="trash" :size="16" />
        </button>
      </div>
    </li>
  </ul>

  <div v-else class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th>Категория</th>
          <th>Дата</th>
          <th>Место</th>
          <th>Транспорт</th>
          <th class="table__num">Детали</th>
          <th class="table__num">Сумма</th>
          <th class="table__actions-head" aria-label="Действия"></th>
        </tr>
      </thead>

      <tbody v-if="loading">
        <tr v-for="row in 5" :key="row">
          <td colspan="7"><UiSkeleton height="20px" /></td>
        </tr>
      </tbody>

      <tbody v-else>
        <tr v-for="item in items" :key="item.id">
          <td>
            <div class="table__category">
              <span
                class="table__category-dot"
                :style="{ background: item.category.color }"
              />
              <div class="table__category-text">
                <span class="table__category-name">{{ item.category.name }}</span>
                <span v-if="item.note" class="table__note">{{ item.note }}</span>
              </div>
            </div>
          </td>
          <td class="table__muted">{{ date(item.spentAt) }}</td>
          <td class="table__muted">{{ item.vendor ?? '—' }}</td>
          <td class="table__muted">{{ item.vehicle?.title ?? '—' }}</td>
          <td class="table__num table__muted">
            <span v-if="item.liters">
              {{ number(item.liters, 2) }} {{ volumeUnit(item.fuelGrade) }}
              <template v-if="item.fuelGrade"> · {{ FUEL_GRADE_LABELS[item.fuelGrade] }}</template>
            </span>
            <span v-else-if="item.odometer">{{ distance(item.odometer) }}</span>
            <span v-else>—</span>
          </td>
          <td class="table__num table__amount">{{ money(item.amount) }}</td>
          <td class="table__actions">
            <button type="button" aria-label="Изменить" @click="emit('edit', item)">
              <AppIcon name="pencil" :size="15" />
            </button>
            <button
              type="button"
              class="is-danger"
              aria-label="Удалить"
              @click="emit('remove', item)"
            >
              <AppIcon name="trash" :size="15" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style lang="scss" scoped>
.cards {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  padding: $space-3 $space-4 $space-4;
}

.card {
  display: flex;
  align-items: flex-start;
  gap: $space-3;
  padding: $space-3 $space-4;
  border-radius: $radius-md;
  background: var(--surface-2);

  &__dot {
    width: 8px;
    height: 8px;
    flex: none;
    margin-top: 7px;
    border-radius: 50%;
  }

  &__body {
    flex: 1;
    min-width: 0;
  }

  &__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: $space-3;
  }

  &__name {
    font-size: $font-size-md;
    line-height: $line-md;
    font-weight: $weight-bold;
    min-width: 0;
    @include truncate;
  }

  &__amount {
    flex: none;
    font-size: $font-size-md;
    line-height: $line-md;
    font-weight: $weight-bold;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  &__meta {
    font-size: $font-size-sm;
    line-height: $line-sm;
    color: var(--text-muted);
  }

  &__note {
    font-size: $font-size-sm;
    line-height: $line-sm;
    color: var(--text-soft);
  }

  &__actions {
    display: flex;
    flex-direction: column;
    align-self: center;
    gap: 6px;
    flex: none;

    button {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border: 0;
      border-radius: 50%;
      background: var(--surface);
      color: var(--text-muted);
      cursor: pointer;

      &:active {
        background: var(--fill-gray-strong);
      }

      &.is-danger {
        color: var(--danger);
      }
    }
  }
}

.table-wrap {
  position: relative;
  max-width: 100%;
  overflow-x: auto;
  @include scrollbar;
}

.table {
  width: 100%;
  min-width: 680px;
  border-collapse: collapse;
  font-size: $font-size-base;

  th {
    @include eyebrow;
    background: var(--fill-gray);
    text-align: left;
    padding: $space-4 $space-5 $space-3;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }

  td {
    padding: $space-4 $space-5;
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
    font-weight: $weight-medium;
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }

  tbody tr:hover td {
    background: var(--surface-2);
  }

  @include down($bp-sm) {
    th {
      padding: $space-3 $space-3 $space-2;
    }

    td {
      padding: $space-3;
    }
  }

  & th#{&}__num,
  & td#{&}__num {
    text-align: right;
  }

  &__muted {
    color: var(--text-muted);
    white-space: nowrap;
  }

  &__amount {
    font-weight: $weight-bold;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  &__category {
    display: flex;
    align-items: center;
    gap: $space-3;
    min-width: 0;
  }

  &__category-dot {
    width: 8px;
    height: 8px;
    flex: none;
    border-radius: 50%;
  }

  &__category-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__category-name {
    font-weight: $weight-semibold;
    color: var(--text);
  }

  &__note {
    font-size: $font-size-sm;
    line-height: $line-xs;
    color: var(--text-soft);
    max-width: 260px;
    @include truncate;
  }

  &__actions-head {
    width: 80px;
  }

  &__actions {
    white-space: nowrap;
    text-align: right;

    button {
      display: inline-grid;
      place-items: center;
      width: 28px;
      height: 28px;
      margin-left: 4px;
      border: 1px solid var(--border-input);
      border-radius: $radius-sm;
      background: var(--surface);
      color: var(--text-soft);
      cursor: pointer;

      &:hover {
        color: var(--text);
        border-color: var(--border-strong);
      }

      &.is-danger:hover {
        background: var(--danger-soft);
        border-color: var(--danger);
        color: var(--danger);
      }
    }
  }
}
</style>
