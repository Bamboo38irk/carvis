<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { toIsoDate, useFormat } from '@/composables/useFormat.js'

const props = defineProps({
  data: { type: Array, default: () => [] },
})

const emit = defineEmits(['select'])

const { money, monthLabel, monthFull, number, plural } = useFormat()

const hovered = ref(null)
const scroller = ref(null)

async function scrollToLatest() {
  await nextTick()
  const el = scroller.value
  if (el) el.scrollLeft = el.scrollWidth
}

onMounted(scrollToLatest)
watch(() => props.data, scrollToLatest)

const max = computed(() => Math.max(...props.data.map((point) => point.total), 1))

const bars = computed(() =>
  props.data.map((point) => ({
    ...point,
    height: point.total > 0 ? Math.max(3, (point.total / max.value) * 100) : 2,
    label: monthLabel(point.month),
    isCurrent: point.month === toIsoDate().slice(0, 7),
  })),
)

const average = computed(() => {
  const active = props.data.filter((point) => point.total > 0)
  if (active.length === 0) return 0
  return active.reduce((sum, point) => sum + point.total, 0) / active.length
})

const tooltip = computed(() => {
  if (!hovered.value) return null
  const point = props.data.find((item) => item.month === hovered.value)
  if (!point) return null
  return {
    title: monthFull(point.month),
    total: money(point.total),
    count: `${number(point.count)} ${plural(point.count, ['запись', 'записи', 'записей'])}`,
  }
})
</script>

<template>
  <div class="bars">
    <div class="bars__header">
      <div>
        <p class="bars__meta-label">Средний месяц</p>
        <p class="bars__meta-value">{{ money(average) }}</p>
      </div>
      <div v-if="tooltip" class="bars__tooltip">
        <p class="bars__tooltip-title">{{ tooltip.title }}</p>
        <p class="bars__tooltip-value">{{ tooltip.total }} · {{ tooltip.count }}</p>
      </div>
    </div>

    <div ref="scroller" class="bars__scroll">
      <div class="bars__plot" :style="{ '--bars-count': bars.length }">
        <div
          v-for="bar in bars"
          :key="bar.month"
          class="bars__column"
          :class="{ 'is-current': bar.isCurrent, 'is-active': hovered === bar.month }"
          @mouseenter="hovered = bar.month"
          @mouseleave="hovered = null"
          @click="hovered = bar.month; emit('select', bar)"
        >
          <div class="bars__value">
            {{ bar.total > 0 ? money(bar.total, { compact: true }) : '' }}
          </div>
          <div
            class="bars__bar"
            :class="{ 'is-current': bar.isCurrent }"
            :style="{ height: `${bar.height}%` }"
          />
          <span class="bars__label" :class="{ 'is-current': bar.isCurrent }">{{ bar.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.bars {
  display: flex;
  flex-direction: column;
  gap: $space-4;

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: $space-2 $space-4;
    flex-wrap: wrap;
    min-height: 38px;
  }

  &__meta-label {
    font-size: $font-size-sm;
    line-height: $line-sm;
    color: var(--text-soft);
  }

  &__meta-value {
    font-size: $font-size-lg;
    line-height: $line-md;
    font-weight: $weight-medium;
  }

  &__tooltip {
    text-align: right;
    min-width: 0;

    @include down($bp-sm) {
      text-align: left;
    }
  }

  &__tooltip-title {
    font-size: $font-size-sm;
    font-weight: $weight-medium;
    text-transform: capitalize;
  }

  &__tooltip-value {
    font-size: $font-size-sm;
    color: var(--text-muted);
  }

  &__scroll {
    min-width: 0;
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;

    @include down($bp-sm) {
      margin: 0 -#{$space-4};
      padding: 0 $space-4;
    }
  }

  &__plot {
    position: relative;
    display: flex;
    align-items: flex-end;
    gap: $space-2;
    height: 220px;
    padding: $space-5 0 0;
    border-bottom: 1px solid var(--border);

    @include down($bp-sm) {
      gap: $space-1;
      height: 190px;
      padding: $space-5 $space-3 0;
      min-width: calc(var(--bars-count, 1) * 40px + 2 * #{$space-3});
    }
  }

  &__column {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    gap: $space-2;
    flex: 1;
    height: 100%;
    min-width: 0;
    padding: 0 0 10px;
    cursor: pointer;

    &:hover .bars__bar,
    &.is-active .bars__bar {
      filter: saturate(1.1) brightness(0.97);
    }

    @include down($bp-sm) {
      gap: $space-1;
      padding-bottom: 8px;
    }
  }

  &__value {
    font-size: $font-size-xs;
    line-height: $line-xs;
    color: var(--text-soft);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    opacity: 0;
    transition: opacity 0.16s ease;

    @include down($bp-sm) {
      color: var(--text);
      font-weight: $weight-medium;
    }
  }

  &__column:hover &__value,
  &__column.is-active &__value,
  &__column.is-current &__value {
    opacity: 1;
  }

  &__bar {
    width: 100%;
    max-width: 34px;
    min-height: 2px;
    border-radius: $radius-sm $radius-sm 2px 2px;
    background: linear-gradient(180deg, #d9caff 0%, #a98ef2 100%);
    transition: height 0.4s ease, filter 0.16s ease;

    &.is-current {
      background: linear-gradient(180deg, #e2f471 0%, #c2e337 100%);
    }
  }

  &__label {
    font-size: $font-size-sm;
    line-height: $line-sm;
    color: var(--text-soft);
    white-space: nowrap;

    &.is-current {
      color: var(--text);
      font-weight: $weight-medium;
    }

    @include down($bp-sm) {
      font-size: $font-size-xs;
      line-height: $line-xs;
    }
  }
}
</style>
