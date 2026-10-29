<script setup>
import AppIcon from '@/components/AppIcon.vue'

defineProps({
  modelValue: { type: [String, Number, null], default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: '' },
  id: { type: String, default: undefined },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <span class="select">
    <select
      :id="id"
      class="select__control"
      :value="modelValue"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option v-if="placeholder" value="">{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
    <AppIcon name="chevron-down" :size="16" class="select__chevron" />
  </span>
</template>

<style lang="scss" scoped>
.select {
  position: relative;
  display: flex;
  align-items: center;
  height: $control-height-lg;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: $radius-pill;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
  min-width: 0;

  &:hover {
    border-color: var(--text-faint);
  }

  &:focus-within {
    border-color: var(--text);
    @include focus-ring;
  }

  &__control {
    appearance: none;
    flex: 1;
    min-width: 0;
    height: 100%;
    padding: 0 $space-9 0 $space-5;

    @include down($bp-sm) {
      padding: 0 $space-8 0 $space-4;
    }
    border: 0;
    background: transparent;
    color: var(--text);
    font-family: inherit;
    font-size: $font-size-base;
    font-weight: $weight-medium;
    cursor: pointer;

    @include down($bp-md) {
      font-size: $font-size-lg;
    }

    &:focus {
      outline: none;
    }
  }

  &__chevron {
    position: absolute;
    right: $space-5;
    pointer-events: none;
    color: var(--text-muted);
  }
}
</style>
