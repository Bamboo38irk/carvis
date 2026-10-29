import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router/index.js'
import { useAuthStore } from './stores/auth.js'
import './styles/main.scss'

function hideSplash() {
  const splash = document.getElementById('splash')
  if (!splash) return

  splash.classList.add('is-hidden')
  const remove = () => splash.remove()
  splash.addEventListener('transitionend', remove, { once: true })
  setTimeout(remove, 600)
}

async function bootstrap() {
  const app = createApp(App)
  app.use(createPinia())

  await useAuthStore().restore()

  app.use(router)
  await router.isReady()
  app.mount('#app')

  requestAnimationFrame(hideSplash)
}

bootstrap().catch((error) => {
  console.error('[boot] failed:', error)
  hideSplash()
})
