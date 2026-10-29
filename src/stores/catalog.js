import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { categoriesApi, vehiclesApi } from '@/api/index.js'

export const useCatalogStore = defineStore('catalog', () => {
  const categories = ref([])
  const vehicles = ref([])
  const loaded = ref(false)
  const loading = ref(false)

  const primaryVehicle = computed(
    () => vehicles.value.find((vehicle) => vehicle.isPrimary) ?? vehicles.value[0] ?? null,
  )
  const vehicleOptions = computed(() => {
    const seen = new Map()
    for (const vehicle of vehicles.value) {
      seen.set(vehicle.title, (seen.get(vehicle.title) ?? 0) + 1)
    }

    return vehicles.value.map((vehicle) => ({
      value: vehicle.id,
      label:
        vehicle.plate && seen.get(vehicle.title) > 1
          ? `${vehicle.title} · ${vehicle.plate}`
          : vehicle.title,
    }))
  })

  let inFlight = null

  async function refreshCategories() {
    categories.value = await categoriesApi.list()
  }

  async function refreshVehicles() {
    const response = await vehiclesApi.list()
    vehicles.value = response.items
  }

  const refresh = () => Promise.all([refreshCategories(), refreshVehicles()])

  async function load() {
    if (loaded.value) return
    if (inFlight) return inFlight

    loading.value = true
    inFlight = (async () => {
      try {
        await refresh()
        loaded.value = true
      } finally {
        loading.value = false
        inFlight = null
      }
    })()

    return inFlight
  }

  const reset = () => {
    categories.value = []
    vehicles.value = []
    loaded.value = false
    inFlight = null
  }

  async function createCategory(payload) {
    await categoriesApi.create(payload)
    await refreshCategories()
  }

  async function updateCategory(id, payload) {
    await categoriesApi.update(id, payload)
    await refreshCategories()
  }

  async function removeCategory(id) {
    await categoriesApi.remove(id)
    await refreshCategories()
  }

  async function createVehicle(payload) {
    await vehiclesApi.create(payload)
    await refreshVehicles()
  }

  async function updateVehicle(id, payload) {
    await vehiclesApi.update(id, payload)
    await refreshVehicles()
  }

  async function removeVehicle(id) {
    await vehiclesApi.remove(id)
    await refreshVehicles()
  }

  return {
    categories,
    vehicles,
    loading,
    primaryVehicle,
    vehicleOptions,
    load,
    reset,
    refresh,
    createCategory,
    updateCategory,
    removeCategory,
    createVehicle,
    updateVehicle,
    removeVehicle,
  }
})
