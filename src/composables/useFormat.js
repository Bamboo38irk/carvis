import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth.js'

const KM_PER_MILE = 1.609344

const CURRENCY_SYMBOLS = { RUB: '₽', USD: '$', EUR: '€' }

export const CURRENCY_OPTIONS = [
  { value: 'RUB', label: 'RUB — рубль (₽)' },
  { value: 'USD', label: 'USD — доллар ($)' },
  { value: 'EUR', label: 'EUR — евро (€)' },
]

export const DISTANCE_OPTIONS = [
  { value: 'km', label: 'Километры (км)' },
  { value: 'mi', label: 'Мили (mi)' },
]

export const FUEL_GRADE_OPTIONS = [
  { value: 'diesel', label: 'ДТ' },
  { value: 'ai92', label: 'АИ-92' },
  { value: 'ai95', label: 'АИ-95' },
  { value: 'ai95plus', label: 'АИ-95+' },
  { value: 'ai98', label: 'АИ-98' },
  { value: 'ai100', label: 'АИ-100' },
  { value: 'electric', label: 'Электричество' },
  { value: 'gas', label: 'Газ' },
]

const ELECTRIC_GRADE = 'electric'

export const isElectricGrade = (grade) => grade === ELECTRIC_GRADE

export const CONNECTOR_OPTIONS = [
  { value: 'type2', label: 'Type 2 (AC)' },
  { value: 'ccs2', label: 'CCS Combo 2 (DC)' },
  { value: 'gbt', label: 'GB/T (DC)' },
  { value: 'chademo', label: 'CHAdeMO (DC)' },
  { value: 'schuko', label: 'Бытовая розетка' },
  { value: 'other', label: 'Другой разъем' },
]

export const VEHICLE_TYPE_OPTIONS = [
  { value: 'car', label: 'Легковой автомобиль' },
  { value: 'truck', label: 'Грузовик' },
  { value: 'motorcycle', label: 'Мотоцикл' },
  { value: 'trailer', label: 'Прицеп' },
]

export const FUEL_GRADE_LABELS = Object.fromEntries(
  FUEL_GRADE_OPTIONS.map((option) => [option.value, option.label]),
)

export const VEHICLE_TYPE_LABELS = Object.fromEntries(
  VEHICLE_TYPE_OPTIONS.map((option) => [option.value, option.label]),
)

export const toIsoDate = (value = new Date()) =>
  [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
  ].join('-')

export const parseDay = (value) => new Date(`${String(value).slice(0, 10)}T00:00:00`)

export const plural = (count, forms) => {
  const abs = Math.abs(count) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return forms[2]
  if (last > 1 && last < 5) return forms[1]
  if (last === 1) return forms[0]
  return forms[2]
}

export function useFormat() {
  const auth = useAuthStore()

  const currency = computed(() => auth.user?.currency ?? 'RUB')
  const currencySymbol = computed(() => CURRENCY_SYMBOLS[currency.value] ?? currency.value)
  const distanceUnit = computed(() => auth.user?.distanceUnit ?? 'km')
  const distanceShort = computed(() => (distanceUnit.value === 'mi' ? 'mi' : 'км'))
  const consumptionLabel = computed(() =>
    distanceUnit.value === 'mi' ? 'л/100 миль' : 'л/100 км',
  )

  const volumeUnit = (grade) => (isElectricGrade(grade) ? 'кВт·ч' : 'л')

  const volumeLabel = (grade) => (isElectricGrade(grade) ? 'Энергия, кВт·ч' : 'Объем, л')

  const priceUnitLabel = (grade) =>
    isElectricGrade(grade) ? 'Цена за кВт·ч' : 'Цена за литр'

  const consumptionUnit = (grade) =>
    `${volumeUnit(grade)}/100 ${distanceUnit.value === 'mi' ? 'миль' : 'км'}`

  const money = (value, { compact = false, decimals } = {}) => {
    const amount = Number(value ?? 0)
    const fractionDigits = decimals ?? (compact || Math.abs(amount) >= 1000 ? 0 : 2)
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency.value,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount)
  }

  const number = (value, decimals = 0) =>
    new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(Number(value ?? 0))

  const fuelVolume = ({ liters = 0, energy = 0 } = {}, decimals = 0) => {
    const parts = []
    if (liters > 0) parts.push(`${number(liters, decimals)} л`)
    if (energy > 0) parts.push(`${number(energy, decimals)} кВт·ч`)
    return parts.join(' + ') || '0 л'
  }

  const fromKm = (km) => {
    const value = Number(km ?? 0)
    return distanceUnit.value === 'mi' ? value / KM_PER_MILE : value
  }

  const toKm = (value) => {
    const input = Number(value ?? 0)
    return distanceUnit.value === 'mi' ? Math.round(input * KM_PER_MILE) : Math.round(input)
  }

  const distance = (km, { withUnit = true, decimals = 0 } = {}) => {
    const converted = number(fromKm(km), decimals)
    return withUnit ? `${converted} ${distanceShort.value}` : converted
  }

  const consumption = (litersPer100Km, { withUnit = true, grade } = {}) => {
    if (litersPer100Km === null || litersPer100Km === undefined) return '—'
    const value =
      distanceUnit.value === 'mi' ? Number(litersPer100Km) * KM_PER_MILE : Number(litersPer100Km)
    const unit = grade ? consumptionUnit(grade) : consumptionLabel.value
    return withUnit ? `${number(value, 1)} ${unit}` : number(value, 1)
  }

  const perDistance = (amountPerKm) => {
    if (amountPerKm === null || amountPerKm === undefined) return '—'
    const value =
      distanceUnit.value === 'mi' ? Number(amountPerKm) * KM_PER_MILE : Number(amountPerKm)
    return `${money(value, { decimals: 2 })}/${distanceShort.value}`
  }

  const date = (value, options = { day: '2-digit', month: 'short', year: 'numeric' }) => {
    if (!value) return '—'
    const parsed = parseDay(value)
    if (Number.isNaN(parsed.valueOf())) return '—'
    const padded = {
      ...options,
      ...(options.day === 'numeric' ? { day: '2-digit' } : null),
      ...(options.month === 'numeric' ? { month: '2-digit' } : null),
    }
    return new Intl.DateTimeFormat('ru-RU', padded).format(parsed)
  }

  const monthLabel = (value) => {
    const [year, month] = `${value}`.split('-')
    return new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(
      new Date(Number(year), Number(month) - 1, 1),
    )
  }

  const monthFull = (value) => {
    const [year, month] = `${value}`.split('-')
    return new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(
      new Date(Number(year), Number(month) - 1, 1),
    )
  }

  const relativeDate = (value) => {
    if (!value) return '—'
    const parsed = parseDay(value)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const days = Math.round((today.valueOf() - parsed.valueOf()) / 86_400_000)
    if (days === 0) return 'Сегодня'
    if (days === 1) return 'Вчера'
    if (days > 1 && days < 7) return `${days} ${plural(days, ['день', 'дня', 'дней'])} назад`
    return date(value)
  }

  return {
    currencySymbol,
    distanceShort,
    volumeUnit,
    volumeLabel,
    priceUnitLabel,
    consumptionUnit,
    fuelVolume,
    money,
    number,
    distance,
    fromKm,
    toKm,
    consumption,
    perDistance,
    date,
    monthLabel,
    monthFull,
    relativeDate,
    plural,
  }
}
