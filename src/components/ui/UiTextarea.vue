<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  rows: { type: [String, Number], default: 3 },
  id: { type: String, default: undefined },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <textarea
    :id="id"
    class="textarea"
    :rows="rows"
    :value="modelValue"
    :placeholder="placeholder"
    @input="$emit('update:modelValue', $event.target.value)"
  />
</template>

<style lang="scss" scoped>
.textarea {
  width: 100%;
  padding: $space-4 $space-5;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: $radius-lg;
  color: var(--text);
  font-family: inherit;
  font-size: $font-size-base;
  font-weight: $weight-medium;
  line-height: $line-base;
  resize: vertical;

  @include down($bp-md) {
    font-size: $font-size-lg;
  }

  &:hover {
    border-color: var(--text-faint);
  }

  &:focus {
    border-color: var(--text);
    @include focus-ring;
  }

  &::placeholder {
    color: var(--text-soft);
    font-weight: $weight-regular;
  }
}
</style>
