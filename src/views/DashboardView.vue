<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import ExpenseFormModal from '@/components/ExpenseFormModal.vue'
import MonthlyChart from '@/components/MonthlyChart.vue'
import SectionCard from '@/components/SectionCard.vue'
import StatTile from '@/components/StatTile.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiEmpty from '@/components/ui/UiEmpty.vue'
import { FUEL_GRADE_LABELS, useFormat } from '@/composables/useFormat.js'
import { useCatalogStore } from '@/stores/catalog.js'
import { useExpensesStore } from '@/stores/expenses.js'
import { useAuthStore } from '@/stores/auth.js'

const auth = useAuthStore()
const catalog = useCatalogStore()
const expenses = useExpensesStore()
const router = useRouter()
const { money, number, relativeDate, perDistance, distance, fuelVolume, plural } = useFormat()

const addOpen = ref(false)

const RANGES = [
  { months: 12, label: '12 месяцев', short: '12 мес' },
  { months: 6, label: '6 месяцев', short: '6 мес' },
  { months: 3, label: '3 месяца', short: '3 мес' },
]
const range = ref(RANGES[0])

const overview = computed(() => expenses.overview)
const loading = computed(() => expenses.overviewLoading && !expenses.overview)

const MONTHS_IN = [
  'январе',
  'феврале',
  'марте',
  'апреле',
  'мае',
  'июне',
  'июле',
  'августе',
  'сентябре',
  'октябре',
  'ноябре',
  'декабре',
]

const now = new Date()

const greeting = computed(() => {
  const hour = now.getHours()
  if (hour < 5) return 'Доброй ночи'
  if (hour < 12) return 'Доброе утро'
  if (hour < 18) return 'Добрый день'
  return 'Добрый вечер'
})

const summary = computed(() => {
  const totals = overview.value?.totals
  if (!totals) return 'Собираем сводку по дневнику…'

  const monthName = MONTHS_IN[now.getMonth()]
  const count = Number(totals.count ?? 0)
  const tail = `всего в дневнике ${number(count)} ${plural(count, ['запись', 'записи', 'записей'])}`

  if (!totals.thisMonth) {
    return count > 0
      ? `В ${monthName} трат пока нет — ${tail}.`
      : 'Дневник пока пуст: добавьте первый расход, и здесь появится сводка.'
  }

  const change = totals.monthChangePercent
  if (change === null || Math.abs(change) < 1) {
    return `В ${monthName} — ${money(totals.thisMonth)}, ${tail}.`
  }

  const prevName = MONTHS_IN[(now.getMonth() + 11) % 12]
  const direction = change > 0 ? 'больше' : 'меньше'
  return `В ${monthName} — ${money(totals.thisMonth)}, это на ${Math.abs(change).toFixed(
    0,
  )}% ${direction}, чем в ${prevName}.`
})

const fuelHint = computed(() => {
  const fuel = overview.value?.fuel
  if (!fuel || (!fuel.liters && !fuel.energy)) return 'Заправок пока нет'

  const grades = (fuel.grades ?? []).filter((item) => item.pricePerUnit)
  if (grades.length === 0) return fuelVolume(fuel)

  const shown = grades
    .slice(0, 2)
    .map(
      (item) =>
        `${FUEL_GRADE_LABELS[item.grade] ?? item.grade} по ${money(item.pricePerUnit, {
          decimals: 2,
        })}`,
    )
  const rest = grades.length - shown.length

  return `${fuelVolume(fuel)} · ${shown.join(', ')}${rest > 0 ? ` и еще ${rest}` : ''}`
})

const splits = computed(() => (overview.value?.byCategory ?? []).slice(0, 5))

function goToCategory(category) {
  expenses.filterBy({ categoryId: category.id })
  router.push({ name: 'expenses' })
}

function goToMonth(bar) {
  const [year, month] = bar.month.split('-')
  const lastDay = new Date(Number(year), Number(month), 0).getDate()
  expenses.filterBy({ from: `${bar.month}-01`, to: `${bar.month}-${lastDay}` })
  router.push({ name: 'expenses' })
}

const load = () =>
  expenses.fetchOverview({ months: range.value.months })

onMounted(load)
watch(range, load)
</script>

