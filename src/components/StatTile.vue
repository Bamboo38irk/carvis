<script setup>
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import UiSkeleton from '@/components/ui/UiSkeleton.vue'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: '' },
  icon: { type: String, default: '' },
  hint: { type: String, default: '' },
  change: { type: Number, default: null },
  tone: { type: String, default: 'accent' },
  fill: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  highlight: { type: Boolean, default: false },
})

const ACCENT_BY_TONE = {
  accent: 'lime',
  info: 'lavender',
  success: 'mint',
  warning: 'peach',
}

const accentName = computed(() => props.fill || ACCENT_BY_TONE[props.tone])

const changeTone = computed(() => (props.change > 0 ? 'bad' : 'good'))

const hasChange = computed(
  () => props.change !== null && Math.abs(props.change) >= 0.05,
)

const changeLabel = computed(() => {
  const sign = props.change > 0 ? '+' : '−'
  return `${sign}${Math.abs(props.change).toFixed(1)}%`
})
</script>

<template>
  <article
    class="stat"
    :class="[`stat--${accentName}`, { 'stat--highlight': highlight }]"
  >
    <header class="stat__head">
      <p class="stat__title">{{ label }}</p>
      <span v-if="icon" class="stat__icon"><AppIcon :name="icon" :size="16" /></span>
    </header>

    <div class="stat__body">
      <UiSkeleton v-if="loading" height="30px" width="70%" />
      <p v-else class="stat__value">{{ value }}</p>
    </div>

    <footer v-if="(hasChange || hint) && !loading" class="stat__foot">
      <span v-if="hasChange" class="stat__change" :class="`stat__change--${changeTone}`">
        <AppIcon :name="change > 0 ? 'trending-up' : 'trending-down'" :size="13" />
        {{ changeLabel }}
      </span>
      <p v-if="hint" class="stat__hint">{{ hint }}</p>
    </footer>
  </article>
</template>

<style lang="scss" scoped>
.stat {
  --stat-accent-soft: var(--lime-soft);

  position: relative;
  display: flex;
  flex-direction: column;
  gap: $space-2;
  padding: $space-4 $space-5 $space-5;
  border: 1px solid transparent;
  border-radius: $radius-xl;
  background: var(--tile-fill, var(--surface));
  background-origin: border-box;

  &--lime {
    --tile-fill: linear-gradient(150deg, #f6fcd8 0%, #e6f6a0 100%);
    --stat-accent-soft: rgba(255, 255, 255, 0.62);
  }
  &--lavender {
    --tile-fill: linear-gradient(150deg, #f4efff 0%, #ddd0fb 100%);
    --stat-accent-soft: rgba(255, 255, 255, 0.62);
  }
  &--mint {
    --tile-fill: linear-gradient(150deg, #eafaf0 0%, #c6ebd5 100%);
    --stat-accent-soft: rgba(255, 255, 255, 0.62);
  }
  &--peach {
    --tile-fill: linear-gradient(150deg, #fdf3e5 0%, #fadec0 100%);
    --stat-accent-soft: rgba(255, 255, 255, 0.62);
  }
  &--periwinkle {
    --tile-fill: linear-gradient(150deg, #edf7fd 0%, #cbe8f8 100%);
    --stat-accent-soft: rgba(255, 255, 255, 0.62);
  }

  &--highlight {
    --tile-fill: linear-gradient(150deg, #e4f57e 0%, #c8e63f 100%);

    .stat__change {
      background: var(--dark);
      color: var(--text-on-dark);
    }
  }

  &__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: $space-2;
  }

  &__title {
    font-size: $font-size-sm;
    line-height: $line-sm;
    font-weight: $weight-medium;
    color: rgba(26, 26, 26, 0.66);
    overflow-wrap: anywhere;
  }

  &__icon {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    flex: none;
    border-radius: $radius-xs;
    background: var(--stat-accent-soft);
    color: var(--text);
  }

  &__body {
    min-height: 30px;
  }

  &__value {
    font-size: $font-size-display;
    line-height: $line-display;
    font-weight: $weight-bold;
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
  }

  &__foot {
    display: flex;
    align-items: center;
    gap: $space-2;
    flex-wrap: wrap;
    margin-top: auto;
    padding-top: 2px;
  }

  &__change {
    @include chip;
    height: 24px;
    padding: 0 $space-2 0 6px;
    background: rgba(255, 255, 255, 0.72);
    font-weight: $weight-bold;
    color: var(--success-strong);

    &--bad {
      color: var(--danger);
    }
  }

  &__hint {
    font-size: $font-size-sm;
    line-height: $line-sm;
    color: rgba(26, 26, 26, 0.6);
    min-width: 0;
  }

  @include down($bp-sm) {
    gap: 6px;
    padding: $space-3 $space-4 $space-4;
    border-radius: $radius-lg;

    &__icon {
      width: 22px;
      height: 22px;
    }

    &__body {
      min-height: 26px;
    }

    &__value {
      font-size: $font-size-2xl;
      line-height: $line-xl;
    }

    &__hint {
      font-size: $font-size-xs;
      line-height: $line-xs;
    }

    &__change {
      height: 22px;
      font-size: $font-size-xs;
    }
  }
}
</style>
