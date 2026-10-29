<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import CategoryDonut from '@/components/CategoryDonut.vue'
import MonthlyChart from '@/components/MonthlyChart.vue'
import FilterSheet from '@/components/FilterSheet.vue'
import SectionCard from '@/components/SectionCard.vue'
import StatTile from '@/components/StatTile.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiEmpty from '@/components/ui/UiEmpty.vue'
import UiField from '@/components/ui/UiField.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import { useDownload } from '@/composables/useDownload.js'
import { FUEL_GRADE_LABELS, toIsoDate, useFormat } from '@/composables/useFormat.js'
import { useToast } from '@/composables/useToast.js'
import { useCatalogStore } from '@/stores/catalog.js'
import { useExpensesStore } from '@/stores/expenses.js'

const catalog = useCatalogStore()
const expenses = useExpensesStore()
const toast = useToast()
const { money, number, date, distance, perDistance, monthFull, fuelVolume } = useFormat()
const { downloadExport } = useDownload()

const PRESETS = [
  { key: 'ytd', label: 'С начала года' },
  { key: '12m', label: '12 месяцев' },
  { key: '3m', label: '3 месяца' },
  { key: 'all', label: 'Все время' },
]

const range = ref({ from: '', to: '' })
const vehicleId = ref('')
const activePreset = ref('12m')
const exporting = ref('')

const periodLabel = computed(
  () => PRESETS.find((preset) => preset.key === activePreset.value)?.label ?? 'свой период',
)

const vehicleLabel = computed(() => {
  if (!vehicleId.value) return 'весь транспорт'
  return catalog.vehicleOptions.find((option) => option.value === vehicleId.value)?.label ?? ''
})

const filterHint = computed(() => `${periodLabel.value} · ${vehicleLabel.value}`)

const activeFilters = computed(
  () => (vehicleId.value ? 1 : 0) + (activePreset.value !== '12m' ? 1 : 0),
)

function resetFilters() {
  vehicleId.value = ''
  applyPreset('12m')
}

const overview = computed(() => expenses.overview)

const fuelPriceHint = computed(() => {
  const grades = (overview.value?.fuel?.grades ?? []).filter((item) => item.pricePerUnit)
  if (grades.length === 0) return 'Заправок нет'

  const shown = grades
    .slice(0, 2)
    .map(
      (item) =>
        `${FUEL_GRADE_LABELS[item.grade] ?? item.grade} ${money(item.pricePerUnit, {
          decimals: 2,
        })}`,
    )
  const rest = grades.length - shown.length

  return `Средняя цена: ${shown.join(', ')}${rest > 0 ? ` и еще ${rest}` : ''}`
})
const loading = computed(() => expenses.overviewLoading && !expenses.overview)

const monthlyPie = computed(() =>
  (overview.value?.monthly ?? [])
    .filter((point) => point.total > 0)
    .map((point, index) => ({
      id: point.month,
      name: monthFull(point.month),
      total: point.total,
      count: point.count,
      share: point.share,
      icon: 'calendar',
      color: `hsl(${262 - index * 9} 70% ${58 + (index % 3) * 7}%)`,
    })),
)

const busiestMonth = computed(() => {
  if (!overview.value?.monthly?.length) return null
  return [...overview.value.monthly].sort((a, b) => b.total - a.total)[0]
})

function applyPreset(key) {
  activePreset.value = key
  const today = new Date()

  if (key === 'all') {
    range.value = { from: '', to: '' }
  } else if (key === 'ytd') {
    range.value = { from: `${today.getFullYear()}-01-01`, to: toIsoDate(today) }
  } else {
    const months = key === '3m' ? 3 : 12
    const from = new Date(today.getFullYear(), today.getMonth() - months + 1, 1)
    range.value = { from: toIsoDate(from), to: toIsoDate(today) }
  }
  load()
}

const load = () =>
  expenses.fetchOverview({
    vehicleId: vehicleId.value || undefined,
    from: range.value.from || undefined,
    to: range.value.to || undefined,
  })