<template>
  <div class="dash">
    <header class="hello">
      <div class="hello__text">
        <h1 class="hello__title">{{ greeting }}, {{ auth.user?.login }}</h1>
        <p class="hello__summary">{{ summary }}</p>
      </div>
      <div class="hello__actions">
        <UiButton variant="ghost" icon="chart" @click="router.push({ name: 'reports' })">
          Отчеты
        </UiButton>
        <UiButton icon="plus" @click="addOpen = true">Добавить расход</UiButton>
      </div>
    </header>

    <RouterLink
      v-if="!catalog.loading && catalog.vehicles.length === 0"
      :to="{ name: 'vehicles' }"
      class="onboarding"
    >
      <span class="onboarding__icon"><AppIcon name="car" :size="22" /></span>
      <span class="onboarding__text">
        <b class="onboarding__title">Добавьте транспорт в гараж</b>
        <span class="onboarding__hint">
          Марка, модель и текущий пробег — этого хватит, чтобы считать расход и стоимость
          километра.
        </span>
      </span>
      <span class="onboarding__action">
        В гараж
        <AppIcon name="chevron-right" :size="16" />
      </span>
    </RouterLink>

    <section class="tiles">
      <StatTile
        label="Траты за месяц"
        icon="calendar"
        :value="money(overview?.totals?.thisMonth ?? 0)"
        fill="lime"
        highlight
        :change="overview?.totals?.monthChangePercent ?? null"
        :hint="`Прошлый месяц: ${money(overview?.totals?.prevMonth ?? 0)}`"
        :loading="loading"
      />
      <StatTile
        label="Всего учтено"
        icon="wallet"
        :value="money(overview?.totals?.total ?? 0)"
        fill="periwinkle"
        :hint="`С начала года: ${money(overview?.totals?.thisYear ?? 0)}`"
        :loading="loading"
      />
      <StatTile
        label="Средний чек"
        icon="receipt"
        :value="money(overview?.totals?.average ?? 0)"
        fill="lavender"
        :hint="overview?.totals?.biggest ? `Максимум: ${money(overview.totals.biggest)}` : ''"
        :loading="loading"
      />
      <StatTile
        label="Топливо за период"
        icon="fuel"
        :value="money(overview?.fuel?.fuelCost ?? 0)"
        fill="mint"
        :hint="fuelHint"
        :loading="loading"
      />
    </section>

    <div class="dash__grid">
      <div class="dash__main">

        <SectionCard
          class="dash__card dash__card--chart"
          title="Расходы по месяцам"
          :subtitle="`${money(overview?.totals?.thisYear ?? 0)} с начала года`"
        >
          <template #actions>
            <div class="range" role="group" aria-label="Период графика">
              <button
                v-for="option in RANGES"
                :key="option.months"
                type="button"
                class="range__option"
                :class="{ 'is-active': range.months === option.months }"
                :aria-pressed="range.months === option.months"
                @click="range = option"
              >
                <span class="range__long">{{ option.label }}</span>
                <span class="range__short">{{ option.short }}</span>
              </button>
            </div>
          </template>
          <MonthlyChart
            v-if="overview?.monthly?.length"
            :data="overview.monthly"
            @select="goToMonth"
          />
          <UiEmpty
            v-else
            icon="chart"
            title="Данных пока нет"
            description="Добавьте первый расход, и здесь появится график."
          />
        </SectionCard>

        <SectionCard class="dash__card dash__card--feed" title="Последние операции" :padded="false">
          <template #actions>
            <UiButton
              variant="ghost"
              size="sm"
              icon-right="chevron-right"
              @click="router.push({ name: 'expenses' })"
            >
              Все расходы
            </UiButton>
          </template>

          <ul v-if="overview?.recent?.length" class="feed">
            <li v-for="item in overview.recent" :key="item.id" class="feed__item">
              <span class="feed__dot" :style="{ background: item.categoryColor }" />
              <div class="feed__text">
                <p class="feed__title">
                  {{ item.categoryName }}
                  <span v-if="item.vendor" class="feed__vendor">· {{ item.vendor }}</span>
                </p>
                <p class="feed__meta">
                  {{ relativeDate(item.spentAt) }}
                  <template v-if="item.vehicleTitle"> · {{ item.vehicleTitle }}</template>
                </p>
              </div>
              <span class="feed__amount">{{ money(item.amount) }}</span>
            </li>
          </ul>

          <UiEmpty
            v-else
            icon="receipt"
            title="Расходов пока нет"
            description="Добавьте заправку или мойку — история начнется здесь."
          >
            <UiButton icon="plus" @click="addOpen = true">Добавить первый расход</UiButton>
          </UiEmpty>
        </SectionCard>
      </div>

      <aside class="dash__rail">
        <SectionCard class="dash__card dash__card--splits" title="По категориям">
          <template #actions>
            <UiButton
              variant="ghost"
              size="sm"
              icon-right="chevron-right"
              @click="router.push({ name: 'reports' })"
            >
              Отчет
            </UiButton>
          </template>

          <ul v-if="splits.length" class="splits">
            <li v-for="item in splits" :key="item.id">
              <button type="button" class="split" @click="goToCategory(item)">
                <span class="split__head">
                  <span class="split__name">{{ item.name }}</span>
                  <span class="split__value">{{ money(item.total, { compact: true }) }}</span>
                </span>
                <span class="split__track">
                  <span
                    class="split__fill"
                    :style="{ width: `${Math.max(2, item.share)}%`, background: item.color }"
                  />
                </span>
                <span class="split__meta">
                  {{ number(item.share, 0) }}% ·
                  {{ number(item.count) }}
                  {{ plural(Number(item.count), ['запись', 'записи', 'записей']) }}
                </span>
              </button>
            </li>
          </ul>

          <UiEmpty
            v-else
            icon="pie"
            title="Нечего разделять"
            description="Категории появятся здесь, когда в них будут расходы."
          />
        </SectionCard>

        <SectionCard
          v-if="overview?.fuel?.distance"
          class="dash__card dash__card--mileage"
          title="Пробег за период"
        >
          <div class="mileage">
            <p class="mileage__value">{{ distance(overview.fuel.distance) }}</p>
            <p class="mileage__hint">
              Стоимость пути: {{ perDistance(overview.fuel.costPerDistance) }}
            </p>
          </div>
        </SectionCard>
      </aside>
    </div>

    <ExpenseFormModal :open="addOpen" @close="addOpen = false" />
  </div>
