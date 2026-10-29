<script setup>
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import ExpenseItemsEditor from '@/components/ExpenseItemsEditor.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiCheckbox from '@/components/ui/UiCheckbox.vue'
import UiField from '@/components/ui/UiField.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiModal from '@/components/ui/UiModal.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import UiTextarea from '@/components/ui/UiTextarea.vue'
import {
  CONNECTOR_OPTIONS,
  FUEL_GRADE_OPTIONS,
  isElectricGrade,
  toIsoDate,
  useFormat,
} from '@/composables/useFormat.js'
import { useToast } from '@/composables/useToast.js'
import { useCatalogStore } from '@/stores/catalog.js'
import { useExpensesStore } from '@/stores/expenses.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  expense: { type: Object, default: null },
  presetCategoryId: { type: String, default: '' },
  presetVehicleId: { type: String, default: '' },
})

const emit = defineEmits(['close', 'saved'])

const catalog = useCatalogStore()
const expenses = useExpensesStore()
const toast = useToast()
const {
  distanceShort,
  fromKm,
  toKm,
  volumeLabel,
  priceUnitLabel,
} = useFormat()

const blankForm = () => ({
  categoryId: '',
  vehicleId: '',
  amount: '',
  spentAt: toIsoDate(),
  odometer: '',
  liters: '',
  pricePerLiter: '',
  fuelGrade: 'ai95',
  isFullTank: false,
  sessionFee: '',
  idleFee: '',
  connector: '',
  vendor: '',
  note: '',
  items: [],
})

const form = ref(blankForm())
const errors = ref({})
const saving = ref(false)

const isEdit = computed(() => Boolean(props.expense))

const selectedCategory = computed(
  () => catalog.categories.find((category) => category.id === form.value.categoryId) ?? null,
)

const isFuel = computed(() => selectedCategory.value?.kind === 'fuel')

const isCharging = computed(() => isFuel.value && isElectricGrade(form.value.fuelGrade))

const selectedVehicle = computed(
  () => catalog.vehicles.find((vehicle) => vehicle.id === form.value.vehicleId) ?? null,
)

const hasItems = computed(() => form.value.items.length > 0)

const itemsTotal = computed(() =>
  form.value.items.reduce(
    (sum, item) => sum + Math.max(0, Number(item.quantity) || 0) * Math.max(0, Number(item.unitPrice) || 0),
    0,
  ),
)

watch(itemsTotal, (value) => {
  if (hasItems.value) form.value.amount = (Math.round(value * 100) / 100).toFixed(2)
})

const feeTotal = computed(() => {
  if (!isCharging.value) return 0
  return Math.max(Number(form.value.sessionFee) || 0, 0) + Math.max(Number(form.value.idleFee) || 0, 0)
})

const FUEL_NUMBERS = ['liters', 'pricePerLiter', 'amount']
const fuelTouched = ref([])

function fuelTarget() {
  const touched = fuelTouched.value
  if (touched.length >= 2) {
    return FUEL_NUMBERS.find((field) => !touched.includes(field)) ?? null
  }
  if (touched.length === 1 && touched[0] !== 'amount') return 'amount'
  if (Number(form.value.liters) > 0) return 'pricePerLiter'
  if (Number(form.value.pricePerLiter) > 0) return 'liters'
  return null
}

const round2 = (value) => String(Math.round(value * 100) / 100)

function deriveFuelNumbers() {
  if (!isFuel.value || hasItems.value) return

  const target = fuelTarget()
  if (!target) return

  const liters = Number(form.value.liters)
  const price = Number(form.value.pricePerLiter)
  const energy = Number(form.value.amount) - feeTotal.value

  if (target === 'amount' && liters > 0 && price > 0) {
    form.value.amount = (Math.round((liters * price + feeTotal.value) * 100) / 100).toFixed(2)
  } else if (target === 'liters' && energy > 0 && price > 0) {
    form.value.liters = round2(energy / price)
  } else if (target === 'pricePerLiter' && energy > 0 && liters > 0) {
    form.value.pricePerLiter = round2(energy / liters)
  }
}

