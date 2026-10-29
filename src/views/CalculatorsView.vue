<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import SectionCard from '@/components/SectionCard.vue'
import UiField from '@/components/ui/UiField.vue'
import UiCheckbox from '@/components/ui/UiCheckbox.vue'
import UiInput from '@/components/ui/UiInput.vue'
import { statsApi } from '@/api/index.js'
import { useFormat } from '@/composables/useFormat.js'
import { useToast } from '@/composables/useToast.js'

const toast = useToast()
const { money, number, plural, distanceShort } = useFormat()

const overview = ref(null)
const fuel = ref([])
const loading = ref(true)

const myConsumption = computed(() => fuel.value.find((item) => item.average)?.average ?? null)

const anyPetrolPrice = computed(() => {
  const grades = overview.value?.fuel?.grades ?? []
  const petrol = grades.find((item) => item.grade?.startsWith('ai') && item.pricePerUnit)
  return petrol?.pricePerUnit ?? null
})

const detour = ref({ near: '', far: '', distance: '20', liters: '45', consumption: '' })
const lpg = ref({ install: '80000', consumption: '', petrol: '', gas: '28', extra: '12', monthly: '1500' })
const trip = ref({ distance: '700', roundTrip: true, price: '', consumption: '', perKm: '', taxi: '' })
const loan = ref({ amount: '1200000', rate: '18', years: '5', down: '300000' })

onMounted(async () => {
  try {
    const [stats, fuelStats] = await Promise.all([statsApi.overview(), statsApi.fuel()])
    overview.value = stats
    fuel.value = fuelStats
  } catch (error) {
    toast.error(error.message)
  } finally {
    loading.value = false
    prefill()
  }
})

function prefill() {
  const consumption = myConsumption.value ? Math.round(myConsumption.value * 10) / 10 : ''
  const petrol = anyPetrolPrice.value ? Math.round(anyPetrolPrice.value * 100) / 100 : ''

  detour.value = { ...detour.value, consumption: String(consumption), near: String(petrol) }
  lpg.value = { ...lpg.value, consumption: String(consumption), petrol: String(petrol) }

  const perKm = overview.value?.fuel?.costPerDistance
  trip.value = {
    ...trip.value,
    price: String(petrol),
    consumption: String(consumption),
    perKm: perKm ? String(Math.round(perKm * 100) / 100) : '',
  }
}

