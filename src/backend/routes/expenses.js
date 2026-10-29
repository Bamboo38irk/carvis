import { z } from 'zod'
import { query, withTransaction } from '../db/pool.js'
import { assertVehicleAccess } from '../lib/access.js'
import { CHARGER_CONNECTORS, FUEL_GRADES, isElectricGrade } from '../lib/constants.js'
import { ITEM_KINDS, itemsTotal, loadItems, replaceItems } from '../lib/expenseItems.js'
import { asyncHandler, badRequest, notFound, parseOrThrow } from '../lib/http.js'
import { randomUUID } from '../lib/random.js'
import { bumpOdometer } from '../lib/vehicles.js'
import { Router } from '../router.js'

const router = Router()

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата в формате ГГГГ-ММ-ДД')

const itemSchema = z.object({
  kind: z.enum(ITEM_KINDS).default('part'),
  name: z.string().trim().min(1, 'Укажите название').max(160),
  quantity: z.coerce.number().positive('Количество больше нуля').max(100_000),
  unitPrice: z.coerce.number().min(0).max(100_000_000),
  partCode: z.string().trim().max(60).nullish(),
})

const expenseSchema = z.object({
  categoryId: z.string().uuid('Выберите категорию'),
  vehicleId: z.string().uuid().nullish(),
  amount: z.coerce.number().positive('Сумма должна быть больше нуля').max(100_000_000),
  spentAt: dateString,
  odometer: z.coerce.number().int().min(0).max(10_000_000).nullish(),
  liters: z.coerce.number().positive().max(10_000).nullish(),
  pricePerLiter: z.coerce.number().positive().max(100_000).nullish(),
  fuelGrade: z.enum(FUEL_GRADES).nullish(),
  isFullTank: z.boolean().default(false),
  sessionFee: z.coerce.number().min(0).max(1_000_000).nullish(),
  idleFee: z.coerce.number().min(0).max(1_000_000).nullish(),
  connector: z.enum(CHARGER_CONNECTORS).nullish(),
  vendor: z.string().trim().max(120).nullish(),
  note: z.string().trim().max(500).nullish(),
  items: z.array(itemSchema).max(60, 'Слишком много строк').optional(),
})

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  categoryId: z.string().uuid().optional(),
  vehicleId: z.string().uuid().optional(),
  from: dateString.optional(),
  to: dateString.optional(),
  search: z.string().trim().max(120).optional(),
  sort: z.enum(['spent_at', 'amount', 'created_at']).default('spent_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
})

const mapExpense = (row, items = []) => ({
  id: row.id,
  items,
  amount: row.amount,
  spentAt: row.spent_at,
  odometer: row.odometer,
  liters: row.liters,
  pricePerLiter: row.price_per_liter,
  fuelGrade: row.fuel_grade,
  isFullTank: row.is_full_tank,
  sessionFee: row.session_fee,
  idleFee: row.idle_fee,
  connector: row.connector,
  vendor: row.vendor,
  note: row.note,
  category: {
    id: row.category_id,
    name: row.category_name,
    icon: row.category_icon,
    color: row.category_color,
    kind: row.category_kind,
  },
  vehicle: row.vehicle_id ? { id: row.vehicle_id, title: row.vehicle_title } : null,
})

const SELECT_EXPENSE = `
  SELECT e.*,
         c.name  AS category_name,
         c.icon  AS category_icon,
         c.color AS category_color,
         c.kind  AS category_kind,
         v.title AS vehicle_title
    FROM expenses e
    JOIN categories c ON c.id = e.category_id
    LEFT JOIN vehicles v ON v.id = e.vehicle_id
`

function normalizeCharging(input) {
  if (isElectricGrade(input.fuelGrade)) return input
  return { ...input, sessionFee: null, idleFee: null, connector: null }
}

const amountFrom = (input) =>
  input.items && input.items.length > 0 ? itemsTotal(input.items) : input.amount

