import writeXlsxFile from 'write-excel-file/browser'

const HEADERS = [
  'Дата',
  'Категория',
  'Транспорт',
  'Сумма',
  'Пробег, км',
  'Литры / кВт·ч',
  'Цена за литр / кВт·ч',
  'Марка топлива',
  'Полный бак',
  'Плата за сессию',
  'Плата за простой',
  'Разъем',
  'Место',
  'Заметка',
]

const COLUMN_WIDTHS = [12, 22, 20, 14, 13, 10, 14, 15, 12, 16, 16, 18, 22, 34]

const MONEY_COLUMNS = new Set([3, 6, 9, 10])

const toRow = (expense) => [
  expense.spent_at,
  expense.category_name,
  expense.vehicle_title ?? '',
  Number(expense.amount),
  expense.odometer ?? '',
  expense.liters ?? '',
  expense.price_per_liter ?? '',
  expense.fuel_grade ?? '',
  expense.is_full_tank ? 'да' : '',
  expense.session_fee ?? '',
  expense.idle_fee ?? '',
  expense.connector ?? '',
  expense.vendor ?? '',
  expense.note ?? '',
]

const FORMULA_START = /^[=+\-@\t\r]/

const escapeCsv = (value) => {
  if (value === null || value === undefined) return ''

  let text = String(value)
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`

  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function buildCsv(expenses) {
  const lines = [HEADERS, ...expenses.map(toRow)].map((row) => row.map(escapeCsv).join(';'))
  return `\uFEFF${lines.join('\r\n')}`
}

export function buildXlsx(expenses, { currency = 'RUB' } = {}) {
  const money = currency === 'RUB' ? '#,##0.00 ₽' : '#,##0.00'
  const formatFor = (index) => (MONEY_COLUMNS.has(index) ? money : index === 4 ? '#,##0' : undefined)

  const header = HEADERS.map((value) => ({ value, fontWeight: 'bold', backgroundColor: '#F1EDFF' }))
  const rows = expenses.map((expense) =>
    toRow(expense).map((value, index) =>
      typeof value === 'number' ? { value, format: formatFor(index) } : { value: value || null },
    ),
  )
  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
  const totalRow = [
    { value: 'Итого', fontWeight: 'bold' },
    null,
    null,
    { value: total, format: money, fontWeight: 'bold' },
  ]

  return writeXlsxFile([header, ...rows, totalRow], {
    sheet: 'Расходы',
    columns: COLUMN_WIDTHS.map((width) => ({ width })),
    stickyRowsCount: 1,
  }).toBlob()
}
