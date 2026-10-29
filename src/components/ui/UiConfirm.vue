<script setup>
import UiButton from './UiButton.vue'
import UiModal from './UiModal.vue'

defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Подтвердите действие' },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Удалить' },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <UiModal :open="open" :title="title" size="sm" @close="emit('cancel')">
    <p class="confirm__message">{{ message }}</p>
    <template #footer>
      <UiButton variant="secondary" @click="emit('cancel')">Отмена</UiButton>
      <UiButton variant="danger" :loading="loading" @click="emit('confirm')">
        {{ confirmLabel }}
      </UiButton>
    </template>
  </UiModal>
</template>

<style lang="scss" scoped>
.confirm__message {
  color: var(--text-muted);
}
</style>
