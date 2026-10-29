<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import SectionCard from '@/components/SectionCard.vue'
import StatTile from '@/components/StatTile.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiEmpty from '@/components/ui/UiEmpty.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import ExpenseFormModal from '@/components/ExpenseFormModal.vue'
import { statsApi } from '@/api/index.js'
import { FUEL_GRADE_LABELS, useFormat } from '@/composables/useFormat.js'
import { useToast } from '@/composables/useToast.js'
import { useCatalogStore } from '@/stores/catalog.js'

const catalog = useCatalogStore()
const toast = useToast()
const {
  money,
  number,
  date,
  distance,
  consumption,
  perDistance,
  volumeUnit,
  consumptionUnit,
  fuelVolume,
  plural,
} = useFormat()

function fuelNote(item) {
  const review = item.review ?? {}

  if (review.partialOnly) {
    return `Ни одна заправка не отмечена «до полного» — по таким расход не посчитать.`
  }

  if (!item.segments.length) {
    const base = 'Расход посчитаем, когда будет две заправки до полного бака с указанным пробегом.'
    return review.ignoredFills
      ? `${base} Пока ${review.ignoredFills} ${plural(review.ignoredFills, ['заправка', 'заправки', 'заправок'])} без пробега.`
      : base
  }

  if (review.ignoredFills) {
    const n = review.ignoredFills
    return `${n} ${plural(n, ['заправка', 'заправки', 'заправок'])} без пробега — в расход ${plural(n, ['она не вошла', 'они не вошли', 'они не вошли'])}. Допишите пробег, и отрезок пересчитается.`
  }

  return ''
}

const hasSpread = (grade) =>
  Boolean(grade.minPrice && grade.maxPrice) && grade.maxPrice - grade.minPrice >= 0.01

const markAt = (grade) => {
  const share = (grade.pricePerUnit - grade.minPrice) / (grade.maxPrice - grade.minPrice)
  const clamped = Math.min(1, Math.max(0, Number.isFinite(share) ? share : 0.5))
  return `${(4 + clamped * 92).toFixed(1)}%`
}

const items = ref([])
const loading = ref(false)
const vehicleFilter = ref('')
const addOpen = ref(false)

const fuelCategoryId = computed(
  () => catalog.categories.find((category) => category.kind === 'fuel')?.id ?? '',
)

const visible = computed(() => items.value.filter((item) => item.fills > 0))

const isElectric = (item) => item.vehicle.fuelGrade === 'electric'

const totals = computed(() => {
  const list = visible.value
  const sum = (pick) => list.reduce((acc, item) => acc + pick(item), 0)
  return {
    liters: sum((item) => (isElectric(item) ? 0 : item.totalLiters)),
    energy: sum((item) => (isElectric(item) ? item.totalLiters : 0)),
    cost: sum((item) => item.totalCost),
    fills: sum((item) => item.fills),
    distance: sum((item) => item.distance),
  }
})

const overallGrade = computed(() =>
  visible.value.length > 0 && visible.value.every(isElectric) ? 'electric' : 'ai95',
)

const overallUnit = computed(() => consumptionUnit(overallGrade.value))

const overallConsumption = computed(() => {
  const list = visible.value.filter((item) => item.average !== null)
  if (list.length === 0) return null
  const liters = list.reduce((sum, item) => sum + item.liters, 0)
  const km = list.reduce((sum, item) => sum + item.distance, 0)
  return km > 0 ? (liters / km) * 100 : null
})

const barWidth = (segment, item) => {
  const max = Math.max(...item.segments.map((entry) => entry.consumption), 1)
  return `${Math.max(6, (segment.consumption / max) * 100)}%`
}

