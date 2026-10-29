import { z } from 'zod'
import { query } from '../db/pool.js'
import { buildFuelSegments, reviewFuel, summarizeFuel } from '../lib/fuel.js'
import { asyncHandler, parseOrThrow } from '../lib/http.js'
import { Router } from '../router.js'

const router = Router()

const FUEL_BY_GRADE = `
  SELECT e.fuel_grade,
         COUNT(*)                     AS fills,
         COALESCE(SUM(e.liters), 0)   AS liters,
         SUM(e.liters * e.price_per_liter)
           / NULLIF(SUM(CASE WHEN e.price_per_liter IS NOT NULL THEN e.liters END), 0)
           AS weighted_price,
         MIN(e.price_per_liter)       AS min_price,
         MAX(e.price_per_liter)       AS max_price
    FROM expenses e
    JOIN categories c ON c.id = e.category_id
`

const mapGrade = (row) => ({
  grade: row.fuel_grade,
  fills: Number(row.fills),
  liters: Number(row.liters),
  pricePerUnit: row.weighted_price === null ? null : Number(row.weighted_price),
  minPrice: row.min_price === null ? null : Number(row.min_price),
  maxPrice: row.max_price === null ? null : Number(row.max_price),
})

function monthSpine(count) {
  const now = new Date()
  const spine = []
  for (let back = count - 1; back >= 0; back -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1))
    spine.push(
      `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`,
    )
  }
  return spine
}

const filterSchema = z.object({
  vehicleId: z.string().uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  months: z.coerce.number().int().min(3).max(24).default(12),
})

function buildFilter(userId, filters) {
  const where = ['e.user_id = $1']
  const params = [userId]

  if (filters.vehicleId) {
    params.push(filters.vehicleId)
    where.push(`e.vehicle_id = $${params.length}`)
  }
  if (filters.from) {
    params.push(filters.from)
    where.push(`e.spent_at >= $${params.length}`)
  }
  if (filters.to) {
    params.push(filters.to)
    where.push(`e.spent_at <= $${params.length}`)
  }

  return { whereSql: where.join(' AND '), params }
}

router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const filters = parseOrThrow(filterSchema, req.query)
    const { whereSql, params } = buildFilter(req.user.id, filters)

    const [totals, periods, byCategory, monthly, recent, fuel, mileage, byGrade] =
      await Promise.all([
      query(
        `SELECT COALESCE(SUM(e.amount), 0) AS total,
                COUNT(*)              AS count,
                COALESCE(AVG(e.amount), 0) AS average,
                MIN(e.spent_at)            AS first_date,
                MAX(e.spent_at)            AS last_date,
                MAX(e.amount)              AS biggest
           FROM expenses e
          WHERE ${whereSql}`,
        params,
      ),
      query(
        `SELECT
           COALESCE(SUM(CASE WHEN e.spent_at >= date_trunc('month', CURRENT_DATE)
                             THEN e.amount END), 0) AS this_month,
           COALESCE(SUM(CASE WHEN e.spent_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
                              AND e.spent_at <  date_trunc('month', CURRENT_DATE)
                             THEN e.amount END), 0) AS prev_month,
           COALESCE(SUM(CASE WHEN e.spent_at >= date_trunc('year', CURRENT_DATE)
                             THEN e.amount END), 0) AS this_year
           FROM expenses e
          WHERE ${whereSql}`,
        params,
      ),
      query(
        `SELECT c.id, c.name, c.icon, c.color,
                COALESCE(SUM(e.amount), 0) AS total,
                COUNT(e.id)           AS count
           FROM categories c
           JOIN expenses e ON e.category_id = c.id AND ${whereSql}
          GROUP BY c.id
          ORDER BY total DESC`,
        params,
      ),
      query(
        `SELECT to_char(e.spent_at, 'YYYY-MM') AS month,
                COALESCE(SUM(e.amount), 0)       AS total,
                COUNT(e.id)                      AS count
           FROM expenses e
          WHERE ${whereSql}
            AND e.spent_at >= date_trunc('month', CURRENT_DATE)
                              - make_interval(months => $${params.length + 1})
          GROUP BY month
          ORDER BY month`,
        [...params, filters.months - 1],
      ),
      query(
        `SELECT e.id, e.amount, e.spent_at, e.vendor,
                c.name AS category_name, c.color AS category_color,
                v.title AS vehicle_title
           FROM expenses e
           JOIN categories c ON c.id = e.category_id
           LEFT JOIN vehicles v ON v.id = e.vehicle_id
          WHERE ${whereSql}
          ORDER BY e.spent_at DESC, e.created_at DESC
          LIMIT 6`,
        params,
      ),
      query(
        `SELECT COALESCE(SUM(CASE WHEN e.fuel_grade IS DISTINCT FROM 'electric' THEN e.liters END), 0)
                  AS liters,
                COALESCE(SUM(CASE WHEN e.fuel_grade = 'electric' THEN e.liters END), 0) AS energy,
                COALESCE(SUM(CASE WHEN c.kind = 'fuel' THEN e.amount END), 0) AS fuel_cost
           FROM expenses e
           JOIN categories c ON c.id = e.category_id
          WHERE ${whereSql}`,
        params,
      ),
      query(
        `SELECT COALESCE(SUM(span), 0) AS distance
           FROM (SELECT MAX(e.odometer) - MIN(e.odometer) AS span
                   FROM expenses e
                  WHERE ${whereSql} AND e.odometer > 0
                  GROUP BY e.vehicle_id) spans`,
        params,
      ),
      query(
        `${FUEL_BY_GRADE}
          WHERE ${whereSql} AND c.kind = 'fuel' AND e.liters > 0
          GROUP BY e.fuel_grade
          ORDER BY SUM(e.liters) DESC`,
        params,
      ),
    ])

    const totalsRow = totals.rows[0]
    const periodsRow = periods.rows[0]
    const fuelRow = fuel.rows[0]
    const total = Number(totalsRow.total)

    const distance = Number(mileage.rows[0].distance)

    const prevMonth = Number(periodsRow.prev_month)
    const thisMonth = Number(periodsRow.this_month)

    res.json({
      totals: {
        total,
        count: totalsRow.count,
        average: Number(totalsRow.average),
        firstDate: totalsRow.first_date,
        lastDate: totalsRow.last_date,
        biggest: totalsRow.biggest,
        thisMonth,
        prevMonth,
        thisYear: Number(periodsRow.this_year),
        monthChangePercent: prevMonth > 0 ? ((thisMonth - prevMonth) / prevMonth) * 100 : null,
      },
      byCategory: byCategory.rows.map((row) => ({
        id: row.id,
        name: row.name,
        icon: row.icon,
        color: row.color,
        total: Number(row.total),
        count: row.count,
        share: total > 0 ? (Number(row.total) / total) * 100 : 0,
      })),
      monthly: (() => {
        const byMonth = new Map(monthly.rows.map((row) => [row.month, row]))
        return monthSpine(filters.months).map((month) => {
          const row = byMonth.get(month)
          const monthTotal = row ? Number(row.total) : 0
          return {
            month,
            total: monthTotal,
            count: row ? row.count : 0,
            share: total > 0 ? (monthTotal / total) * 100 : 0,
          }
        })
      })(),
      recent: recent.rows.map((row) => ({
        id: row.id,
        amount: row.amount,
        spentAt: row.spent_at,
        vendor: row.vendor,
        categoryName: row.category_name,
        categoryColor: row.category_color,
        vehicleTitle: row.vehicle_title,
      })),
      fuel: {
        liters: Number(fuelRow.liters),
        energy: Number(fuelRow.energy),
        fuelCost: Number(fuelRow.fuel_cost),
        grades: byGrade.rows.map(mapGrade),
        distance,
        costPerDistance: distance > 0 ? total / distance : null,
      },
    })
  }),
)

