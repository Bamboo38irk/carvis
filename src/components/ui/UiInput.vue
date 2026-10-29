<script setup>
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  type: { type: String, default: 'text' },
  size: { type: String, default: 'md' },
  placeholder: { type: String, default: '' },
  icon: { type: String, default: '' },
  suffix: { type: String, default: '' },
  invalid: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  step: { type: [String, Number], default: undefined },
  min: { type: [String, Number], default: undefined },
  max: { type: [String, Number], default: undefined },
  autocomplete: { type: String, default: undefined },
  id: { type: String, default: undefined },
  ariaLabel: { type: String, default: undefined },
})

defineEmits(['update:modelValue'])

const showDateHint = computed(
  () => ['date', 'month', 'time'].includes(props.type) && !props.modelValue,
)

const DATE_HINTS = { date: 'дд.мм.гггг', month: 'мм.гггг', time: 'чч:мм' }
const dateHint = computed(() => props.placeholder || DATE_HINTS[props.type] || '')
</script>

<template>
  <span
    class="input"
    :class="[
      `input--${size}`,
      {
        'input--invalid': invalid,
        'input--disabled': disabled,
        'input--date-empty': showDateHint,
      },
    ]"
  >
    <AppIcon v-if="icon" :name="icon" :size="16" class="input__icon" />
    <input
      :id="id"
      class="input__control"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :step="step"
      :min="min"
      :max="max"
      :autocomplete="autocomplete"
      :aria-label="ariaLabel"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <span v-if="suffix" class="input__affix input__affix--end">{{ suffix }}</span>
    <span v-if="showDateHint" class="input__date-hint" aria-hidden="true">{{ dateHint }}</span>
  </span>
</template>

<style lang="scss" scoped>
.input {
  position: relative;
  display: flex;
  align-items: center;
  gap: $space-3;
  height: $control-height-lg;
  padding: 0 $space-5;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: $radius-pill;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
  min-width: 0;

  @include down($bp-sm) {
    gap: $space-2;
    padding: 0 $space-4;
  }

  &:hover {
    border-color: var(--text-faint);
  }

  &:focus-within {
    border-color: var(--text);
    @include focus-ring;
  }

  &--lg {
    height: 46px;
  }

  &--invalid {
    border-color: var(--danger);
  }

  &--disabled {
    background: var(--fill-gray);
    opacity: 0.7;
  }

  &__icon,
  &__affix {
    color: var(--text-soft);
    flex: none;
  }

  &__affix {
    font-size: $font-size-base;
    font-weight: $weight-semibold;

    &--end {
      margin-left: auto;
    }
  }

  &__date-hint {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    padding: inherit;
    color: var(--text-soft);
    font-size: $font-size-base;
    font-weight: $weight-regular;
    pointer-events: none;

    @include down($bp-md) {
      font-size: $font-size-lg;
    }
  }

  &--date-empty:not(:focus-within) &__control::-webkit-datetime-edit {
    opacity: 0;
  }

  &--date-empty:focus-within &__date-hint {
    display: none;
  }

  &__control {
    flex: 1;
    min-width: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--text);
    font-family: inherit;
    font-size: $font-size-base;
    font-weight: $weight-medium;

    @include down($bp-md) {
      font-size: $font-size-lg;
    }

    &:focus {
      outline: none;
    }

    &::placeholder {
      color: var(--text-soft);
      font-weight: $weight-regular;
    }

    &::-webkit-calendar-picker-indicator {
      cursor: pointer;
      opacity: 0.45;
    }
  }
}
</style>
