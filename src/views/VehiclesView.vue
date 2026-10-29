<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import VehiclePassportModal from '@/components/VehiclePassportModal.vue'
import UiAutocomplete from '@/components/ui/UiAutocomplete.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiCheckbox from '@/components/ui/UiCheckbox.vue'
import UiConfirm from '@/components/ui/UiConfirm.vue'
import UiEmpty from '@/components/ui/UiEmpty.vue'
import UiField from '@/components/ui/UiField.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiModal from '@/components/ui/UiModal.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import {
  FUEL_GRADE_LABELS,
  FUEL_GRADE_OPTIONS,
  VEHICLE_TYPE_LABELS,
  VEHICLE_TYPE_OPTIONS,
  isElectricGrade,
  parseDay,
  useFormat,
} from '@/composables/useFormat.js'
import { makesFor, modelsFor } from '@/data/vehicleCatalog.js'
import { useToast } from '@/composables/useToast.js'
import { useCatalogStore } from '@/stores/catalog.js'
import { useExpensesStore } from '@/stores/expenses.js'

const catalog = useCatalogStore()
const expenses = useExpensesStore()
const toast = useToast()
const router = useRouter()
const { money, number, distance, distanceShort, fromKm, toKm, date, plural, perDistance } =
  useFormat()

const blank = () => ({
  vehicleType: 'car',
  make: '',
  model: '',
  year: '',
  plate: '',
  vin: '',
  fuelGrade: 'ai95',
  tankVolume: '',
  odometer: '',
  purchaseDate: '',
  purchasePrice: '',
  odometerAtPurchase: '',
  isPrimary: false,
})

const modalOpen = ref(false)
const editing = ref(null)
const form = ref(blank())

const makeOptions = computed(() => makesFor(form.value.vehicleType))
const modelOptions = computed(() => modelsFor(form.value.vehicleType, form.value.make))

const formIsElectric = computed(() => isElectricGrade(form.value.fuelGrade))
const tankLabel = computed(() =>
  formIsElectric.value ? 'Емкость батареи, кВт·ч' : 'Объем бака, л',
)
const errors = ref({})
const saving = ref(false)
const pendingDelete = ref(null)
const deleting = ref(false)
const passportVehicle = ref(null)

const fleetTotal = computed(() =>
  catalog.vehicles.reduce((sum, vehicle) => sum + Number(vehicle.expensesTotal), 0),
)

const monthsSince = (isoDate) => {
  const from = parseDay(isoDate)
  const now = new Date()
  const months =
    (now.getFullYear() - from.getFullYear()) * 12 + (now.getMonth() - from.getMonth())
  return Math.max(1, months)
}

const ownership = (vehicle) => {
  const months = vehicle.purchaseDate ? monthsSince(vehicle.purchaseDate) : null
  const driven =
    vehicle.odometerAtPurchase !== null && vehicle.odometerAtPurchase !== undefined
      ? Math.max(0, vehicle.odometer - vehicle.odometerAtPurchase)
      : null

  return {
    months,
    driven,
    perMonth: months ? Number(vehicle.expensesTotal) / months : null,
    perDistance: driven > 0 ? Number(vehicle.expensesTotal) / driven : null,
    totalOwnership: vehicle.purchasePrice
      ? Number(vehicle.purchasePrice) + Number(vehicle.expensesTotal)
      : null,
  }
}

const hasDiary = (vehicle) => {
  const owned = ownership(vehicle)
  return Boolean(
    vehicle.purchaseDate ||
      owned.driven !== null ||
      (owned.perMonth && owned.perDistance) ||
      owned.totalOwnership ||
      vehicle.plate ||
      vehicle.vin,
  )
}

function openCreate() {
  editing.value = null
  form.value = blank()
  errors.value = {}
  modalOpen.value = true
}

function openEdit(vehicle) {
  editing.value = vehicle
  form.value = {
    vehicleType: vehicle.vehicleType,
    make: vehicle.make ?? '',
    model: vehicle.model ?? '',
    year: vehicle.year ?? '',
    plate: vehicle.plate ?? '',
    vin: vehicle.vin ?? '',
    fuelGrade: vehicle.fuelGrade,
    tankVolume: vehicle.tankVolume ?? '',
    odometer: vehicle.odometer ? Math.round(fromKm(vehicle.odometer)) : '',
    purchaseDate: vehicle.purchaseDate ?? '',
    purchasePrice: vehicle.purchasePrice ?? '',
    odometerAtPurchase: vehicle.odometerAtPurchase
      ? Math.round(fromKm(vehicle.odometerAtPurchase))
      : '',
    isPrimary: vehicle.isPrimary,
  }
  errors.value = {}
  modalOpen.value = true
}

