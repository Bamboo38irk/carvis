import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { expensesApi, statsApi } from '@/api/index.js'
import { useUiStore } from '@/stores/ui.js'

const emptyFilters = () => ({
  page: 1,
  pageSize: 20,
  categoryId: '',
  vehicleId: '',
  from: '',
  to: '',
  search: '',
  sort: 'spent_at',
  order: 'desc',
})

const cleanParams = (filters) =>
  Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '' && value != null))

export const useExpensesStore = defineStore('expenses', () => {
  const ui = useUiStore()

  const items = ref([])
  const total = ref(0)
  const totalAmount = ref(0)
  const filters = ref(emptyFilters())
  const loading = ref(false)
  const listLoaded = ref(false)
  const overview = ref(null)
  const overviewParams = ref({})
  const overviewLoading = ref(false)

  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / filters.value.pageSize)))
  const activeFilterCount = computed(
    () =>
      ['categoryId', 'vehicleId', 'from', 'to', 'search'].filter(
        (key) => filters.value[key] !== '',
      ).length,
  )
  const hasActiveFilters = computed(() => activeFilterCount.value > 0)

  async function fetchList() {
    loading.value = true
    try {
      const data = await expensesApi.list(cleanParams(filters.value))
      items.value = data.items
      total.value = data.total
      totalAmount.value = data.totalAmount
      listLoaded.value = true
    } catch (requestError) {
      ui.notify(requestError.message, 'error', 6000)
      items.value = []
      total.value = 0
      totalAmount.value = 0
    } finally {
      loading.value = false
    }
  }

  async function fetchOverview(params = overviewParams.value) {
    overviewParams.value = params
    overviewLoading.value = true
    try {
      overview.value = await statsApi.overview(cleanParams(params))
    } catch (requestError) {
      ui.notify(requestError.message, 'error', 6000)
      overview.value = null
    } finally {
      overviewLoading.value = false
    }
  }

  function setFilters(patch) {
    const resetsPage = Object.keys(patch).some((key) => key !== 'page')
    filters.value = { ...filters.value, ...patch, ...(resetsPage ? { page: 1 } : {}) }
  }

  const resetFilters = () => {
    filters.value = emptyFilters()
  }

  const filterBy = (patch) => {
    filters.value = { ...emptyFilters(), ...patch }
  }

  const create = (payload) => expensesApi.create(payload)

  async function update(id, payload) {
    const updated = await expensesApi.update(id, payload)
    items.value = items.value.map((item) => (item.id === id ? updated : item))
    return updated
  }

  async function remove(id) {
    await expensesApi.remove(id)
    await fetchList()
  }

  async function refreshAll() {
    const tasks = []
    if (listLoaded.value) tasks.push(fetchList())
    if (overview.value) tasks.push(fetchOverview())
    await Promise.all(tasks)
  }

  const reset = () => {
    items.value = []
    total.value = 0
    totalAmount.value = 0
    listLoaded.value = false
    overview.value = null
    filters.value = emptyFilters()
  }

  return {
    items,
    total,
    totalAmount,
    filters,
    loading,
    overview,
    overviewLoading,
    pageCount,
    hasActiveFilters,
    activeFilterCount,
    fetchList,
    fetchOverview,
    setFilters,
    resetFilters,
    filterBy,
    create,
    update,
    remove,
    refreshAll,
    reset,
  }
})
