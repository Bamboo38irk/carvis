import { createRouter, createWebHistory } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import PublicLayout from '@/layouts/PublicLayout.vue'
import { useAuthStore } from '@/stores/auth.js'
import CalculatorsView from '@/views/CalculatorsView.vue'
import CategoriesView from '@/views/CategoriesView.vue'
import DashboardView from '@/views/DashboardView.vue'
import ExpensesView from '@/views/ExpensesView.vue'
import FuelView from '@/views/FuelView.vue'
import LoginView from '@/views/LoginView.vue'
import NotFoundView from '@/views/NotFoundView.vue'
import PassportView from '@/views/PassportView.vue'
import ReportsView from '@/views/ReportsView.vue'
import ServiceBookView from '@/views/ServiceBookView.vue'
import SettingsView from '@/views/SettingsView.vue'
import VehiclesView from '@/views/VehiclesView.vue'

const PAGE_TRANSITION_MS = 150

const routes = [
  {
    path: '/login',
    component: AuthLayout,
    meta: { guest: true },
    children: [{ path: '', name: 'login', component: LoginView, meta: { title: 'Вход' } }],
  },
  {
    path: '/passport/:token',
    component: PublicLayout,
    meta: { public: true },
    children: [
      {
        path: '',
        name: 'passport',
        component: PassportView,
        meta: { title: 'Предпродажный паспорт' },
      },
    ],
  },
  {
    path: '/',
    component: DashboardLayout,
    children: [
      { path: '', name: 'dashboard', component: DashboardView, meta: { title: 'Главная' } },
      {
        path: 'expenses',
        name: 'expenses',
        component: ExpensesView,
        meta: { title: 'Все расходы' },
      },
      { path: 'fuel', name: 'fuel', component: FuelView, meta: { title: 'Расход топлива' } },
      {
        path: 'categories',
        name: 'categories',
        component: CategoriesView,
        meta: { title: 'Категории' },
      },
      { path: 'vehicles', name: 'vehicles', component: VehiclesView, meta: { title: 'Гараж' } },
      {
        path: 'vehicles/:id/book',
        name: 'service-book',
        component: ServiceBookView,
        meta: { title: 'Сервисная книжка' },
      },
      { path: 'reports', name: 'reports', component: ReportsView, meta: { title: 'Отчеты' } },
      {
        path: 'tools',
        name: 'tools',
        component: CalculatorsView,
        meta: { title: 'Калькуляторы' },
      },
      {
        path: 'settings',
        name: 'settings',
        component: SettingsView,
        meta: { title: 'Настройки' },
      },
      {
        path: ':pathMatch(.*)*',
        name: 'not-found',
        component: NotFoundView,
        meta: { title: 'Страница не найдена' },
      },
    ],
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (!savedPosition) return { top: 0 }
    return new Promise((resolve) => {
      setTimeout(() => resolve(savedPosition), PAGE_TRANSITION_MS)
    })
  },
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.public) return true

  if (!to.meta.guest && !auth.isAuthenticated) {
    if (to.path === '/') return { name: 'login' }
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guest && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }
  return true
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} — Карвис` : 'Карвис'
})
