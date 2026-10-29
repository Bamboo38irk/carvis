<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import UiInput from '@/components/ui/UiInput.vue'
import { passportsApi } from '@/api/index.js'
import { VEHICLE_TYPE_LABELS, parseDay, plural } from '@/composables/useFormat.js'

const route = useRoute()

const print = () => window.print()

const data = ref(null)
const pin = ref('')
const pinRequired = ref(false)
const error = ref('')
const loading = ref(true)

const money = (value) =>
  value === null || value === undefined
    ? '—'
    : new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: data.value?.owner.currency ?? 'RUB',
        maximumFractionDigits: 0,
      }).format(value)

const number = (value, decimals = 0) =>
  new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(value ?? 0))

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }).format(
        parseDay(value),
      )
    : '—'

const title = computed(() => {
  const vehicle = data.value?.vehicle
  if (!vehicle) return 'Предпродажный паспорт'
  return [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ') || vehicle.title
})

const grouped = computed(() => {
  if (!data.value) return []
  const map = new Map()
  for (const record of data.value.history) {
    const year = String(record.spentAt).slice(0, 4)
    if (!map.has(year)) map.set(year, [])
    map.get(year).push(record)
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await passportsApi.read(route.params.token, pin.value || undefined)
    pinRequired.value = false
  } catch (requestError) {
    if (requestError.payload?.pinRequired) {
      pinRequired.value = true
      error.value = pin.value ? requestError.message : ''
    } else {
      error.value = requestError.message
    }
    data.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="passport">
    <p v-if="loading" class="passport__state">Загружаем историю обслуживания...</p>

    <div v-else-if="pinRequired" class="passport__pin">
      <span class="passport__pin-icon"><AppIcon name="lock" :size="20" /></span>
      <h1 class="passport__pin-title">Документ защищен PIN-кодом</h1>
      <p class="passport__pin-hint">Введите код, который дал владелец автомобиля.</p>
      <form class="passport__pin-form" @submit.prevent="load">
        <UiField :error="error" input-id="passport-pin-input">
          <UiInput
            id="passport-pin-input"
            v-model="pin"
            placeholder="PIN-код"
            :invalid="Boolean(error)"
          />
        </UiField>
        <UiButton type="submit" icon="check">Открыть</UiButton>
      </form>
    </div>

    <div v-else-if="error" class="passport__state passport__state--error">{{ error }}</div>

    <article v-else-if="data" class="doc">
      <header class="doc__head">
        <div class="doc__identity">
          <span class="doc__icon">
            <AppIcon :name="data.vehicle.vehicleType" :size="24" />
          </span>
          <div>
            <p class="doc__eyebrow">Предпродажный паспорт автомобиля</p>
            <h1 class="doc__title">{{ title }}</h1>
            <p class="doc__subtitle">
              {{ VEHICLE_TYPE_LABELS[data.vehicle.vehicleType] }}
              <template v-if="data.vehicle.plate"> · {{ data.vehicle.plate }}</template>
              · владелец {{ data.owner.login }}
            </p>
          </div>
        </div>
        <UiButton class="no-print" variant="secondary" icon="print" @click="print">
          Печать или PDF
        </UiButton>
      </header>

      <section class="doc__facts">
        <div class="fact">
          <p class="fact__label">Пробег</p>
          <p class="fact__value">{{ number(data.vehicle.odometer) }} км</p>
        </div>
        <div class="fact">
          <p class="fact__label">Топливо</p>
          <p class="fact__value">{{ data.vehicle.fuelGradeLabel }}</p>
        </div>
        <div class="fact">
          <p class="fact__label">Записей в истории</p>
          <p class="fact__value">{{ number(data.summary.recordsCount) }}</p>
        </div>
        <div class="fact">
          <p class="fact__label">История с</p>
          <p class="fact__value">{{ formatDate(data.summary.firstRecord) }}</p>
        </div>
        <div v-if="data.vehicle.purchaseDate" class="fact">
          <p class="fact__label">В собственности с</p>
          <p class="fact__value">{{ formatDate(data.vehicle.purchaseDate) }}</p>
        </div>
        <div v-if="data.vehicle.odometerAtPurchase !== null" class="fact">
          <p class="fact__label">Пробег при покупке</p>
          <p class="fact__value">{{ number(data.vehicle.odometerAtPurchase) }} км</p>
        </div>
        <div v-if="data.vehicle.vin" class="fact">
          <p class="fact__label">VIN</p>
          <p class="fact__value fact__value--vin">{{ data.vehicle.vin }}</p>
        </div>
        <div v-if="data.includeAmounts" class="fact">
          <p class="fact__label">Вложено в обслуживание</p>
          <p class="fact__value">{{ money(data.summary.total) }}</p>
        </div>
        <div class="fact">
          <p class="fact__label">Залито топлива</p>
          <p class="fact__value">{{ number(data.summary.liters) }} л</p>
        </div>
      </section>

      <section class="doc__section">
        <h2 class="doc__section-title">Структура расходов</h2>
        <ul class="cats">
          <li v-for="row in data.byCategory" :key="row.name" class="cats__row">
            <span class="cats__dot" :style="{ background: row.color }" />
            <span class="cats__name">{{ row.name }}</span>
            <span class="cats__count">
              {{ number(row.count) }} {{ plural(row.count, ['запись', 'записи', 'записей']) }}
            </span>
            <span v-if="data.includeAmounts" class="cats__total">{{ money(row.total) }}</span>
          </li>
        </ul>
      </section>

      <section class="doc__section">
        <h2 class="doc__section-title">История обслуживания</h2>

        <div v-for="[year, records] in grouped" :key="year" class="year">
          <p class="year__label">{{ year }}</p>
          <div class="history-scroll">
            <table class="history">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Категория</th>
                <th>Работы или заметка</th>
                <th>Пробег</th>
                <th v-if="data.includeAmounts" class="history__num">Сумма</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(record, index) in records" :key="`${record.spentAt}-${index}`">
                <td class="history__date">{{ formatDate(record.spentAt) }}</td>
                <td>
                  <span class="history__cat">
                    <span class="history__dot" :style="{ background: record.categoryColor }" />
                    {{ record.categoryName }}
                  </span>
                </td>
                <td class="history__note">
                  {{ record.note || record.vendor || '—' }}
                  <template v-if="record.liters">
                    ({{ number(record.liters, 2) }} л{{
                      record.fuelGradeLabel ? `, ${record.fuelGradeLabel}` : ''
                    }})
                  </template>
                </td>
                <td class="history__odo">
                  {{ record.odometer ? `${number(record.odometer)} км` : '—' }}
                </td>
                <td v-if="data.includeAmounts" class="history__num">{{ money(record.amount) }}</td>
              </tr>
            </tbody>
            </table>
          </div>
        </div>
      </section>

      <footer class="doc__foot">
        Документ сформирован {{ formatDate(data.generatedAt) }} в Карвисе. Данные внесены
        владельцем автомобиля.
      </footer>
    </article>
  </div>
</template>

<style lang="scss" scoped>
.passport {
  &__state {
    padding: $space-8;
    text-align: center;
    color: var(--text-muted);

    &--error {
      color: var(--danger);
    }
  }

  &__pin {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $space-3;
    max-width: 380px;
    margin: $space-8 auto;
    padding: $space-7 $space-6;
    text-align: center;
    @include card;
  }

  &__pin-icon {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    border-radius: $radius-md;
    background: var(--accent-soft);
    color: var(--accent);
  }

  &__pin-title {
    font-size: $font-size-lg;
    font-weight: $weight-bold;
  }

  &__pin-hint {
    color: var(--text-muted);
    font-size: $font-size-base;
  }

  &__pin-form {
    display: flex;
    flex-direction: column;
    gap: $space-3;
    width: 100%;
    margin-top: $space-2;
  }
}

.doc {
  @include card($space-7);
  display: flex;
  flex-direction: column;
  gap: $space-6;

  &__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: $space-4;
    padding-bottom: $space-5;
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }

  &__identity {
    display: flex;
    align-items: flex-start;
    gap: $space-4;
  }

  &__icon {
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    flex: none;
    border-radius: $radius-md;
    background: var(--accent-soft);
    color: var(--accent);
  }

  &__eyebrow {
    @include eyebrow;
  }

  &__title {
    font-size: $font-size-2xl;
    font-weight: $weight-bold;
    letter-spacing: -0.02em;
  }

  &__subtitle {
    color: var(--text-muted);
    font-size: $font-size-base;
  }

  &__facts {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: $space-3;

    @include down($bp-sm) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  &__section-title {
    margin-bottom: $space-3;
    font-size: $font-size-md;
    font-weight: $weight-medium;
  }

  &__foot {
    padding-top: $space-4;
    border-top: 1px solid var(--border);
    color: var(--text-soft);
    font-size: $font-size-sm;
  }
}

.fact {
  padding: $space-3 $space-4;
  border: 1px solid var(--border);
  border-radius: $radius-md;
  background: var(--surface-2);

  &__label {
    @include eyebrow;
  }

  &__value {
    font-size: $font-size-md;
    font-weight: $weight-bold;

    &--vin {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: $font-size-sm;
      letter-spacing: 0.02em;
    }
  }
}

.cats {
  display: flex;
  flex-direction: column;
  gap: $space-2;

  &__row {
    display: grid;
    grid-template-columns: 10px minmax(0, 1fr) auto auto;
    align-items: center;
    gap: $space-3;
    padding: $space-2 0;
    border-bottom: 1px solid var(--border);
    font-size: $font-size-base;

    &:last-child {
      border-bottom: 0;
    }
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

.year {
  margin-bottom: $space-5;

  &__label {
    @include eyebrow;
    margin-bottom: $space-2;
  }
}

.history-scroll {
  overflow-x: auto;
  @include scrollbar;

  @media print {
    overflow-x: visible;
  }
}

.history {
  width: 100%;
  min-width: 460px;
  border-collapse: collapse;
  font-size: $font-size-sm;

  th {
    @include eyebrow;
    text-align: left;
    padding: $space-2 $space-3;
    border-bottom: 1px solid var(--border);
  }

  td {
    padding: $space-2 $space-3;
    border-bottom: 1px solid var(--border);
    vertical-align: top;
  }

  & th#{&}__num,
  & td#{&}__num {
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  &__date,
  &__odo {
    white-space: nowrap;
    color: var(--text-muted);
  }

  &__cat {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }

  &__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  &__note {
    color: var(--text);
  }
}

@media print {
  .doc {
    border: 0;
    box-shadow: none;
    padding: 0;
  }
}
</style>
