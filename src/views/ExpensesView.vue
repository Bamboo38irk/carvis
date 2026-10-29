<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import ExpenseFormModal from '@/components/ExpenseFormModal.vue'
import ExpenseTable from '@/components/ExpenseTable.vue'
import FilterSheet from '@/components/FilterSheet.vue'
import SectionCard from '@/components/SectionCard.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiConfirm from '@/components/ui/UiConfirm.vue'
import UiEmpty from '@/components/ui/UiEmpty.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import { useDownload } from '@/composables/useDownload.js'
import { useFormat } from '@/composables/useFormat.js'
import { useToast } from '@/composables/useToast.js'
import { useCatalogStore } from '@/stores/catalog.js'
import { useExpensesStore } from '@/stores/expenses.js'

const expenses = useExpensesStore()
const catalog = useCatalogStore()
const toast = useToast()
const route = useRoute()
const { money, number, date, plural } = useFormat()
const { downloadExport } = useDownload()

const formOpen = ref(false)
const editing = ref(null)
const pendingDelete = ref(null)
const deleting = ref(false)
const exporting = ref('')

const SORT_OPTIONS = [
  { value: 'spent_at', label: 'Сортировка: дата' },
  { value: 'amount', label: 'Сортировка: сумма' },
  { value: 'created_at', label: 'Сортировка: добавлено' },
]

const ORDER_OPTIONS = [
  { value: 'desc', label: 'Сначала новые' },
  { value: 'asc', label: 'Сначала старые' },
]

const categoryOptions = computed(() =>
  catalog.categories.map((category) => ({ value: category.id, label: category.name })),
)

const filters = computed(() => expenses.filters)

const rangeLabel = computed(() => {
  const { from, to } = filters.value
  if (from && to) return `${date(from)} — ${date(to)}`
  if (from) return `с ${date(from)}`
  if (to) return `до ${date(to)}`
  return 'все время'
})

function patch(key, value) {
  expenses.setFilters({ [key]: value })
  expenses.fetchList()
}

function goToPage(page) {
  expenses.setFilters({ page })
  expenses.fetchList()
}

function openCreate() {
  editing.value = null
  formOpen.value = true
}

function openEdit(expense) {
  editing.value = expense
  formOpen.value = true
}

function clearFilters() {
  expenses.resetFilters()
  expenses.fetchList()
}

async function confirmDelete() {
  deleting.value = true
  try {
    await expenses.remove(pendingDelete.value.id)
    await catalog.refresh()
    toast.success('Расход удален')
    pendingDelete.value = null
  } catch (error) {
    toast.error(error.message)
  } finally {
    deleting.value = false
  }
}

async function exportData(format) {
  exporting.value = format
  try {
    await downloadExport({
      format,
      vehicleId: filters.value.vehicleId || undefined,
      from: filters.value.from || undefined,
      to: filters.value.to || undefined,
    })
    toast.success(format === 'xlsx' ? 'Excel-файл готов' : 'CSV-файл готов')
  } catch (error) {
    toast.error(error.message)
  } finally {
    exporting.value = ''
  }
}