async function load() {
  loading.value = true
  try {
    items.value = await statsApi.fuel({ vehicleId: vehicleFilter.value || undefined })
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

watch(vehicleFilter, load)
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div class="page-head__text">
        <h1>Расход топлива</h1>
        <p class="page-head__subtitle">
          Средний расход считается между заправками «от полного до полного»
        </p>
      </div>
      <div class="page-head__actions">
        <UiSelect
          v-if="catalog.vehicles.length > 1"
          v-model="vehicleFilter"
          :options="catalog.vehicleOptions"
          placeholder="Весь транспорт"
        />
        <UiButton icon="plus" @click="addOpen = true">Добавить заправку</UiButton>
      </div>
    </header>

    <section class="grid grid--4">
      <StatTile
        label="Средний расход"
        icon="gauge"
        :value="overallConsumption ? consumption(overallConsumption, { grade: overallGrade }) : '—'"
        :hint="`По полным бакам, ${overallUnit}`"
        :loading="loading && !items.length"
      />
      <StatTile
        label="Всего залито"
        icon="fuel"
        :value="fuelVolume(totals)"
        tone="warning"
        :hint="`Заправок: ${number(totals.fills)}`"
        :loading="loading && !items.length"
      />
      <StatTile
        label="Затраты на топливо"
        icon="wallet"
        :value="money(totals.cost)"
        tone="info"
        :loading="loading && !items.length"
      />
      <StatTile
        label="Пробег по замерам"
        icon="chart"
        :value="distance(totals.distance)"
        tone="success"
        :loading="loading && !items.length"
      />
    </section>

    <SectionCard
      v-for="item in items"
      :key="item.vehicle.id"
      :title="item.vehicle.title"
      :subtitle="
        item.fills > 0
          ? `${number(item.fills)} ${plural(item.fills, ['заправка', 'заправки', 'заправок'])} · последняя ${date(item.lastFill)}`
          : 'Заправок пока нет'
      "
      icon="fuel"
    >
      <template #actions>
        <span v-if="item.average" class="badge-consumption">
          {{ consumption(item.average, { grade: item.vehicle.fuelGrade }) }}
        </span>
      </template>

      <div v-if="item.segments.length || item.grades?.length" class="fuel">
        <div class="fuel__summary">
          <div v-if="item.average" class="fuel__metric">
            <p class="fuel__metric-label">Средний расход</p>
            <p class="fuel__metric-value">{{ consumption(item.average, { grade: item.vehicle.fuelGrade }) }}</p>
          </div>
          <div v-if="item.best" class="fuel__metric">
            <p class="fuel__metric-label">Лучший результат</p>
            <p class="fuel__metric-value fuel__metric-value--good">
              {{ consumption(item.best.consumption, { grade: item.vehicle.fuelGrade }) }}
            </p>
          </div>
          <div v-if="item.worst" class="fuel__metric">
            <p class="fuel__metric-label">Худший результат</p>
            <p class="fuel__metric-value fuel__metric-value--bad">
              {{ consumption(item.worst.consumption, { grade: item.vehicle.fuelGrade }) }}
            </p>
          </div>
          <div v-if="item.costPerDistance" class="fuel__metric">
            <p class="fuel__metric-label">Цена километра</p>
            <p class="fuel__metric-value">{{ perDistance(item.costPerDistance) }}</p>
          </div>
          <div class="fuel__metric">
            <p class="fuel__metric-label">Средняя цена {{ volumeUnit(item.vehicle.fuelGrade) }}</p>
            <p class="fuel__metric-value">
              {{ item.avgPricePerLiter ? money(item.avgPricePerLiter, { decimals: 2 }) : '—' }}
            </p>
          </div>
        </div>

        <section v-if="item.grades?.length" class="prices">
          <header class="prices__head">
            <p class="prices__title">Цена {{ volumeUnit(item.vehicle.fuelGrade) }} по видам топлива</p>
            <p class="prices__note">Средняя взвешена по объему заправок</p>
          </header>

          <ul class="prices__list">
            <li v-for="grade in item.grades" :key="grade.grade" class="price">
              <div class="price__head">
                <span class="price__grade">{{ FUEL_GRADE_LABELS[grade.grade] ?? 'Без вида' }}</span>
                <span class="price__fills">
                  {{ grade.fills }} {{ plural(grade.fills, ['заправка', 'заправки', 'заправок']) }}
                </span>
              </div>

              <p class="price__value">
                {{ grade.pricePerUnit ? money(grade.pricePerUnit, { decimals: 2 }) : '—' }}
                <span class="price__unit">за {{ volumeUnit(grade.grade) }}</span>
              </p>

              <div v-if="hasSpread(grade)" class="price__range">
                <div class="price__track">
                  <span class="price__mark" :style="{ left: markAt(grade) }" />
                </div>
                <div class="price__ends">
                  <span>{{ money(grade.minPrice, { decimals: 2 }) }}</span>
                  <span>{{ money(grade.maxPrice, { decimals: 2 }) }}</span>
                </div>
              </div>
              <p v-else class="price__steady">Цена не менялась</p>

              <p class="price__volume">
                Залито {{ number(grade.liters, 0) }} {{ volumeUnit(grade.grade) }}
              </p>
            </li>
          </ul>
        </section>

        <p v-if="fuelNote(item)" class="fuel__pending">{{ fuelNote(item) }}</p>

        <ul v-if="item.segments.length" class="segments">
          <li v-for="segment in [...item.segments].reverse()" :key="segment.to.date" class="segment">
            <div class="segment__head">
              <span class="segment__dates">
                {{ date(segment.from.date) }} → {{ date(segment.to.date) }}
              </span>
              <span class="segment__value">
                {{ consumption(segment.consumption, { grade: item.vehicle.fuelGrade }) }}
              </span>
            </div>
            <div class="segment__track">
              <div class="segment__fill" :style="{ width: barWidth(segment, item) }" />
            </div>
            <p class="segment__meta">
              {{ distance(segment.distance) }} ·
              {{ number(segment.liters, 2) }} {{ volumeUnit(item.vehicle.fuelGrade) }} ·
              {{ money(segment.cost) }}
            </p>
          </li>
        </ul>
      </div>

      <UiEmpty
        v-else
        icon="fuel"
        title="Недостаточно данных"
        description="Нужны минимум две заправки до полного бака с указанным пробегом — тогда Карвис посчитает расход."
      >
        <UiButton icon="plus" @click="addOpen = true">Добавить заправку</UiButton>
      </UiEmpty>
    </SectionCard>

    <ExpenseFormModal
      :open="addOpen"
      :preset-category-id="fuelCategoryId"
      :preset-vehicle-id="vehicleFilter"
      @close="addOpen = false"
      @saved="load"
    />
  </div>
</template>

<style lang="scss" scoped>
.prices {
  display: flex;
  flex-direction: column;
  gap: $space-3;

  &__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 2px $space-3;
  }

  &__title {
    font-size: $font-size-base;
    font-weight: $weight-bold;
  }

  &__note {
    font-size: $font-size-sm;
    color: var(--text-soft);
  }

  &__list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: $space-3;
    list-style: none;
  }
}