function setFuelNumber(field, value) {
  form.value[field] = value
  fuelTouched.value = [field, ...fuelTouched.value.filter((item) => item !== field)].slice(0, 2)
  deriveFuelNumbers()
}

watch([() => form.value.sessionFee, () => form.value.idleFee], deriveFuelNumbers)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    errors.value = {}
    fuelTouched.value = []

    if (props.expense) {
      form.value = {
        categoryId: props.expense.category.id,
        vehicleId: props.expense.vehicle?.id ?? '',
        amount: String(props.expense.amount),
        spentAt: props.expense.spentAt,
        odometer: props.expense.odometer ? Math.round(fromKm(props.expense.odometer)) : '',
        liters: props.expense.liters ?? '',
        pricePerLiter: props.expense.pricePerLiter ?? '',
        fuelGrade: props.expense.fuelGrade ?? 'ai95',
        isFullTank: props.expense.isFullTank,
        sessionFee: props.expense.sessionFee ?? '',
        idleFee: props.expense.idleFee ?? '',
        connector: props.expense.connector ?? '',
        vendor: props.expense.vendor ?? '',
        note: props.expense.note ?? '',
        items: (props.expense.items ?? []).map((item) => ({
          kind: item.kind,
          name: item.name,
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice),
          partCode: item.partCode ?? '',
        })),
      }
      return
    }

    const vehicle = props.presetVehicleId
      ? catalog.vehicles.find((item) => item.id === props.presetVehicleId)
      : catalog.primaryVehicle

    form.value = {
      ...blankForm(),
      categoryId: props.presetCategoryId || catalog.categories[0]?.id || '',
      vehicleId: vehicle?.id ?? '',
      fuelGrade: vehicle?.fuelGrade ?? 'ai95',
    }
  },
  { immediate: true },
)

watch(selectedVehicle, (vehicle) => {
  if (vehicle && !props.expense) {
    form.value.fuelGrade = vehicle.fuelGrade
  }
})

function validate() {
  const next = {}
  if (!form.value.categoryId) next.categoryId = 'Выберите категорию'
  if (!(Number(form.value.amount) > 0)) next.amount = 'Сумма должна быть больше нуля'
  if (!form.value.spentAt) next.spentAt = 'Укажите дату'
  errors.value = next
  return Object.keys(next).length === 0
}

const optionalNumber = (value) => (value === '' || value === null ? null : Number(value))

function refreshBehind() {
  Promise.all([expenses.refreshAll(), catalog.refresh()]).catch((error) =>
    toast.error(error.message),
  )
}

