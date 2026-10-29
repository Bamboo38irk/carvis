import { z } from 'zod'
import { query } from '../db/pool.js'
import { CHARGER_CONNECTOR_LABELS, FUEL_GRADE_LABELS } from '../lib/constants.js'
import { buildCsv, buildXlsx } from '../lib/export.js'
import { asyncHandler, parseOrThrow } from '../lib/http.js'
import { Router } from '../router.js'

const router = Router()

const exportSchema = z.object({
  format: z.enum(['csv', 'xlsx']).default('csv'),
  vehicleId: z.string().uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

router.get(
  '/expenses',
  asyncHandler(async (req, res) => {
    const input = parseOrThrow(exportSchema, req.query)

    const where = ['e.user_id = $1']
    const params = [req.user.id]

    if (input.vehicleId) {
      params.push(input.vehicleId)
      where.push(`e.vehicle_id = $${params.length}`)
    }
    if (input.from) {
      params.push(input.from)
      where.push(`e.spent_at >= $${params.length}`)
    }
    if (input.to) {
      params.push(input.to)
      where.push(`e.spent_at <= $${params.length}`)
    }

    const { rows } = await query(
      `SELECT e.spent_at, e.amount, e.odometer, e.liters, e.price_per_liter, e.fuel_grade,
              e.is_full_tank, e.session_fee, e.idle_fee, e.connector, e.vendor, e.note,
              c.name AS category_name, v.title AS vehicle_title
         FROM expenses e
         JOIN categories c ON c.id = e.category_id
         LEFT JOIN vehicles v ON v.id = e.vehicle_id
        WHERE ${where.join(' AND ')}
        ORDER BY e.spent_at DESC`,
      params,
    )

    const expenses = rows.map((row) => ({
      ...row,
      fuel_grade: row.fuel_grade ? FUEL_GRADE_LABELS[row.fuel_grade] : null,
      connector: row.connector ? CHARGER_CONNECTOR_LABELS[row.connector] : null,
    }))

    const stamp = new Date().toISOString().slice(0, 10)

    if (input.format === 'xlsx') {
      const file = await buildXlsx(expenses, { currency: req.user.currency })
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      res.setHeader('Content-Disposition', `attachment; filename="carvis-${stamp}.xlsx"`)
      return res.send(file)
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="carvis-${stamp}.csv"`)
    res.send(buildCsv(expenses))
  }),
)

export default router