async function exportData(format) {
  exporting.value = format
  try {
    await downloadExport({
      format,
      vehicleId: vehicleId.value || undefined,
      from: range.value.from || undefined,
      to: range.value.to || undefined,
    })
    toast.success(format === 'xlsx' ? 'Excel-файл готов' : 'CSV-файл готов')
  } catch (error) {
    toast.error(error.message)
  } finally {
    exporting.value = ''
  }
}

onMounted(async () => {
  await catalog.load()
  applyPreset('12m')
})

watch(vehicleId, load)
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div class="page-head__text">
        <h1>Отчеты</h1>
        <p class="page-head__subtitle">
          {{ overview ? `Проанализировано записей: ${number(overview.totals.count)}` : 'Считаем цифры' }}
        </p>
      </div>
      <div class="page-head__actions">
        <UiButton
          variant="secondary"
          icon="download"
          :loading="exporting === 'csv'"
          :disabled="!overview"
          @click="exportData('csv')"
        >
          CSV
        </UiButton>
        <UiButton
          variant="secondary"
          icon="download"
          :loading="exporting === 'xlsx'"
          :disabled="!overview"
          @click="exportData('xlsx')"
        >
          Excel
        </UiButton>
      </div>
    </header>

    <FilterSheet
      card
      label="Период"
      title="Период"
      :active="activeFilters"
      :hint="filterHint"
      @reset="resetFilters"
    >
      <div class="report-filters">
        <div class="report-filters__presets">
          <button
            v-for="preset in PRESETS"
            :key="preset.key"
            type="button"
            class="preset"
            :class="{ 'is-active': activePreset === preset.key }"
            @click="applyPreset(preset.key)"
          >
            {{ preset.label }}
          </button>
        </div>

        <div class="report-filters__dates">
          <UiField label="Начиная" input-id="report-from">
            <UiInput
              id="report-from"
              v-model="range.from"
              type="date"
              @update:model-value="((activePreset = 'custom'), load())"
            />
          </UiField>
          <UiField label="Заканчивая" input-id="report-to">
            <UiInput
              id="report-to"
              v-model="range.to"
              type="date"
              @update:model-value="((activePreset = 'custom'), load())"
            />
          </UiField>
          <UiField label="Транспорт" input-id="report-vehicle">
            <UiSelect
              id="report-vehicle"
              v-model="vehicleId"
              :options="catalog.vehicleOptions"
              placeholder="Весь транспорт"
            />
          </UiField>
        </div>
      </div>
    </FilterSheet>

    <section class="grid grid--4">
      <StatTile
        label="Всего за период"
        icon="wallet"
        :value="money(overview?.totals?.total ?? 0)"
        :hint="
          overview?.totals?.firstDate
            ? `${date(overview.totals.firstDate)} — ${date(overview.totals.lastDate)}`
            : 'Записей в диапазоне нет'
        "
        :loading="loading"
      />
      <StatTile
        label="Объем топлива"
        icon="fuel"
        :value="fuelVolume(overview?.fuel)"
        tone="warning"
        :hint="fuelPriceHint"
        :loading="loading"
      />
      <StatTile
        label="Пробег"
        icon="gauge"
        :value="distance(overview?.fuel?.distance ?? 0)"
        tone="info"
        :hint="`Стоимость пути ${perDistance(overview?.fuel?.costPerDistance)}`"
        :loading="loading"
      />
      <StatTile
        label="Самый дорогой месяц"
        icon="trending-up"
        :value="busiestMonth ? money(busiestMonth.total) : '—'"
        tone="success"
        :hint="busiestMonth ? monthFull(busiestMonth.month) : ''"
        :loading="loading"
      />
    </section>

    <SectionCard title="Расходы по месяцам">
      <MonthlyChart v-if="overview?.monthly?.length" :data="overview.monthly" />
      <UiEmpty
        v-else
        icon="chart"
        title="Нет данных для графика"
        description="Расширьте период или добавьте расходы."
      />
    </SectionCard>

    <section class="grid grid--2">
      <SectionCard title="Круговая по категориям">
        <CategoryDonut
          v-if="overview?.byCategory?.length"
          :items="overview.byCategory"
          :total="overview.totals.total"
        />
        <UiEmpty v-else icon="pie" title="Нет данных за период" />
      </SectionCard>

      <SectionCard title="Круговая по месяцам">
        <CategoryDonut
          v-if="monthlyPie.length"
          :items="monthlyPie"
          :total="overview.totals.total"
        />
        <UiEmpty v-else icon="calendar" title="Нет данных за период" />
      </SectionCard>
    </section>

    <SectionCard title="Рейтинг категорий" :padded="false">
      <ul v-if="overview?.byCategory?.length" class="ranking">
        <li v-for="(row, index) in overview.byCategory" :key="row.id" class="ranking__row">
          <span class="ranking__index">{{ index + 1 }}</span>
          <span class="ranking__dot" :style="{ background: row.color }" />
          <span class="ranking__name">{{ row.name }}</span>
          <span class="ranking__count">{{ number(row.count) }} шт.</span>
          <span class="ranking__total">{{ money(row.total) }}</span>
        </li>
      </ul>
      <UiEmpty v-else icon="list" title="Нет данных" />
    </SectionCard>

    <RouterLink :to="{ name: 'tools' }" class="next-tools">
      <span class="next-tools__icon"><AppIcon name="pie" :size="18" /></span>
      <span class="next-tools__text">
        <span class="next-tools__title">Калькуляторы</span>
        <span class="next-tools__hint">
          Прикинуть поездку, расход и стоимость километра заранее
        </span>
      </span>
      <AppIcon name="chevron-right" :size="16" />
    </RouterLink>
  </div>