async function submit() {
  if (!validate()) return

  saving.value = true
  try {
    const payload = {
      categoryId: form.value.categoryId,
      vehicleId: form.value.vehicleId || null,
      amount: Number(form.value.amount),
      spentAt: form.value.spentAt,
      odometer: form.value.odometer === '' ? null : toKm(form.value.odometer),
      liters: isFuel.value ? optionalNumber(form.value.liters) : null,
      pricePerLiter: isFuel.value ? optionalNumber(form.value.pricePerLiter) : null,
      fuelGrade: isFuel.value ? form.value.fuelGrade : null,
      isFullTank: isFuel.value ? form.value.isFullTank : false,
      sessionFee: isCharging.value ? optionalNumber(form.value.sessionFee) : null,
      idleFee: isCharging.value ? optionalNumber(form.value.idleFee) : null,
      connector: isCharging.value ? form.value.connector || null : null,
      vendor: form.value.vendor.trim() || null,
      note: form.value.note.trim() || null,
      items: form.value.items
        .filter((item) => item.name.trim())
        .map((item) => ({
          kind: item.kind,
          name: item.name.trim(),
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          partCode: item.partCode?.trim() || null,
        })),
    }

    if (isEdit.value) {
      await expenses.update(props.expense.id, payload)
      toast.success('Расход обновлен')
    } else {
      await expenses.create(payload)
      toast.success('Расход добавлен')
    }

    emit('saved')
    emit('close')
    refreshBehind()
  } catch (error) {
    errors.value = { ...errors.value, ...(error.details ?? {}) }
    toast.error(error.message)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiModal
    :open="open"
    :title="isEdit ? 'Изменить расход' : 'Новый расход'"
    subtitle="Заправка, мойка, ремонт — все, что вы платите за машину."
    @close="emit('close')"
  >
    <form class="expense-form" @submit.prevent="submit">
      <div class="expense-form__categories">
        <button
          v-for="category in catalog.categories"
          :key="category.id"
          type="button"
          class="category-chip"
          :class="{ 'is-active': form.categoryId === category.id }"
          :style="{ '--chip-color': category.color }"
          :title="category.description ?? category.name"
          @click="form.categoryId = category.id"
        >
          <AppIcon :name="category.icon" :size="17" />
          {{ category.name }}
        </button>
      </div>
      <p v-if="errors.categoryId" class="expense-form__error">{{ errors.categoryId }}</p>
      <p v-if="selectedCategory?.description" class="expense-form__hint">
        {{ selectedCategory.description }}
      </p>

      <div class="expense-form__row">
        <UiField
          label="Сумма"
          required
          :error="errors.amount"
          :hint="hasItems ? 'Считается из работ и запчастей' : ''"
          input-id="expense-amount"
        >
          <UiInput
            id="expense-amount"
            :model-value="form.amount"
            type="number"
            step="0.01"
            min="0"
            :suffix="currencySuffix"
            placeholder="0,00"
            :disabled="hasItems"
            :invalid="Boolean(errors.amount)"
            @update:model-value="setFuelNumber('amount', $event)"
          />
        </UiField>

        <UiField label="Дата" required :error="errors.spentAt" input-id="expense-date">
          <UiInput
            id="expense-date"
            v-model="form.spentAt"
            type="date"
            :invalid="Boolean(errors.spentAt)"
          />
        </UiField>
      </div>

      <div v-if="isFuel" class="expense-form__fuel">
        <div class="expense-form__fuel-fields">
          <UiField label="Вид топлива" input-id="expense-grade">
            <UiSelect id="expense-grade" v-model="form.fuelGrade" :options="FUEL_GRADE_OPTIONS" />
          </UiField>
          <UiField :label="volumeLabel(form.fuelGrade)" input-id="expense-liters">
            <UiInput
              id="expense-liters"
              :model-value="form.liters"
              type="number"
              step="0.01"
              min="0"
              :placeholder="isCharging ? '38,6' : '42,5'"
              @update:model-value="setFuelNumber('liters', $event)"
            />
          </UiField>
          <UiField :label="priceUnitLabel(form.fuelGrade)" input-id="expense-ppl">
            <UiInput
              id="expense-ppl"
              :model-value="form.pricePerLiter"
              type="number"
              step="0.01"
              min="0"
              :suffix="currencySuffix"
              :placeholder="isCharging ? '18,00' : '58,90'"
              @update:model-value="setFuelNumber('pricePerLiter', $event)"
            />
          </UiField>
        </div>
        <p class="expense-form__hint">Любые два из трех: объем, цена и сумма — третье подставим</p>

        <template v-if="isCharging">
          <UiField label="Разъем" input-id="expense-connector">
            <UiSelect
              id="expense-connector"
              v-model="form.connector"
              :options="CONNECTOR_OPTIONS"
              placeholder="Не указан"
            />
          </UiField>

          <div class="expense-form__row">
            <UiField
              label="Плата за сессию"
              hint="Тариф за минуты подключения"
              input-id="expense-session-fee"
            >
              <UiInput
                id="expense-session-fee"
                v-model="form.sessionFee"
                type="number"
                step="0.01"
                min="0"
                :suffix="currencySuffix"
                placeholder="0"
              />
            </UiField>
            <UiField
              label="Плата за простой"
              hint="Штраф, если машина осталась на станции"
              input-id="expense-idle-fee"
            >
              <UiInput
                id="expense-idle-fee"
                v-model="form.idleFee"
                type="number"
                step="0.01"
                min="0"
                :suffix="currencySuffix"
                placeholder="0"
              />
            </UiField>
          </div>

          <p v-if="feeTotal > 0" class="expense-form__fees">
            Энергия плюс сборы {{ feeTotal.toFixed(2) }} {{ currencySuffix }} — итог уже в сумме.
          </p>
        </template>

        <UiCheckbox
          v-model="form.isFullTank"
          :label="isCharging ? 'Заряд до 100 %' : 'Заправка до полного бака'"
          hint="Нужно для расчета расхода «от полного до полного»"
        />
      </div>

      <div class="expense-form__row">
        <UiField label="Транспорт" input-id="expense-vehicle">
          <UiSelect
            id="expense-vehicle"
            v-model="form.vehicleId"
            :options="catalog.vehicleOptions"
            placeholder="Без привязки"
          />
        </UiField>

        <UiField
          :label="`Пробег, ${distanceShort}`"
          hint="Обновит пробег в гараже"
          input-id="expense-odometer"
        >
          <UiInput
            id="expense-odometer"
            v-model="form.odometer"
            type="number"
            min="0"
            :suffix="distanceShort"
            placeholder="128400"
          />
        </UiField>
      </div>

      <ExpenseItemsEditor v-if="!isFuel" v-model="form.items" />

      <UiField label="Место" hint="АЗС, сервис или магазин" input-id="expense-vendor">
        <UiInput id="expense-vendor" v-model="form.vendor" placeholder="Лукойл, СТО «Мотор»..." />
      </UiField>

      <UiField label="Заметка" input-id="expense-note">
        <UiTextarea
          id="expense-note"
          v-model="form.note"
          placeholder="Например: замена масла и фильтров"
        />
      </UiField>
    </form>

    <template #footer>
      <UiButton variant="secondary" @click="emit('close')">Отмена</UiButton>
      <UiButton :loading="saving" icon="check" @click="submit">
        {{ isEdit ? 'Сохранить' : 'Добавить расход' }}
      </UiButton>
    </template>
  </UiModal>
</template>

<style lang="scss" scoped>
.expense-form {
  display: flex;
  flex-direction: column;
  gap: $space-4;

  &__categories {
    display: flex;
    flex-wrap: wrap;
    gap: $space-2;
  }

  &__row {
    @include form-row($space-4);
  }

  &__fees {
    padding: $space-3 $space-4;
    border-radius: $radius-sm;
    background: var(--lime-soft);
    color: var(--text);
    font-size: $font-size-sm;
    line-height: $line-sm;
  }

  &__fuel {
    display: flex;
    flex-direction: column;
    gap: $space-3;
  }

  &__fuel-fields {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: $space-4;

    @include down($bp-sm) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: $space-3;

      > :first-child {
        grid-column: 1 / -1;
      }
    }
  }

  &__error {
    font-size: $font-size-sm;
    color: var(--danger);
  }

  &__hint {
    font-size: $font-size-sm;
    color: var(--text-soft);
  }
}

.category-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px $space-3;
  border: 1px solid var(--border-strong);
  border-radius: $radius-pill;
  background: var(--surface);
  color: var(--text-muted);
  font-size: $font-size-sm;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background-color 0.15s ease;

  svg {
    color: var(--chip-color);
  }

  &:hover {
    border-color: var(--chip-color);
    color: var(--text);
  }

  &.is-active {
    border-color: var(--chip-color);
    background: color-mix(in srgb, var(--chip-color) 12%, transparent);
    color: var(--text);
    font-weight: $weight-medium;
  }
}
</style>