</template>

<style lang="scss" scoped>
.dash {
  display: flex;
  flex-direction: column;
  gap: $space-5;

  @include down($bp-sm) {
    gap: $space-4;
  }
}

.hello {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: $space-4;
  flex-wrap: wrap;
  padding: $space-2 0 0;

  &__text {
    display: flex;
    flex-direction: column;
    gap: $space-1;
    min-width: 0;
  }

  &__title {
    font-size: 30px;
    line-height: 36px;
    font-weight: $weight-bold;
    letter-spacing: -0.03em;
  }

  &__summary {
    font-size: $font-size-md;
    line-height: $line-md;
    color: var(--text-muted);
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: $space-2;
    flex: none;
  }

  @include down($bp-md) {
    align-items: flex-start;

    &__title {
      font-size: $font-size-3xl;
      line-height: $line-xl;
    }

    &__summary {
      font-size: $font-size-base;
      line-height: $line-base;
    }

    &__actions {
      display: none;
    }
  }
}

.dash {
  &__grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 336px;
    align-items: start;
    gap: $space-5;
  }

  &__main,
  &__rail {
    display: flex;
    flex-direction: column;
    gap: $space-5;
    min-width: 0;
  }

  @include down($bp-lg) {
    &__grid {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: $space-5;
    }

    &__main,
    &__rail {
      display: contents;
    }

    &__card--chart {
      order: 1;
    }

    &__card--splits {
      order: 2;
    }

    &__card--feed {
      order: 3;
    }

    &__card--mileage {
      order: 4;
    }
  }

  @include down($bp-sm) {
    &__grid {
      gap: $space-4;
    }
  }
}

