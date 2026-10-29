import { z } from 'zod'
import { query, withTransaction } from '../db/pool.js'
import { assertVehicleAccess } from '../lib/access.js'
import { FUEL_GRADES } from '../lib/constants.js'
import { asyncHandler, badRequest, parseOrThrow } from '../lib/http.js'
import { randomUUID } from '../lib/random.js'
import { bumpOdometer } from '../lib/vehicles.js'
import { Router } from '../router.js'

const router = Router()

const MAX_ROWS = 5000

const importSchema = z.object({
  csv: z.string().min(1, 'Файл пуст').max(4_000_000),
  vehicleId: z.string().uuid().nullish(),
  dryRun: z.boolean().default(false),
})

const FIELD_ALIASES = {
  date: ['дата', 'date', 'data', 'дата заправки', 'spent_at', 'day'],
  amount: ['сумма', 'amount', 'total', 'cost', 'стоимость', 'total cost', 'price total'],
  category: ['категория', 'category', 'type', 'тип', 'вид'],
  odometer: ['пробег', 'odometer', 'odo', 'km', 'mileage', 'пробег, км'],
  liters: ['литры', 'liters', 'litres', 'volume', 'объем', 'quantity', 'литры / квт·ч'],
  pricePerLiter: [
    'цена за литр',
    'price per liter',
    'price',
    'unit price',
    'цена',
    'цена за литр / квт·ч',
  ],
  fuelGrade: ['марка топлива', 'fuel', 'fuel type', 'вид топлива', 'топливо'],
  isFullTank: ['полный бак', 'full tank', 'full', 'fullfilling'],
  vendor: ['место', 'vendor', 'station', 'азс', 'place'],
  note: ['заметка', 'note', 'notes', 'comment', 'комментарий'],
}

const GRADE_ALIASES = {
  дт: 'diesel',
  diesel: 'diesel',
  'аи-92': 'ai92',
  '92': 'ai92',
  'аи-95': 'ai95',
  '95': 'ai95',
  'аи-95+': 'ai95plus',
  'аи-98': 'ai98',
  '98': 'ai98',
  'аи-100': 'ai100',
  '100': 'ai100',
  электричество: 'electric',
  electric: 'electric',
  газ: 'gas',
  gas: 'gas',
  lpg: 'gas',
}

function splitCsvLine(line, separator) {
  const cells = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        cell += '"'
        i += 1
      } else {
        quoted = !quoted
      }
      continue
    }
    if (char === separator && !quoted) {
      cells.push(cell)
      cell = ''
      continue
    }
    cell += char
  }

  cells.push(cell)
  return cells.map((value) => value.trim())
}

const normalizeHeader = (value) =>
  value
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/\u0308/g, '')
    .normalize('NFC')
    .trim()
    .toLowerCase()

function mapColumns(headers) {
  const mapping = {}
  headers.forEach((header, index) => {
    const name = normalizeHeader(header)
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (mapping[field] === undefined && aliases.includes(name)) {
        mapping[field] = index
      }
    }
  })
  return mapping
}

function parseDate(value) {
  const text = String(value ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10)

  const match = text.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})/)
  if (!match) return null

  const [, day, month, year] = match
  const fullYear = year.length === 2 ? `20${year}` : year
  return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function parseNumber(value) {
  const text = String(value ?? '')
    .replace(/[\s\u00a0]/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '')
  if (!text) return null
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

const truthy = new Set(['да', 'yes', 'true', '1', 'y', '+'])

router.post(
  '/expenses',
  asyncHandler(async (req, res) => {
    const input = parseOrThrow(importSchema, req.body)
    if (input.vehicleId) await assertVehicleAccess(req.user.id, input.vehicleId)

    const lines = input.csv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    if (lines.length < 2) throw badRequest('В файле нет строк с данными')

    const separator = (lines[0].match(/;/g) ?? []).length >= (lines[0].match(/,/g) ?? []).length
      ? ';'
      : ','

    const headers = splitCsvLine(lines[0], separator)
    const mapping = mapColumns(headers)

    if (mapping.date === undefined || mapping.amount === undefined) {
      throw badRequest(
        'Не нашли обязательные колонки: дата и сумма. Проверьте заголовки первой строки.',
        { columns: headers.join(', ') },
      )
    }

    const rows = lines.slice(1, MAX_ROWS + 1)

    const { rows: categories } = await query(
      'SELECT id, name, slug, kind FROM categories WHERE user_id IS NULL OR user_id = $1',
      [req.user.id],
    )
    const byName = new Map(categories.map((row) => [row.name.toLowerCase(), row]))
    const fuelCategory = categories.find((row) => row.kind === 'fuel')
    const fallback =
      categories.find((row) => row.slug === 'other') ?? categories[categories.length - 1]

    const parsed = []
    const skipped = []

    rows.forEach((line, index) => {
      const cells = splitCsvLine(line, separator)
      const pick = (field) => (mapping[field] === undefined ? '' : (cells[mapping[field]] ?? ''))

      const spentAt = parseDate(pick('date'))
      const amount = parseNumber(pick('amount'))

      if (!spentAt || !amount || amount <= 0) {
        skipped.push({ line: index + 2, reason: 'Нет корректной даты или суммы' })
        return
      }

      const liters = parseNumber(pick('liters'))
      const odometer = parseNumber(pick('odometer'))
      const gradeRaw = normalizeHeader(pick('fuelGrade'))
      const grade = GRADE_ALIASES[gradeRaw] ?? (FUEL_GRADES.includes(gradeRaw) ? gradeRaw : null)

      const categoryName = pick('category').toLowerCase()
      const category =
        byName.get(categoryName) ?? (liters || grade ? fuelCategory : null) ?? fallback

      parsed.push({
        categoryId: category.id,
        spentAt,
        amount,
        odometer: odometer === null ? null : Math.round(odometer),
        liters: category.kind === 'fuel' ? liters : null,
        pricePerLiter: category.kind === 'fuel' ? parseNumber(pick('pricePerLiter')) : null,
        fuelGrade: category.kind === 'fuel' ? grade : null,
        isFullTank: truthy.has(normalizeHeader(pick('isFullTank'))),
        vendor: pick('vendor') || null,
        note: pick('note') || null,
      })
    })

    if (input.dryRun) {
      return res.json({
        dryRun: true,
        ready: parsed.length,
        skipped,
      })
    }

    if (parsed.length === 0) throw badRequest('Не удалось разобрать ни одной строки')

    await withTransaction(async (client) => {
      for (const row of parsed) {
        await client.query(
          `INSERT INTO expenses
             (id, user_id, category_id, vehicle_id, amount, spent_at, odometer, liters,
              price_per_liter, fuel_grade, is_full_tank, vendor, note)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            randomUUID(),
            req.user.id,
            row.categoryId,
            input.vehicleId ?? null,
            row.amount,
            row.spentAt,
            row.odometer,
            row.liters,
            row.pricePerLiter,
            row.fuelGrade,
            row.isFullTank,
            row.vendor,
            row.note,
          ],
        )
      }

      const maxOdometer = parsed.reduce((max, row) => Math.max(max, row.odometer ?? 0), 0)
      if (input.vehicleId && maxOdometer > 0) {
        await bumpOdometer(client, input.vehicleId, maxOdometer)
      }
    })

    res.status(201).json({ imported: parsed.length, skipped })
  }),
)

export default router