.price {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  padding: $space-4;
  border-radius: $radius-lg;
  background: linear-gradient(150deg, #f7f3ff 0%, #ebe2fd 100%);

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $space-2;
  }

  &__grade {
    display: inline-flex;
    align-items: center;
    height: 24px;
    padding: 0 $space-3;
    border-radius: $radius-pill;
    background: rgba(255, 255, 255, 0.75);
    font-size: $font-size-sm;
    font-weight: $weight-bold;
    white-space: nowrap;
  }

  &__fills {
    font-size: $font-size-sm;
    color: var(--text-muted);
    white-space: nowrap;
  }

  &__value {
    font-size: $font-size-2xl;
    line-height: $line-xl;
    font-weight: $weight-bold;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  &__unit {
    margin-left: 2px;
    font-size: $font-size-sm;
    font-weight: $weight-medium;
    letter-spacing: 0;
    color: var(--text-muted);
  }

  &__range {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__track {
    position: relative;
    height: 6px;
    border-radius: $radius-pill;
    background: linear-gradient(90deg, #d9caff 0%, #a98ef2 100%);
  }

  &__mark {
    position: absolute;
    top: 50%;
    width: 14px;
    height: 14px;
    border: 3px solid var(--surface);
    border-radius: 50%;
    background: var(--dark);
    transform: translate(-50%, -50%);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  &__ends {
    display: flex;
    justify-content: space-between;
    gap: $space-2;
    font-size: $font-size-xs;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  &__steady {
    font-size: $font-size-sm;
    color: var(--text-muted);
  }

  &__volume {
    margin-top: auto;
    font-size: $font-size-sm;
    color: var(--text-muted);
  }
}

.badge-consumption {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 $space-3;
  border-radius: $radius-pill;
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-size: $font-size-xs;
  font-weight: $weight-semibold;
}

.fuel {
  display: flex;
  flex-direction: column;
  gap: $space-5;

  &__summary {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: $space-3;

    @include down($bp-lg) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    @include down($bp-sm) {
      grid-template-columns: repeat(2, minmax(0, 1fr));

      > :last-child:nth-child(odd) {
        grid-column: 1 / -1;
      }
    }
  }

  &__pending {
    font-size: $font-size-sm;
    line-height: $line-sm;
    color: var(--text-soft);
  }

  &__metric {
    padding: $space-3 $space-4;
    border: 1px solid var(--border);
    border-radius: $radius-md;
    background: var(--surface);
  }

  &__metric-label {
    @include eyebrow;
  }

  &__metric-value {
    font-size: $font-size-lg;
    line-height: $line-lg;
    font-weight: $weight-bold;

    &--good {
      color: var(--success-strong);
    }

    &--bad {
      color: var(--danger);
    }
  }
}

.segments {
  display: flex;
  flex-direction: column;
}

.segment {
  padding: $space-3 0;
  border-bottom: 1px solid var(--border);

  &:last-child {
    border-bottom: 0;
  }

  &__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: $space-3;
  }

  &__dates {
    font-size: $font-size-sm;
    color: var(--text-muted);
  }

  &__value {
    font-weight: $weight-bold;
    font-variant-numeric: tabular-nums;
  }

  &__track {
    height: 6px;
    margin: 6px 0 5px;
    border-radius: $radius-pill;
    background: var(--fill-gray-strong);
    overflow: hidden;
  }

  &__fill {
    height: 100%;
    border-radius: $radius-pill;
    background: linear-gradient(90deg, #d9caff 0%, #a98ef2 100%);
  }

  &__meta {
    font-size: $font-size-sm;
    color: var(--text-soft);
  }
}
</style>