.tiles {
  display: grid;
  gap: $space-4;
  grid-template-columns: repeat(4, minmax(0, 1fr));

  @media (max-width: 1150px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @include down($bp-sm) {
    gap: $space-3;
  }
}

.onboarding {
  display: flex;
  align-items: center;
  gap: $space-4;
  padding: $space-4 $space-5;
  border-radius: $radius-xl;
  background: linear-gradient(135deg, #f0fab4 0%, #d6ef6b 100%);
  color: var(--text);

  &:hover {
    text-decoration: none;

    .onboarding__action {
      gap: $space-2;
    }
  }

  &__icon {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    flex: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.72);
  }

  &__text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__title {
    font-size: $font-size-lg;
    line-height: $line-md;
    font-weight: $weight-bold;
    letter-spacing: -0.01em;
  }

  &__hint {
    font-size: $font-size-sm;
    line-height: $line-sm;
    color: rgba(26, 26, 26, 0.72);
  }

  &__action {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex: none;
    margin-left: auto;
    height: 36px;
    padding: 0 $space-4;
    border-radius: $radius-pill;
    background: var(--dark);
    color: var(--text-on-dark);
    font-size: $font-size-sm;
    font-weight: $weight-medium;
    white-space: nowrap;
    transition: gap 0.16s ease;
  }

  @include down($bp-sm) {
    align-items: flex-start;
    gap: $space-3;
    padding: $space-4;
    border-radius: $radius-lg;

    &__icon {
      width: 36px;
      height: 36px;
    }

    &__title {
      font-size: $font-size-base;
    }

    &__action {
      display: none;
    }
  }
}

.splits {
  display: flex;
  flex-direction: column;
  gap: $space-3;

  .split {
    display: flex;
    flex-direction: column;
    gap: 5px;
    width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--text);
    font-family: inherit;
    text-align: left;
    cursor: pointer;

    &:hover .split__name {
      text-decoration: underline;
    }
  }

  .split__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: $space-3;
  }

  .split__name {
    font-size: $font-size-base;
    line-height: $line-base;
    font-weight: $weight-medium;
    min-width: 0;
    @include truncate;
  }

  .split__value {
    flex: none;
    font-size: $font-size-base;
    line-height: $line-base;
    font-weight: $weight-bold;
    font-variant-numeric: tabular-nums;
  }

  .split__track {
    display: block;
    height: 6px;
    border-radius: $radius-pill;
    background: var(--fill-gray-strong);
    overflow: hidden;
  }

  .split__fill {
    display: block;
    height: 100%;
    border-radius: inherit;
    transition: width 0.4s ease;
  }

  .split__meta {
    font-size: $font-size-sm;
    line-height: $line-sm;
    color: var(--text-soft);
  }
}

.mileage {
  &__value {
    font-size: $font-size-2xl;
    line-height: $line-xl;
    font-weight: $weight-bold;
    letter-spacing: -0.02em;
  }

  &__hint {
    font-size: $font-size-sm;
    line-height: $line-sm;
    color: var(--text-muted);
  }
}

.range {
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: $radius-pill;
  background: var(--fill-gray);

  &__option {
    padding: 0 $space-4;
    height: 30px;
    border: 0;
    border-radius: $radius-pill;
    background: transparent;
    color: var(--text-muted);
    font-family: inherit;
    font-size: $font-size-sm;
    font-weight: $weight-medium;
    white-space: nowrap;
    cursor: pointer;

    &:hover {
      color: var(--text);
    }

    &.is-active {
      background: var(--dark);
      color: var(--text-on-dark);
    }
  }

  &__short {
    display: none;
  }

  @include down($bp-sm) {
    &__option {
      padding: 0 $space-3;
    }

    &__long {
      display: none;
    }

    &__short {
      display: inline;
    }
  }
}

.feed {
  &__item {
    display: flex;
    align-items: center;
    gap: $space-4;
    padding: $space-3 $space-5;
    border-bottom: 1px solid var(--border);

    @include down($bp-sm) {
      gap: $space-3;
      padding: $space-3 $space-4;
    }

    &:last-child {
      border-bottom: 0;
    }

    &:hover {
      background: var(--surface-2);
    }
  }

  &__dot {
    width: 8px;
    height: 8px;
    flex: none;
    border-radius: 50%;
  }

  &__text {
    flex: 1;
    min-width: 0;
  }

  &__title {
    font-size: $font-size-base;
    font-weight: $weight-semibold;
    @include truncate;
  }

  &__vendor {
    font-weight: $weight-medium;
    color: var(--text-muted);
  }

  &__meta {
    font-size: $font-size-sm;
    color: var(--text-soft);
  }

  &__amount {
    font-weight: $weight-bold;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
}
</style>
