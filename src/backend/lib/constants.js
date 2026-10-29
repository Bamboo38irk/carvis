export const VEHICLE_TYPES = ['car', 'truck', 'motorcycle', 'trailer']

export const VEHICLE_TYPE_TITLES = {
  car: 'Мой автомобиль',
  truck: 'Мой грузовик',
  motorcycle: 'Мой мотоцикл',
  trailer: 'Мой прицеп',
}

export const FUEL_GRADES = ['diesel', 'ai92', 'ai95', 'ai95plus', 'ai98', 'ai100', 'electric', 'gas']

export const FUEL_GRADE_LABELS = {
  diesel: 'ДТ',
  ai92: 'АИ-92',
  ai95: 'АИ-95',
  ai95plus: 'АИ-95+',
  ai98: 'АИ-98',
  ai100: 'АИ-100',
  electric: 'Электричество',
  gas: 'Газ',
}

const ELECTRIC_GRADE = 'electric'

export const isElectricGrade = (grade) => grade === ELECTRIC_GRADE

export const CHARGER_CONNECTORS = ['type2', 'ccs2', 'gbt', 'chademo', 'schuko', 'other']

export const CHARGER_CONNECTOR_LABELS = {
  type2: 'Type 2 (AC)',
  ccs2: 'CCS Combo 2 (DC)',
  gbt: 'GB/T (DC)',
  chademo: 'CHAdeMO (DC)',
  schuko: 'Бытовая розетка',
  other: 'Другой разъем',
}

export const CURRENCIES = ['RUB', 'USD', 'EUR']

export const DISTANCE_UNITS = ['km', 'mi']
