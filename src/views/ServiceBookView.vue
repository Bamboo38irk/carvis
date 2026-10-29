<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLogo from '@/components/AppLogo.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { expensesApi, statsApi } from '@/api/index.js'
import { FUEL_GRADE_LABELS, toIsoDate, useFormat } from '@/composables/useFormat.js'
import { useToast } from '@/composables/useToast.js'
import { useCatalogStore } from '@/stores/catalog.js'

const catalog = useCatalogStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const { money, number, date, distance, volumeUnit } = useFormat()

const loading = ref(true)
const expenses = ref([])
const fuel = ref(null)

const vehicleId = computed(() => String(route.params.id))
const vehicle = computed(
  () => catalog.vehicles.find((item) => item.id === vehicleId.value) ?? null,
)

const generatedAt = toIsoDate()

const printSheet = () => window.print()

const totals = computed(() => {
  const list = expenses.value
  const sum = list.reduce((acc, item) => acc + Number(item.amount), 0)
  const byCategory = new Map()

  for (const item of list) {
    const key = item.category.name
    byCategory.set(key, (byCategory.get(key) ?? 0) + Number(item.amount))
  }

  return {
    sum,
    count: list.length,
    categories: [...byCategory.entries()].sort((a, b) => b[1] - a[1]),
  }
})

const serviceRecords = computed(() =>
  expenses.value
    .filter((item) => item.category.kind !== 'fuel')
    .sort((a, b) => (a.spentAt < b.spentAt ? 1 : -1)),
)

const fuelRecords = computed(() =>
  expenses.value.filter((item) => item.category.kind === 'fuel' && item.liters),
)

async function load() {
  loading.value = true
  try {
    const [list, fuelData] = await Promise.all([
      expensesApi.list({ vehicleId: vehicleId.value, pageSize: 100, sort: 'spent_at', order: 'desc' }),
      statsApi.fuel({ vehicleId: vehicleId.value }),
    ])

    expenses.value = list.items
    fuel.value = fuelData.find((item) => item.vehicle.id === vehicleId.value) ?? null
  } catch (error) {
    toast.error(error.message)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await catalog.load()
  await load()
})
</script>

<template>
  <div class="book">
    <div class="book__bar no-print">
      <UiButton variant="ghost" icon="car" @click="router.push({ name: 'vehicles' })">
        В гараж
      </UiButton>
      <UiButton icon="print" @click="printSheet">
        Печать или PDF
      </UiButton>
    </div>

    <article v-if="!loading && vehicle" class="sheet">
      <header class="sheet__head">
        <div>
          <p class="sheet__eyebrow">Сервисная книжка</p>
          <h1 class="sheet__title">{{ vehicle.title }}</h1>
          <p class="sheet__meta">
            <template v-if="vehicle.year">{{ vehicle.year }} · </template>
            <template v-if="vehicle.plate">{{ vehicle.plate }} · </template>
            <template v-if="vehicle.vin">VIN {{ vehicle.vin }} · </template>
            пробег {{ distance(vehicle.odometer) }}
          </p>
        </div>
        <AppLogo :mark-size="20" />
      </header>

      <section class="sheet__summary">
        <div>
          <p class="sheet__label">Всего расходов</p>
          <p class="sheet__value">{{ money(totals.sum) }}</p>
        </div>
        <div>
          <p class="sheet__label">Записей</p>
          <p class="sheet__value">{{ number(totals.count) }}</p>
        </div>
        <div v-if="fuel && fuel.average">
          <p class="sheet__label">Средний расход</p>
          <p class="sheet__value">{{ number(fuel.average, 1) }}</p>
        </div>
        <div v-if="vehicle.purchaseDate">
          <p class="sheet__label">В собственности с</p>
          <p class="sheet__value">{{ date(vehicle.purchaseDate) }}</p>
        </div>
      </section>

      <section class="sheet__block">
        <h2 class="sheet__block-title">История обслуживания</h2>
        <div v-if="serviceRecords.length" class="sheet__scroll">
          <table class="sheet__table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Пробег</th>
              <th>Работы</th>
              <th>Место</th>
              <th class="num">Сумма</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in serviceRecords" :key="item.id">
              <td>{{ date(item.spentAt) }}</td>
              <td>{{ item.odometer ? distance(item.odometer) : '—' }}</td>
              <td>
                {{ item.category.name }}
                <template v-if="item.note"> — {{ item.note }}</template>
                <ul v-if="item.items?.length" class="works">
                  <li v-for="line in item.items" :key="line.id">
                    {{ line.name }}
                    <template v-if="line.quantity !== 1"> × {{ line.quantity }}</template>
                    <span v-if="line.partCode" class="works__code">{{ line.partCode }}</span>
                    <span class="works__sum">{{ money(line.total) }}</span>
                  </li>
                </ul>
              </td>
              <td>{{ item.vendor || '—' }}</td>
              <td class="num">{{ money(item.amount) }}</td>
            </tr>
          </tbody>
          </table>
        </div>
        <p v-else class="sheet__empty">Записей об обслуживании пока нет.</p>
      </section>

      <section v-if="fuelRecords.length" class="sheet__block">
        <h2 class="sheet__block-title">Заправки</h2>
        <div class="sheet__scroll">
          <table class="sheet__table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Пробег</th>
              <th>Объем</th>
              <th>Топливо</th>
              <th class="num">Сумма</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in fuelRecords.slice(0, 40)" :key="item.id">
              <td>{{ date(item.spentAt) }}</td>
              <td>{{ item.odometer ? distance(item.odometer) : '—' }}</td>
              <td>{{ number(item.liters, 2) }} {{ volumeUnit(item.fuelGrade) }}</td>
              <td>{{ item.fuelGrade ? FUEL_GRADE_LABELS[item.fuelGrade] : '—' }}</td>
              <td class="num">{{ money(item.amount) }}</td>
            </tr>
          </tbody>
          </table>
        </div>
      </section>

      <footer class="sheet__foot">
        <p>
          Документ сформирован {{ date(generatedAt) }} в Карвисе. Данные внесены владельцем
          и не проходили независимую проверку.
        </p>
        <p v-for="(row, index) in totals.categories.slice(0, 6)" :key="index" class="sheet__cat">
          {{ row[0] }}: {{ money(row[1]) }}
        </p>
      </footer>
    </article>

    <p v-else-if="!loading" class="book__missing">Транспорт не найден.</p>
  </div>