</template>

<style lang="scss" scoped>
.next-tools {
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: $space-4 $space-5;
  border: 1px solid var(--border);
  border-radius: $radius-lg;
  background: var(--surface);
  color: var(--text);
  text-decoration: none;
  transition: border-color 0.15s ease;

  &:hover {
    border-color: var(--border-strong);
  }

  &__icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 36px;
    height: 36px;
    border-radius: $radius-sm;
    background: var(--lime-soft);
    color: var(--lime-ink);
  }

  &__text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }

  &__title {
    font-size: $font-size-base;
    font-weight: $weight-bold;
  }

  &__hint {
    font-size: $font-size-sm;
    line-height: $line-sm;
    color: var(--text-muted);
  }

  svg:last-child {
    flex: none;
    color: var(--text-soft);
  }
}

.report-filters {
  display: flex;
  flex-direction: column;
  gap: $space-5;

  &__presets {
    display: flex;
    flex-wrap: wrap;
    gap: $space-2;
  }

  &__dates {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: $space-4;
  }
}

.preset {
  padding: 7px $space-4;
  border: 1px solid var(--border-strong);
  border-radius: $radius-pill;
  background: var(--surface);
  color: var(--text-muted);
  font-size: $font-size-sm;
  font-weight: $weight-medium;
  cursor: pointer;

  &:hover {
    color: var(--text);
  }

  &.is-active {
    border-color: var(--accent);
    background: var(--accent-soft);
    color: var(--accent);
  }
}

.ranking {
  &__row {
    display: grid;
    grid-template-columns: 24px 10px minmax(0, 1fr) auto auto;
    align-items: center;
    gap: $space-3;
    padding: $space-3 $space-6;
    border-bottom: 1px solid var(--border);

    &:last-child {
      border-bottom: 0;
    }
  }

  &__index {
    color: var(--text-soft);
    font-size: $font-size-sm;
    font-variant-numeric: tabular-nums;
  }

  &__dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  &__name {
    @include truncate;
  }

  &__count {
    color: var(--text-soft);
    font-size: $font-size-sm;
  }

  &__total {
    font-weight: $weight-medium;
    font-variant-numeric: tabular-nums;
  }
}
</style>