async function save() {
  saving.value = true
  try {
    const payload = {
      vehicleType: form.value.vehicleType,
      make: form.value.make.trim(),
      model: form.value.model.trim(),
      year: form.value.year === '' ? null : Number(form.value.year),
      plate: form.value.plate.trim(),
      vin: form.value.vin.trim().toUpperCase(),
      fuelGrade: form.value.fuelGrade,
      tankVolume: form.value.tankVolume === '' ? null : Number(form.value.tankVolume),
      odometer: form.value.odometer === '' ? 0 : toKm(form.value.odometer),
      purchaseDate: form.value.purchaseDate || null,
      purchasePrice: form.value.purchasePrice === '' ? null : Number(form.value.purchasePrice),
      odometerAtPurchase:
        form.value.odometerAtPurchase === '' ? null : toKm(form.value.odometerAtPurchase),
      isPrimary: form.value.isPrimary,
    }

    if (editing.value) {
      await catalog.updateVehicle(editing.value.id, payload)
      toast.success('Транспорт обновлен')
    } else {
      await catalog.createVehicle(payload)
      toast.success('Транспорт добавлен')
    }
    modalOpen.value = false
  } catch (error) {
    errors.value = error.details ?? {}
    toast.error(error.message)
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  deleting.value = true
  try {
    await catalog.removeVehicle(pendingDelete.value.id)
    toast.success('Транспорт удален')
    pendingDelete.value = null
  } catch (error) {
    toast.error(error.message)
  } finally {
    deleting.value = false
  }
}

function showExpenses(vehicle) {
  expenses.filterBy({ vehicleId: vehicle.id })
  router.push({ name: 'expenses' })
}

onMounted(() => catalog.load())
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div class="page-head__text">
        <h1>Гараж</h1>
        <p class="page-head__subtitle">
          {{ catalog.vehicles.length }} ТС · всего расходов {{ money(fleetTotal) }}
        </p>
      </div>
      <UiButton icon="plus" @click="openCreate">Добавить транспорт</UiButton>
    </header>

    <div v-if="catalog.vehicles.length" class="cars">
      <article v-for="vehicle in catalog.vehicles" :key="vehicle.id" class="car">
        <header class="car__head">
          <span class="car__icon">
            <AppIcon :name="vehicle.vehicleType" :size="28" />
          </span>
          <div class="car__titles">
            <div class="car__title-row">
              <h3 class="car__name">{{ vehicle.title }}</h3>
              <UiBadge v-if="vehicle.isPrimary" class="car__primary" tone="accent">основной</UiBadge>
            </div>
            <p class="car__meta">
              {{ VEHICLE_TYPE_LABELS[vehicle.vehicleType] }}
              <template v-if="vehicle.year">· {{ vehicle.year }}</template>
              <template v-if="vehicle.fuelGrade">
                · {{ FUEL_GRADE_LABELS[vehicle.fuelGrade] }}
              </template>
            </p>
          </div>
          <div class="car__tools">
            <UiButton
              variant="ghost"
              size="sm"
              icon="pencil"
              aria-label="Редактировать транспорт"
              title="Редактировать"
              @click="openEdit(vehicle)"
            />
            <UiButton
              variant="ghost"
              size="sm"
              icon="trash"
              aria-label="Удалить транспорт"
              title="Удалить"
              @click="pendingDelete = vehicle"
            />
          </div>
        </header>

        <dl class="car__figures">
          <div>
            <dt>Пробег</dt>
            <dd>{{ distance(vehicle.odometer) }}</dd>
          </div>
          <div>
            <dt>Потрачено</dt>
            <dd>{{ money(vehicle.expensesTotal, { compact: true }) }}</dd>
          </div>
          <div v-if="ownership(vehicle).perDistance">
            <dt>Цена пути</dt>
            <dd>{{ perDistance(ownership(vehicle).perDistance) }}</dd>
          </div>
          <div v-else-if="ownership(vehicle).perMonth">
            <dt>В месяц</dt>
            <dd>{{ money(ownership(vehicle).perMonth, { compact: true }) }}</dd>
          </div>
        </dl>

        <ul v-if="hasDiary(vehicle)" class="car__diary">
          <li v-if="vehicle.purchaseDate">
            <span>В собственности</span>
            <span>
              {{ date(vehicle.purchaseDate) }} ·
              {{ ownership(vehicle).months }}
              {{ plural(ownership(vehicle).months, ['месяц', 'месяца', 'месяцев']) }}
            </span>
          </li>
          <li v-if="ownership(vehicle).driven !== null">
            <span>Проехали при вас</span>
            <span>{{ distance(ownership(vehicle).driven) }}</span>
          </li>
          <li v-if="ownership(vehicle).perMonth && ownership(vehicle).perDistance">
            <span>Обслуживание в месяц</span>
            <span>{{ money(ownership(vehicle).perMonth) }}</span>
          </li>
          <li v-if="ownership(vehicle).totalOwnership">
            <span>Вложено всего</span>
            <span>
              {{ money(ownership(vehicle).totalOwnership) }}
              <template v-if="vehicle.purchasePrice">
                (покупка {{ money(vehicle.purchasePrice, { compact: true }) }})
              </template>
            </span>
          </li>
          <li v-if="vehicle.plate">
            <span>Госномер</span>
            <span class="car__plate">{{ vehicle.plate }}</span>
          </li>
          <li v-if="vehicle.vin">
            <span>VIN</span>
            <span class="car__vin">{{ vehicle.vin }}</span>
          </li>
        </ul>

        <footer class="car__actions">
          <button type="button" class="action" @click="showExpenses(vehicle)">
            <AppIcon name="list" :size="18" />
            <span class="action__label">Расходы</span>
            <span class="action__hint">
              {{ number(vehicle.expensesCount) }}
              {{ plural(vehicle.expensesCount, ['запись', 'записи', 'записей']) }}
            </span>
          </button>
          <button type="button" class="action" @click="passportVehicle = vehicle">
            <AppIcon name="print" :size="18" />
            <span class="action__label">Паспорт</span>
            <span class="action__hint">для покупателя</span>
          </button>
          <button
            type="button"
            class="action"
            @click="router.push({ name: 'service-book', params: { id: vehicle.id } })"
          >
            <AppIcon name="receipt" :size="18" />
            <span class="action__label">Книжка</span>
            <span class="action__hint">на печать</span>
          </button>
        </footer>
      </article>
    </div>

    <UiEmpty
      v-else
      icon="car"
      title="Гараж пуст"
      description="Добавьте автомобиль, чтобы вести расходы по нему отдельно."
    >
      <UiButton icon="plus" @click="openCreate">Добавить транспорт</UiButton>
    </UiEmpty>

    <UiModal
      :open="modalOpen"
      :title="editing ? 'Изменить транспорт' : 'Новый транспорт'"
      subtitle="Название в списках сложится из марки и модели."
      @close="modalOpen = false"
    >
      <div class="car-form">
        <UiField label="Тип транспорта" input-id="car-type">
          <UiSelect id="car-type" v-model="form.vehicleType" :options="VEHICLE_TYPE_OPTIONS" />
        </UiField>
        <UiField label="Вид топлива" input-id="car-fuel">
          <UiSelect id="car-fuel" v-model="form.fuelGrade" :options="FUEL_GRADE_OPTIONS" />
        </UiField>
        <UiField label="Марка" input-id="car-make">
          <UiAutocomplete
            id="car-make"
            v-model="form.make"
            :options="makeOptions"
            placeholder="Skoda"
          />
        </UiField>
        <UiField label="Модель" input-id="car-model">
          <UiAutocomplete
            id="car-model"
            v-model="form.model"
            :options="modelOptions"
            placeholder="Octavia"
          />
        </UiField>
        <UiField label="Год выпуска" :error="errors.year" input-id="car-year">
          <UiInput
            id="car-year"
            v-model="form.year"
            type="number"
            min="1900"
            max="2100"
            placeholder="2019"
          />
        </UiField>
        <UiField label="Госномер" hint="Необязательно" input-id="car-plate">
          <UiInput id="car-plate" v-model="form.plate" placeholder="А 123 ВС 77" />
        </UiField>
        <UiField label="VIN" hint="17 символов, необязательно" :error="errors.vin" input-id="car-vin">
          <UiInput
            id="car-vin"
            v-model="form.vin"
            placeholder="Z94C251BBLR123456"
            :invalid="Boolean(errors.vin)"
          />
        </UiField>
        <UiField label="Дата покупки" input-id="car-purchase-date">
          <UiInput id="car-purchase-date" v-model="form.purchaseDate" type="date" />
        </UiField>
        <UiField label="Цена покупки" hint="Для расчета полной стоимости владения" input-id="car-purchase-price">
          <UiInput
            id="car-purchase-price"
            v-model="form.purchasePrice"
            type="number"
            min="0"
            step="1000"
            placeholder="1180000"
          />
        </UiField>
        <UiField
          :label="`Пробег при покупке, ${distanceShort}`"
          input-id="car-odo-purchase"
        >
          <UiInput
            id="car-odo-purchase"
            v-model="form.odometerAtPurchase"
            type="number"
            min="0"
            :suffix="distanceShort"
            placeholder="41200"
          />
        </UiField>
        <UiField :label="tankLabel" input-id="car-tank">
          <UiInput
            id="car-tank"
            v-model="form.tankVolume"
            type="number"
            min="0"
            :placeholder="formIsElectric ? '60' : '50'"
          />
        </UiField>
        <UiField :label="`Пробег, ${distanceShort}`" input-id="car-odo">
          <UiInput
            id="car-odo"
            v-model="form.odometer"
            type="number"
            min="0"
            :suffix="distanceShort"
            placeholder="128400"
          />
        </UiField>
        <UiCheckbox
          v-model="form.isPrimary"
          label="Основной транспорт"
          hint="Будет выбран по умолчанию при добавлении расходов"
        />
      </div>
      <template #footer>
        <UiButton variant="secondary" @click="modalOpen = false">Отмена</UiButton>
        <UiButton :loading="saving" icon="check" @click="save">
          {{ editing ? 'Сохранить' : 'Добавить' }}
        </UiButton>
      </template>
    </UiModal>

    <VehiclePassportModal
      :open="Boolean(passportVehicle)"
      :vehicle="passportVehicle"
      @close="passportVehicle = null"
    />

    <UiConfirm
      :open="Boolean(pendingDelete)"
      title="Удалить транспорт?"
      :message="
        pendingDelete
          ? `«${pendingDelete.title}» будет удален. Расходы останутся в истории без привязки к ТС.`
          : ''
      "
      confirm-label="Удалить"
      :loading="deleting"
      @cancel="pendingDelete = null"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style lang="scss" scoped>
.cars {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: $space-4;

  @include down($bp-md) {
    grid-template-columns: minmax(0, 1fr);
  }
}

.action {
  display: grid;
  grid-template-rows: auto auto auto;
  justify-items: start;
  gap: 2px;
  padding: $space-3;
  border: 1px solid var(--border);
  border-radius: $radius-md;
  background: var(--surface);
  color: var(--text);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;

  svg {
    color: var(--text-muted);
    transition: color 0.15s ease;
  }

  &:hover {
    border-color: var(--border-strong);
    background: var(--surface-2);

    svg {
      color: var(--text);
    }
  }

  &__label {
    font-size: $font-size-sm;
    font-weight: $weight-semibold;
  }

  &__hint {
    font-size: $font-size-xs;
    line-height: $line-xs;
    color: var(--text-soft);
    overflow-wrap: anywhere;
  }
}

.car {
  display: flex;
  flex-direction: column;
  gap: $space-3;
  padding: $space-4 $space-5 $space-5;
  border: 1px solid var(--border);
  border-radius: $radius-md;
  background: var(--surface);
  transition: box-shadow 0.16s ease;

  &:hover {
    box-shadow: var(--shadow-md);
  }

  &__head {
    display: flex;
    align-items: flex-start;
    gap: $space-3;
  }

  &__icon {
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    flex: none;
    border-radius: $radius-md;
    background: var(--lime-soft);
    color: var(--text);

    @include down($bp-sm) {
      width: 44px;
      height: 44px;
    }
  }

  &__titles {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }

  &__tools {
    display: flex;
    align-items: center;
    gap: 2px;
    flex: none;
  }

  &__title-row {
    display: flex;
    align-items: center;
    gap: $space-2;
    min-width: 0;
  }

  &__primary {
    flex: none;
  }

  &__name {
    min-width: 0;
    @include truncate;
    font-size: $font-size-xl;
    line-height: $line-lg;
    letter-spacing: -0.01em;

    @include down($bp-sm) {
      font-size: $font-size-lg;
      line-height: $line-base;
    }
  }

  &__plate {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: $font-size-xs;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: $space-2;
    flex-wrap: wrap;
    font-size: $font-size-sm;
    line-height: $line-sm;
    color: var(--text-soft);
  }

  &__figures {
    display: flex;
    flex-wrap: wrap;
    gap: $space-3 $space-8;
    margin: 0;
    @include inset($space-3 $space-4);

    > div {
      min-width: 0;
    }

    dt {
      @include eyebrow;
    }

    dd {
      margin: 2px 0 0;
      font-size: $font-size-xl;
      font-weight: $weight-bold;
      line-height: $line-lg;
      letter-spacing: -0.01em;
      @include truncate;
    }
  }

  &__diary {
    display: flex;
    flex-direction: column;
    gap: 4px;

    li {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: $space-3;
      font-size: $font-size-sm;

      span:first-child {
        color: var(--text-soft);
        white-space: nowrap;
      }

      span:last-child {
        font-weight: $weight-medium;
        text-align: right;
      }
    }
  }

  &__vin {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: $font-size-xs;
    letter-spacing: 0.02em;
  }

  &__actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: $space-2;
    margin-top: auto;
  }
}

.car-form {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}
</style>