</template>

<style lang="scss" scoped>
.works {
  margin-top: 4px;
  padding-left: 14px;
  list-style: disc outside;
  font-size: $font-size-sm;
  color: var(--text-muted);

  &__code {
    margin-left: 6px;
    font-variant-numeric: tabular-nums;
    color: var(--text-soft);
  }

  &__sum {
    margin-left: 6px;
    font-variant-numeric: tabular-nums;
  }
}

.book {
  display: flex;
  flex-direction: column;
  gap: $space-5;

  &__bar {
    display: flex;
    justify-content: space-between;
    gap: $space-3;
  }

  &__missing {
    color: var(--text-muted);
  }
}

.sheet {
  padding: $space-8;
  background: var(--surface);
  border-radius: $radius-lg;

  &__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: $space-4;
    padding-bottom: $space-5;
    border-bottom: 2px solid var(--text);
  }

  &__eyebrow {
    @include eyebrow;
  }

  &__title {
    font-size: $font-size-display;
    line-height: $line-display;
    font-weight: $weight-bold;
    letter-spacing: -0.02em;
  }

  &__meta {
    margin-top: 2px;
    color: var(--text-muted);
    font-size: $font-size-base;
  }

  &__summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: $space-4;
    padding: $space-5 0;
    border-bottom: 1px solid var(--border);
  }

  &__label {
    @include eyebrow;
  }

  &__value {
    font-size: $font-size-xl;
    font-weight: $weight-medium;
    font-variant-numeric: tabular-nums;
  }

  &__block {
    margin-top: $space-6;
  }

  &__block-title {
    margin-bottom: $space-3;
    font-size: $font-size-lg;
    font-weight: $weight-bold;
  }

  &__scroll {
    overflow-x: auto;
    @include scrollbar;

    @media print {
      overflow-x: visible;
    }
  }

  &__table {
    width: 100%;
    min-width: 460px;
    border-collapse: collapse;
    font-size: $font-size-base;

    th,
    td {
      padding: 8px 10px;
      text-align: left;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }

    th {
      @include eyebrow;
      white-space: nowrap;
    }

    .num {
      text-align: right;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
  }

  &__empty {
    color: var(--text-muted);
  }

  &__foot {
    margin-top: $space-6;
    padding-top: $space-4;
    border-top: 1px solid var(--border);
    color: var(--text-muted);
    font-size: $font-size-sm;
    line-height: $line-sm;
  }

  &__cat {
    display: inline-block;
    margin-right: $space-4;
  }
}

@media print {
  .book {
    gap: 0;
  }

  .sheet {
    padding: 0;
    border-radius: 0;
    background: #fff;
  }

  .sheet__block {
    break-inside: auto;
    margin-top: $space-5;
  }

  .sheet__block-title {
    break-after: avoid;
  }

  .sheet__scroll {
    overflow: visible;
  }

  .sheet__table {
    min-width: 0;
    font-size: 11px;

    th,
    td {
      padding: 5px 8px;
    }
  }

  .sheet__summary {
    padding: $space-4 0;
  }

  .sheet__foot {
    break-inside: avoid;
    margin-top: $space-5;
  }

  .sheet__cat {
    margin-right: $space-3;
    font-size: 11px;
  }
}
</style>
