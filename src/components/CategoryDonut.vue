<script setup>
import { computed, ref } from 'vue'
import { useFormat } from '@/composables/useFormat.js'

const props = defineProps({
  items: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
})

const { money, number } = useFormat()

const RADIUS = 54
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const activeKey = ref(null)

const arcs = computed(() => {
  let offset = 0
  return props.items
    .filter((item) => item.total > 0)
    .map((item) => {
      const share = props.total > 0 ? item.total / props.total : 0
      const arc = {
        ...item,
        key: item.id ?? item.name,
        length: share * CIRCUMFERENCE,
        offset: offset * CIRCUMFERENCE,
      }
      offset += share
      return arc
    })
})

const active = computed(
  () => arcs.value.find((arc) => arc.key === activeKey.value) ?? null,
)

const center = computed(() => {
  if (active.value) {
    return {
      label: active.value.name,
      value: money(active.value.total, { compact: true }),
      hint: `${number(active.value.share, 1)}%`,
    }
  }
  return {
    label: 'Всего',
    value: money(props.total, { compact: true }),
    hint: '',
  }
})
</script>

<template>
  <div class="donut">
    <div class="donut__chart">
      <svg viewBox="0 0 130 130" role="img" :aria-label="`Расходы по категориям, всего ${money(total)}`">
        <circle class="donut__track" cx="65" cy="65" :r="RADIUS" />
        <circle
          v-for="arc in arcs"
          :key="arc.key"
          class="donut__arc"
          :class="{ 'is-dimmed': activeKey && activeKey !== arc.key }"
          cx="65"
          cy="65"
          :r="RADIUS"
          :stroke="arc.color"
          :stroke-dasharray="`${arc.length} ${CIRCUMFERENCE - arc.length}`"
          :stroke-dashoffset="-arc.offset"
          @mouseenter="activeKey = arc.key"
          @mouseleave="activeKey = null"
        />
      </svg>

      <div class="donut__center">
        <p class="donut__center-label">{{ center.label }}</p>
        <p class="donut__center-value">{{ center.value }}</p>
        <p class="donut__center-hint">{{ center.hint }}</p>
      </div>
    </div>

    <ul class="donut__legend">
      <li
        v-for="item in items.slice(0, 7)"
        :key="item.id ?? item.name"
        class="donut__legend-item"
        :class="{ 'is-active': activeKey === (item.id ?? item.name) }"
        @mouseenter="activeKey = item.id ?? item.name"
        @mouseleave="activeKey = null"
      >
        <span class="donut__legend-dot" :style="{ background: item.color }" />
        <span class="donut__legend-name">{{ item.name }}</span>
        <span class="donut__legend-share">{{ number(item.share, 0) }}%</span>
        <span class="donut__legend-value">{{ money(item.total) }}</span>
      </li>
    </ul>
  </div>
</template>

<style lang="scss" scoped>
.donut {
  display: flex;
  align-items: center;
  gap: $space-5;
  flex-wrap: wrap;
  height: 100%;

  &__chart {
    position: relative;
    width: 150px;
    flex: none;

    svg {
      width: 100%;
      transform: rotate(-90deg);
    }
  }

  &__track {
    fill: none;
    stroke: var(--fill-gray);
    stroke-width: 14;
  }

  &__arc {
    fill: none;
    stroke-width: 13;
    stroke-linecap: butt;
    transition: opacity 0.15s ease, stroke-width 0.15s ease;

    &:hover {
      stroke-width: 16;
    }

    &.is-dimmed {
      opacity: 0.35;
    }
  }

  &__center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    pointer-events: none;
    padding: 0 $space-8;
  }

  &__center-label {
    font-size: $font-size-xs;
    line-height: $line-xs;
    color: var(--text-soft);
    max-width: 100%;
    @include truncate;
  }

  &__center-value {
    font-size: $font-size-md;
    line-height: $line-md;
    font-weight: $weight-medium;
    letter-spacing: -0.01em;
  }

  &__center-hint {
    font-size: $font-size-xs;
    line-height: $line-xs;
    color: var(--text-soft);
    max-width: 100%;
    @include truncate;
  }

  &__legend {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 230px;
  }

  &__legend-item {
    display: grid;
    grid-template-columns: 8px minmax(60px, 1fr) auto auto;
    align-items: center;
    gap: $space-3;
    padding: 5px $space-2;
    border-radius: $radius-sm;
    font-size: $font-size-base;

    &.is-active,
    &:hover {
      background: var(--fill-gray);
    }
  }

  &__legend-dot {
    width: 8px;
    height: 8px;
    flex: none;
    border-radius: 50%;
  }

  &__legend-name {
    @include truncate;
    color: var(--text-muted);
  }

  &__legend-share {
    color: var(--text-soft);
    font-size: $font-size-sm;
    font-variant-numeric: tabular-nums;
  }

  &__legend-value {
    font-weight: $weight-medium;
    font-variant-numeric: tabular-nums;
  }

  @include down($bp-md) {
    flex-direction: column;
    align-items: stretch;

    &__chart {
      align-self: center;
    }
  }
}
</style>