onMounted(() => {
  if (route.query.search) {
    expenses.setFilters({ search: String(route.query.search) })
  }
  expenses.fetchList()
})
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div class="page-head__text">
        <h1>Все расходы</h1>
        <p class="page-head__subtitle">
          {{ number(expenses.total) }} {{ plural(expenses.total, ['запись', 'записи', 'записей']) }} ·
          {{ money(expenses.totalAmount) }} за
          {{ rangeLabel }}
        </p>
      </div>
      <div class="page-head__actions">
        <UiButton
          variant="secondary"
          icon="download"
          :loading="exporting === 'csv'"
          @click="exportData('csv')"
        >
          CSV
        </UiButton>
        <UiButton
          variant="secondary"
          icon="download"
          :loading="exporting === 'xlsx'"
          @click="exportData('xlsx')"
        >
          Excel
        </UiButton>
        <UiButton icon="plus" @click="openCreate">Добавить расход</UiButton>
      </div>
    </header>

    <FilterSheet
      :active="expenses.activeFilterCount"
      :hint="expenses.hasActiveFilters ? '' : 'Показаны все записи'"
      @reset="clearFilters"
    >
      <UiInput
        class="filters__search"
        :model-value="filters.search"
        icon="search"
        placeholder="Поиск по месту, заметке или категории"
        @update:model-value="patch('search', $event)"
      />
      <UiSelect
        :model-value="filters.categoryId"
        :options="categoryOptions"
        placeholder="Все категории"
        @update:model-value="patch('categoryId', $event)"
      />
      <UiSelect
        :model-value="filters.vehicleId"
        :options="catalog.vehicleOptions"
        placeholder="Весь транспорт"
        @update:model-value="patch('vehicleId', $event)"
      />
      <UiInput :model-value="filters.from" type="date" @update:model-value="patch('from', $event)" />
      <UiInput :model-value="filters.to" type="date" @update:model-value="patch('to', $event)" />
      <UiSelect
        class="filters__wide"
        :model-value="filters.sort"
        :options="SORT_OPTIONS"
        @update:model-value="patch('sort', $event)"
      />
      <UiSelect
        class="filters__wide"
        :model-value="filters.order"
        :options="ORDER_OPTIONS"
        @update:model-value="patch('order', $event)"
      />
    </FilterSheet>

    <SectionCard :padded="false">
      <ExpenseTable
        v-if="expenses.loading || expenses.items.length"
        :items="expenses.items"
        :loading="expenses.loading && !expenses.items.length"
        @edit="openEdit"
        @remove="pendingDelete = $event"
      />

      <UiEmpty
        v-else
        icon="receipt"
        :title="expenses.hasActiveFilters ? 'Ничего не найдено' : 'Расходов пока нет'"
        :description="
          expenses.hasActiveFilters
            ? 'Попробуйте расширить период или сбросить фильтры.'
            : 'Каждая заправка, мойка и ремонт появятся в этой таблице.'
        "
      >
        <UiButton v-if="expenses.hasActiveFilters" variant="secondary" @click="clearFilters">
          Сбросить фильтры
        </UiButton>
        <UiButton v-else icon="plus" @click="openCreate">Добавить расход</UiButton>
      </UiEmpty>

      <div v-if="expenses.pageCount > 1" class="pager">
        <UiButton
          variant="secondary"
          size="sm"
          icon="chevron-left"
          :disabled="filters.page === 1"
          @click="goToPage(filters.page - 1)"
        >
          Назад
        </UiButton>
        <span class="pager__info">
          <AppIcon name="list" :size="14" />
          {{ filters.page }} / {{ expenses.pageCount }}
        </span>
        <UiButton
          variant="secondary"
          size="sm"
          icon-right="chevron-right"
          :disabled="filters.page >= expenses.pageCount"
          @click="goToPage(filters.page + 1)"
        >
          Вперед
        </UiButton>
      </div>
    </SectionCard>

    <ExpenseFormModal :open="formOpen" :expense="editing" @close="formOpen = false" />

    <UiConfirm
      :open="Boolean(pendingDelete)"
      title="Удалить запись?"
      :message="
        pendingDelete
          ? `${pendingDelete.category.name} на ${money(pendingDelete.amount)} от ${date(pendingDelete.spentAt)} будет удалена безвозвратно.`
          : ''
      "
      :loading="deleting"
      @cancel="pendingDelete = null"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style lang="scss" scoped>
.filters__search {
  @include form-row-wide;
}

.filters__wide {
  @include down($bp-sm) {
    @include form-row-wide;
  }
}

.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-3;
  padding: $space-4 $space-6;
  border-top: 1px solid var(--border);

  &__info {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--text-muted);
    font-size: $font-size-sm;
    font-variant-numeric: tabular-nums;
  }
}
</style>