router.get(
  '/fuel',
  asyncHandler(async (req, res) => {
    const filters = parseOrThrow(filterSchema, req.query)

    const { rows: vehicles } = await query(
      `SELECT v.id, v.title, v.fuel_grade
         FROM vehicles v
        WHERE v.user_id = $1
          ${filters.vehicleId ? 'AND v.id = $2' : ''}
        ORDER BY v.is_primary DESC, v.created_at`,
      filters.vehicleId ? [req.user.id, filters.vehicleId] : [req.user.id],
    )

    const report = await Promise.all(
      vehicles.map(async (vehicle) => {
        const { rows: fills } = await query(
          `SELECT e.spent_at, e.odometer, e.liters, e.price_per_liter, e.is_full_tank,
                e.fuel_grade, e.amount
           FROM expenses e
           JOIN categories c ON c.id = e.category_id
          WHERE e.vehicle_id = $1 AND c.kind = 'fuel' AND e.liters IS NOT NULL
          ORDER BY e.odometer IS NULL, e.odometer, e.spent_at`,
          [vehicle.id],
        )

        const summary = summarizeFuel(buildFuelSegments(fills))
        const segments = summary.segments.slice(-12)
        const review = reviewFuel(fills, segments)

        const [totals, grades] = await Promise.all([
          query(
            `SELECT COUNT(*) AS fills,
                  COALESCE(SUM(e.liters), 0) AS liters,
                  COALESCE(SUM(e.amount), 0) AS cost,
                  SUM(e.liters * e.price_per_liter)
                    / NULLIF(SUM(CASE WHEN e.price_per_liter IS NOT NULL THEN e.liters END), 0)
                    AS avg_price,
                  MAX(e.spent_at) AS last_fill
             FROM expenses e
             JOIN categories c ON c.id = e.category_id
            WHERE e.vehicle_id = $1 AND c.kind = 'fuel'`,
            [vehicle.id],
          ),
          query(
            `${FUEL_BY_GRADE}
            WHERE e.vehicle_id = $1 AND c.kind = 'fuel' AND e.liters > 0
            GROUP BY e.fuel_grade
            ORDER BY SUM(e.liters) DESC`,
            [vehicle.id],
          ),
        ])

        return {
          vehicle: {
            id: vehicle.id,
            title: vehicle.title,
            fuelGrade: vehicle.fuel_grade,
          },
          ...summary,
          segments,
          review,
          fills: totals.rows[0].fills,
          totalLiters: Number(totals.rows[0].liters),
          totalCost: Number(totals.rows[0].cost),
          avgPricePerLiter: totals.rows[0].avg_price ? Number(totals.rows[0].avg_price) : null,
          grades: grades.rows.map(mapGrade),
          lastFill: totals.rows[0].last_fill,
          costPerDistance:
            summary.distance > 0 ? Number(totals.rows[0].cost) / summary.distance : null,
        }
      }),
    )

    res.json({ items: report })
  }),
)

export default router
