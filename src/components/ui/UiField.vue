<script setup>
defineProps({
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  required: { type: Boolean, default: false },
  inputId: { type: String, default: '' },
})
</script>

<template>
  <label class="field" :for="inputId || undefined">
    <span v-if="label" class="field__label">
      {{ label }}
      <span v-if="required" class="field__required" aria-hidden="true">*</span>
    </span>
    <slot />
    <span v-if="error" class="field__error">{{ error }}</span>
    <span v-else-if="hint" class="field__hint">{{ hint }}</span>
  </label>
</template>

<style lang="scss" scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  min-width: 0;

  &__label {
    @include label;
  }

  &__required {
    color: var(--danger);
  }

  &__hint {
    font-size: $font-size-sm;
    line-height: $line-xs;
    color: var(--text-soft);
  }

  &__error {
    font-size: $font-size-sm;
    line-height: $line-xs;
    font-weight: $weight-semibold;
    color: var(--danger);
  }
}
</style>
