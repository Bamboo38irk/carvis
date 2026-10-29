<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import UiInput from '@/components/ui/UiInput.vue'
import { useAuthStore } from '@/stores/auth.js'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const form = ref({ login: '', password: '' })
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login({ login: form.value.login.trim(), password: form.value.password })
    router.push(route.query.redirect ?? { name: 'dashboard' })
  } catch (requestError) {
    error.value = requestError.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form class="auth-form" @submit.prevent="submit">
    <UiInput
      id="login-login"
      v-model="form.login"
      size="lg"
      icon="users"
      placeholder="Логин"
      aria-label="Логин"
      autocomplete="username"
    />

    <UiInput
      id="login-password"
      v-model="form.password"
      type="password"
      size="lg"
      icon="lock"
      placeholder="Пароль"
      aria-label="Пароль"
      autocomplete="current-password"
    />

    <div v-if="error" class="auth-form__error">
      <p>{{ error }}</p>
    </div>

    <UiButton type="submit" size="lg" block :loading="loading">Войти</UiButton>

    <p class="auth-form__note">
      Тестовый доступ: логин <strong>user</strong>, пароль <strong>user123</strong>. Данные
      хранятся только в этом браузере.
    </p>
  </form>
</template>