async function assertReferences(user, input) {
  if (input.categoryId) {
    const { rowCount } = await query(
      'SELECT 1 FROM categories WHERE id = $1 AND (user_id IS NULL OR user_id = $2)',
      [input.categoryId, user.id],
    )
    if (rowCount === 0) throw badRequest('Категория недоступна')
  }
  if (input.vehicleId) {
    await assertVehicleAccess(user.id, input.vehicleId)
  }
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = parseOrThrow(listSchema, req.query)

    const where = ['e.user_id = $1']
    const params = [req.user.id]

    if (q.categoryId) {
      params.push(q.categoryId)
      where.push(`e.category_id = $${params.length}`)
    }
    if (q.vehicleId) {
      params.push(q.vehicleId)
      where.push(`e.vehicle_id = $${params.length}`)
    }
    if (q.from) {
      params.push(q.from)
      where.push(`e.spent_at >= $${params.length}`)
    }
    if (q.to) {
      params.push(q.to)
      where.push(`e.spent_at <= $${params.length}`)
    }
    if (q.search) {
      params.push(`%${q.search.replace(/[\\%_]/g, '\\$&')}%`)
      where.push(
        `(e.vendor ILIKE $${params.length} OR e.note ILIKE $${params.length} OR c.name ILIKE $${params.length})`,
      )
    }

    const whereSql = where.join(' AND ')

    const totals = await query(
      `SELECT COUNT(*) AS count, COALESCE(SUM(e.amount), 0) AS total
         FROM expenses e
         JOIN categories c ON c.id = e.category_id
        WHERE ${whereSql}`,
      params,
    )

    const offset = (q.page - 1) * q.pageSize
    const { rows } = await query(
      `${SELECT_EXPENSE}
        WHERE ${whereSql}
        ORDER BY e.${q.sort} ${q.order.toUpperCase()}, e.created_at DESC
        LIMIT ${q.pageSize} OFFSET ${offset}`,
      params,
    )

    const items = await loadItems({ query }, rows.map((row) => row.id))

    res.json({
      items: rows.map((row) => mapExpense(row, items.get(row.id) ?? [])),
      page: q.page,
      pageSize: q.pageSize,
      total: totals.rows[0].count,
      totalAmount: totals.rows[0].total,
    })
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = normalizeCharging(parseOrThrow(expenseSchema, req.body))
    await assertReferences(req.user, input)

    const id = randomUUID()
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO expenses
           (id, user_id, category_id, vehicle_id, amount, spent_at, odometer, liters,
            price_per_liter, fuel_grade, is_full_tank, session_fee, idle_fee, connector,
            vendor, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          id,
          req.user.id,
          input.categoryId,
          input.vehicleId ?? null,
          amountFrom(input),
          input.spentAt,
          input.odometer ?? null,
          input.liters ?? null,
          input.pricePerLiter ?? null,
          input.fuelGrade ?? null,
          input.isFullTank,
          input.sessionFee ?? null,
          input.idleFee ?? null,
          input.connector ?? null,
          input.vendor || null,
          input.note || null,
        ],
      )

      if (input.items) await replaceItems(client, id, input.items)

      if (input.vehicleId && input.odometer) {
        await bumpOdometer(client, input.vehicleId, input.odometer)
      }
    })

    const created = await query(`${SELECT_EXPENSE} WHERE e.id = $1`, [id])
    const items = await loadItems({ query }, [id])

    res.status(201).json({ item: mapExpense(created.rows[0], items.get(id) ?? []) })
  }),
)

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const parsed = parseOrThrow(expenseSchema.partial(), req.body)
    const input = 'fuelGrade' in parsed ? normalizeCharging(parsed) : parsed
    await assertReferences(req.user, input)

    const { rowCount } = await query('SELECT 1 FROM expenses WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id,
    ])
    if (rowCount === 0) throw notFound('Расход не найден')

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE expenses
            SET category_id     = COALESCE($3, category_id),
                vehicle_id      = CASE WHEN $4 THEN $5 ELSE vehicle_id END,
                amount          = COALESCE($6, amount),
                spent_at        = COALESCE($7, spent_at),
                odometer        = CASE WHEN $8 THEN $9 ELSE odometer END,
                liters          = CASE WHEN $10 THEN $11 ELSE liters END,
                price_per_liter = CASE WHEN $12 THEN $13 ELSE price_per_liter END,
                fuel_grade      = CASE WHEN $14 THEN $15 ELSE fuel_grade END,
                is_full_tank    = COALESCE($16, is_full_tank),
                session_fee     = CASE WHEN $17 THEN $18 ELSE session_fee END,
                idle_fee        = CASE WHEN $19 THEN $20 ELSE idle_fee END,
                connector       = CASE WHEN $21 THEN $22 ELSE connector END,
                vendor          = CASE WHEN $23 THEN $24 ELSE vendor END,
                note            = CASE WHEN $25 THEN $26 ELSE note END
          WHERE id = $1 AND user_id = $2`,
        [
          req.params.id,
          req.user.id,
          input.categoryId ?? null,
          'vehicleId' in input,
          input.vehicleId ?? null,
          amountFrom(input) ?? null,
          input.spentAt ?? null,
          'odometer' in input,
          input.odometer ?? null,
          'liters' in input,
          input.liters ?? null,
          'pricePerLiter' in input,
          input.pricePerLiter ?? null,
          'fuelGrade' in input,
          input.fuelGrade ?? null,
          'isFullTank' in input ? input.isFullTank : null,
          'sessionFee' in input,
          input.sessionFee ?? null,
          'idleFee' in input,
          input.idleFee ?? null,
          'connector' in input,
          input.connector ?? null,
          'vendor' in input,
          input.vendor || null,
          'note' in input,
          input.note || null,
        ],
      )

      if (input.items) await replaceItems(client, req.params.id, input.items)

      if (input.vehicleId && input.odometer) {
        await bumpOdometer(client, input.vehicleId, input.odometer)
      }
    })

    const updated = await query(`${SELECT_EXPENSE} WHERE e.id = $1`, [req.params.id])
    const items = await loadItems({ query }, [req.params.id])

    res.json({ item: mapExpense(updated.rows[0], items.get(req.params.id) ?? []) })
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rowCount } = await query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id,
    ])
    if (rowCount === 0) throw notFound('Расход не найден')

    res.status(204).end()
  }),
)

export default router
