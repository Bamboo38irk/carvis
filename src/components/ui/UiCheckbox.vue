<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <label class="checkbox">
    <input
      type="checkbox"
      :checked="modelValue"
      @change="$emit('update:modelValue', $event.target.checked)"
    />
    <span class="checkbox__text">
      <span class="checkbox__label">{{ label }}</span>
      <span v-if="hint" class="checkbox__hint">{{ hint }}</span>
    </span>
  </label>
</template>

<style lang="scss" scoped>
.checkbox {
  display: flex;
  align-items: flex-start;
  gap: $space-3;
  padding: $space-4 $space-5;
  border: 1px solid var(--border-strong);
  border-radius: $radius-lg;
  background: var(--surface);
  cursor: pointer;
  transition: border-color 0.15s ease;

  @include down($bp-sm) {
    gap: $space-2;
    padding: $space-3 $space-4;
    border-radius: $radius-md;
  }

  &:hover {
    border-color: var(--text-faint);
  }

  input {
    width: 17px;
    height: 17px;
    margin-top: 2px;
    flex: none;
    accent-color: var(--dark);
  }

  &__text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__label {
    font-size: $font-size-base;
    font-weight: $weight-semibold;
  }

  &__hint {
    font-size: $font-size-sm;
    line-height: $line-sm;
    color: var(--text-muted);
  }
}
</style>
