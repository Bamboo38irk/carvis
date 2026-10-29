<script setup>
import { useRouter } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import UiEmpty from '@/components/ui/UiEmpty.vue'

const router = useRouter()
</script>

<template>
  <div class="card">
    <UiEmpty
      icon="search"
      title="Такой страницы нет"
      description="Проверьте адрес или вернитесь на главную."
    >
      <UiButton icon="dashboard" @click="router.push({ name: 'dashboard' })">
        На главную
      </UiButton>
    </UiEmpty>
  </div>
</template>