const num = (value) => {
  const parsed = Number(String(value).replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

const detourResult = computed(() => {
  const near = num(detour.value.near)
  const far = num(detour.value.far)
  const trip = num(detour.value.distance)
  const liters = num(detour.value.liters)
  const consumption = num(detour.value.consumption)
  if (!(near > 0 && far > 0 && liters > 0)) return null

  const saved = (near - far) * liters
  const burnt = ((trip * consumption) / 100) * far
  const net = saved - burnt

  return { saved, burnt, net, litersBurnt: (trip * consumption) / 100 }
})

const lpgResult = computed(() => {
  const install = num(lpg.value.install)
  const consumption = num(lpg.value.consumption)
  const petrol = num(lpg.value.petrol)
  const gas = num(lpg.value.gas)
  const extra = num(lpg.value.extra)
  const monthly = num(lpg.value.monthly)
  if (!(install > 0 && consumption > 0 && petrol > 0 && gas > 0)) return null

  const petrolPer100 = consumption * petrol
  const gasPer100 = consumption * (1 + extra / 100) * gas
  const savedPer100 = petrolPer100 - gasPer100
  if (savedPer100 <= 0) return { petrolPer100, gasPer100, savedPer100, never: true }

  const breakEvenKm = (install / savedPer100) * 100
  const months = monthly > 0 ? breakEvenKm / monthly : null

  return { petrolPer100, gasPer100, savedPer100, breakEvenKm, months }
})

const tripResult = computed(() => {
  const one = num(trip.value.distance)
  const price = num(trip.value.price)
  const consumption = num(trip.value.consumption)
  const perKm = num(trip.value.perKm)
  const taxi = num(trip.value.taxi)
  if (!(one > 0 && price > 0 && consumption > 0)) return null

  const km = trip.value.roundTrip ? one * 2 : one
  const liters = (km * consumption) / 100
  const fuel = liters * price
  const full = perKm > 0 ? km * perKm : null

  return {
    km,
    liters,
    fuel,
    full,
    taxi: taxi > 0 ? taxi : null,
    taxiDiff: taxi > 0 ? taxi - fuel : null,
  }
})

const loanResult = computed(() => {
  const price = num(loan.value.amount)
  const down = num(loan.value.down)
  const rate = num(loan.value.rate)
  const years = num(loan.value.years)
  const principal = price - down
  if (!(principal > 0 && rate > 0 && years > 0)) return null

  const months = Math.round(years * 12)
  const monthlyRate = rate / 100 / 12
  const factor = (monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1)
  const payment = principal * factor
  const total = payment * months

  return { principal, months, payment, total, overpay: total - principal, price }
})

watch(loading, (value) => {
  if (!value) prefill()
})
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div class="page-head__text">
        <h1 class="page-head__title">Калькуляторы</h1>
        <p class="page-head__subtitle">
          Четыре вопроса, которые обычно считают в уме и ошибаются: крюк за дешевым
          топливом, окупаемость ГБО, цена поездки и переплата по автокредиту. Поля уже
          заполнены вашими собственными числами — расходом и ценой, которую вы правда
          платили.
        </p>
      </div>
    </header>

    <SectionCard
      title="Стоит ли ехать за дешевым топливом"
      subtitle="Экономия на литре против топлива, сожженного на крюке"
    >
      <div class="calc">
        <div class="calc__fields">
          <UiField label="Цена рядом, ₽/л" input-id="detour-near">
            <UiInput id="detour-near" v-model="detour.near" type="number" step="0.01" placeholder="59,90" />
          </UiField>
          <UiField label="Цена там, ₽/л" input-id="detour-far">
            <UiInput id="detour-far" v-model="detour.far" type="number" step="0.01" placeholder="56,50" />
          </UiField>
          <UiField :label="`Крюк туда-обратно, ${distanceShort}`" input-id="detour-distance">
            <UiInput id="detour-distance" v-model="detour.distance" type="number" min="0" />
          </UiField>
          <UiField label="Сколько зальете, л" input-id="detour-liters">
            <UiInput id="detour-liters" v-model="detour.liters" type="number" min="0" />
          </UiField>
          <UiField label="Расход, л/100 км" hint="Из вашей истории" input-id="detour-consumption">
            <UiInput id="detour-consumption" v-model="detour.consumption" type="number" step="0.1" />
          </UiField>
        </div>

        <div class="calc__result" :class="`calc__result--${detourResult.net > 0 ? 'good' : 'bad'}`" v-if="detourResult">
          <p class="calc__verdict">
            {{ detourResult.net > 0 ? `Выгода ${money(detourResult.net)}` : `Потеря ${money(-detourResult.net)}` }}
          </p>
          <p class="calc__detail">
            Экономия на литре — {{ money(detourResult.saved) }}, на крюк уйдет
            {{ number(detourResult.litersBurnt, 1) }} л на {{ money(detourResult.burnt) }}.
          </p>
          <p v-if="detourResult.net <= 0" class="calc__detail">
            Дешевле заправиться рядом. Крюк окупается только при большой заправке или
            заметной разнице в цене.
          </p>
        </div>
        <p v-else class="calc__empty">Заполните обе цены и объем заправки.</p>
      </div>
    </SectionCard>

    <SectionCard title="Окупаемость ГБО" subtitle="С поправкой на то, что газа уходит больше">
      <div class="calc">
        <div class="calc__fields">
          <UiField label="Установка, ₽" input-id="lpg-install">
            <UiInput id="lpg-install" v-model="lpg.install" type="number" min="0" />
          </UiField>
          <UiField label="Расход бензина, л/100 км" input-id="lpg-consumption">
            <UiInput id="lpg-consumption" v-model="lpg.consumption" type="number" step="0.1" />
          </UiField>
          <UiField label="Бензин, ₽/л" input-id="lpg-petrol">
            <UiInput id="lpg-petrol" v-model="lpg.petrol" type="number" step="0.01" />
          </UiField>
          <UiField label="Газ, ₽/л" input-id="lpg-gas">
            <UiInput id="lpg-gas" v-model="lpg.gas" type="number" step="0.01" />
          </UiField>
          <UiField label="Расход на газе больше, %" hint="Обычно 10–20" input-id="lpg-extra">
            <UiInput id="lpg-extra" v-model="lpg.extra" type="number" min="0" max="60" />
          </UiField>
          <UiField :label="`Пробег в месяц, ${distanceShort}`" input-id="lpg-monthly">
            <UiInput id="lpg-monthly" v-model="lpg.monthly" type="number" min="0" />
          </UiField>
        </div>

        <div v-if="lpgResult?.never" class="calc__result calc__result--bad">
          <p class="calc__verdict">Не окупится</p>
          <p class="calc__detail">
            При этих ценах сто километров на газе ({{ money(lpgResult.gasPer100) }}) дороже,
            чем на бензине ({{ money(lpgResult.petrolPer100) }}).
          </p>
        </div>
        <div v-else-if="lpgResult" class="calc__result calc__result--good">
          <p class="calc__verdict">
            Окупится за {{ number(lpgResult.breakEvenKm, 0) }} {{ distanceShort }}
            <template v-if="lpgResult.months">
              — это примерно {{ number(lpgResult.months, 0) }}
              {{ plural(Math.round(lpgResult.months), ['месяц', 'месяца', 'месяцев']) }}
            </template>
          </p>
          <p class="calc__detail">
            Сто километров: на бензине {{ money(lpgResult.petrolPer100) }}, на газе
            {{ money(lpgResult.gasPer100) }} — экономия {{ money(lpgResult.savedPer100) }}.
          </p>
          <p class="calc__detail">
            Здесь не учтены обслуживание оборудования и потеря места под баллон — но и
            цену бензина мы взяли сегодняшнюю, а она обычно растет быстрее газа.
          </p>
        </div>
        <p v-else class="calc__empty">Заполните расход и обе цены.</p>
      </div>
    </SectionCard>

    <SectionCard
      title="Сколько стоит поездка"
      subtitle="Бензин — не вся цена: на тех же километрах изнашивается и сама машина"
    >
      <div class="calc">
        <div class="calc__fields">
          <UiField :label="`Расстояние в одну сторону, ${distanceShort}`" input-id="trip-distance">
            <UiInput id="trip-distance" v-model="trip.distance" type="number" min="0" />
          </UiField>
          <UiField label="Расход, л/100 км" hint="Из вашей истории" input-id="trip-consumption">
            <UiInput id="trip-consumption" v-model="trip.consumption" type="number" step="0.1" />
          </UiField>
          <UiField label="Цена топлива, ₽/л" input-id="trip-price">
            <UiInput id="trip-price" v-model="trip.price" type="number" step="0.01" />
          </UiField>
          <UiField
            :label="`Полная цена ${distanceShort}, ₽`"
            hint="Все ваши расходы ÷ пробег"
            input-id="trip-perkm"
          >
            <UiInput id="trip-perkm" v-model="trip.perKm" type="number" step="0.01" />
          </UiField>
          <UiField label="Такси за ту же дорогу, ₽" hint="Необязательно" input-id="trip-taxi">
            <UiInput id="trip-taxi" v-model="trip.taxi" type="number" min="0" placeholder="—" />
          </UiField>
          <div class="calc__switch">
            <span class="calc__switch-spacer" aria-hidden="true"></span>
            <UiCheckbox v-model="trip.roundTrip" label="Туда и обратно" />
          </div>
        </div>

        <div
          v-if="tripResult"
          class="calc__result"
          :class="tripResult.taxiDiff === null
            ? 'calc__result--plain'
            : `calc__result--${tripResult.taxiDiff > 0 ? 'good' : 'bad'}`"
        >
          <p class="calc__verdict">
            {{ money(tripResult.fuel) }} на топливо
            <template v-if="tripResult.full">
              · {{ money(tripResult.full) }} с учетом износа
            </template>
          </p>
          <p class="calc__detail">
            {{ number(tripResult.km, 0) }} {{ distanceShort }} и
            {{ number(tripResult.liters, 1) }} л топлива.
            <template v-if="tripResult.full">
              Разница — то, что поездка забирает у машины: масло, приближение ТО.
            </template>
            <template v-else>
              Заполните полную цену километра, чтобы увидеть цену с учетом износа, — она
              появится сама, когда в приложении наберется история.
            </template>
          </p>
          <p v-if="tripResult.taxiDiff !== null" class="calc__detail">
            Такси {{ money(tripResult.taxi) }} —
            <b>{{ tripResult.taxiDiff > 0
              ? `на ${money(tripResult.taxiDiff)} дороже бензина`
              : `на ${money(-tripResult.taxiDiff)} дешевле бензина` }}</b>.
            Честнее сравнивать именно с бензином: за такси ресурс вашей машины никто не тратит.
          </p>
        </div>
        <p v-else class="calc__empty">Заполните расстояние, расход и цену топлива.</p>
      </div>
    </SectionCard>

    <SectionCard
      title="Автокредит: платеж и переплата"
      subtitle="Аннуитет — то, как считают в салоне"
    >
      <div class="calc">
        <div class="calc__fields">
          <UiField label="Цена машины, ₽" input-id="loan-amount">
            <UiInput id="loan-amount" v-model="loan.amount" type="number" min="0" step="10000" />
          </UiField>
          <UiField label="Первый взнос, ₽" input-id="loan-down">
            <UiInput id="loan-down" v-model="loan.down" type="number" min="0" step="10000" />
          </UiField>
          <UiField label="Ставка, % годовых" input-id="loan-rate">
            <UiInput id="loan-rate" v-model="loan.rate" type="number" step="0.1" min="0" />
          </UiField>
          <UiField label="Срок, лет" input-id="loan-years">
            <UiInput id="loan-years" v-model="loan.years" type="number" min="1" max="10" />
          </UiField>
        </div>

        <div
          v-if="loanResult"
          class="calc__result"
          :class="`calc__result--${loanResult.overpay > loanResult.principal ? 'bad' : 'plain'}`"
        >
          <p class="calc__verdict">
            {{ money(loanResult.payment) }} в месяц · переплата
            {{ money(loanResult.overpay) }}
          </p>
          <p class="calc__detail">
            В кредит {{ money(loanResult.principal) }} на {{ loanResult.months }}
            {{ plural(loanResult.months, ['месяц', 'месяца', 'месяцев']) }}. Всего отдадите
            {{ money(loanResult.total) }} — это
            {{ number((loanResult.overpay / loanResult.principal) * 100, 0) }}% сверху.
          </p>
          <p class="calc__detail">
            Здесь чистый кредит. Страховка жизни и КАСКО, которые обычно идут в пакете,
            добавляются к платежу отдельно — и в салоне их часто уже включили в сумму займа.
          </p>
        </div>
        <p v-else class="calc__empty">Заполните цену, ставку и срок.</p>
      </div>
    </SectionCard>

  </div>
</template>

<style lang="scss" scoped>
.calc {
  display: flex;
  flex-direction: column;
  gap: $space-4;

  &__fields {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: $space-4;

    > * {
      min-width: 0;
    }

    @include down($bp-md) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @include down($bp-sm) {
      grid-template-columns: minmax(0, 1fr);
      gap: $space-3;
    }
  }

  &__result {
    @include inset($space-4);
    border-left: 4px solid var(--border-strong);

    &--good {
      border-color: color-mix(in srgb, var(--lime-ink) 35%, transparent);
      border-left-color: var(--lime-strong);
      background: var(--lime-soft);
    }

    &--bad {
      border-color: color-mix(in srgb, var(--danger) 30%, transparent);
      border-left-color: var(--danger);
      background: color-mix(in srgb, var(--danger) 8%, var(--surface));
    }

    &--plain {
      border-left-color: var(--text-faint);
    }
  }

  &__verdict {
    font-size: $font-size-lg;
    font-weight: $weight-bold;
    line-height: $line-sm;
  }

  &__detail {
    margin-top: $space-2;
    font-size: $font-size-sm;
    line-height: $line-sm;
    color: var(--text-muted);
  }

  &__switch {
    display: flex;
    flex-direction: column;
    gap: $space-2;
    min-width: 0;

    :deep(.checkbox) {
      align-items: center;
      min-height: $control-height-lg;
      padding: $space-2 $space-4;
      border-radius: $radius-pill;

      input {
        margin-top: 0;
      }
    }

    @include down($bp-sm) {
      gap: 0;
    }
  }

  &__switch-spacer {
    height: $line-sm;

    @include down($bp-sm) {
      display: none;
    }
  }

  &__empty {
    @include inset($space-3 $space-4);
    font-size: $font-size-sm;
    color: var(--text-muted);
  }
}
</style>
