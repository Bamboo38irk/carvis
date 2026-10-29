import { z } from 'zod'
import { query, withTransaction } from '../db/pool.js'
import { assertVehicleAccess } from '../lib/access.js'
import { FUEL_GRADES, VEHICLE_TYPES } from '../lib/constants.js'
import { asyncHandler, parseOrThrow } from '../lib/http.js'
import { randomUUID } from '../lib/random.js'
import { vehicleTitle } from '../lib/vehicles.js'
import { Router } from '../router.js'

const router = Router()

const vehicleSchema = z.object({
  vehicleType: z.enum(VEHICLE_TYPES).default('car'),
  make: z.string().trim().max(60).optional().or(z.literal('')),
  model: z.string().trim().max(60).optional().or(z.literal('')),
  year: z.coerce.number().int().min(1900).max(2100).nullish(),
  plate: z.string().trim().max(20).optional().or(z.literal('')),
  vin: z
    .string()
    .trim()
    .max(17)
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/i, 'VIN состоит из 17 символов без букв I, O и Q')
    .optional()
    .or(z.literal('')),
  fuelGrade: z.enum(FUEL_GRADES).default('ai95'),
  tankVolume: z.coerce.number().positive().max(2000).nullish(),
  odometer: z.coerce.number().int().min(0).max(10_000_000).default(0),
  purchaseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата в формате ГГГГ-ММ-ДД')
    .nullish()
    .or(z.literal('')),
  purchasePrice: z.coerce.number().positive().max(1_000_000_000).nullish(),
  odometerAtPurchase: z.coerce.number().int().min(0).max(10_000_000).nullish(),
  isPrimary: z.boolean().default(false),
})

const mapVehicle = (row) => ({
  id: row.id,
  title: row.title,
  vehicleType: row.vehicle_type,
  make: row.make,
  model: row.model,
  year: row.year,
  plate: row.plate,
  vin: row.vin,
  fuelGrade: row.fuel_grade,
  tankVolume: row.tank_volume,
  odometer: row.odometer,
  purchaseDate: row.purchase_date,
  purchasePrice: row.purchase_price,
  odometerAtPurchase: row.odometer_at_purchase,
  isPrimary: row.is_primary,
  expensesTotal: row.expenses_total ?? 0,
  expensesCount: row.expenses_count ?? 0,
})

const emptyToNull = (value) => (value === '' || value === undefined ? null : value)

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT v.*,
              COALESCE(agg.total, 0) AS expenses_total,
              COALESCE(agg.count, 0) AS expenses_count
         FROM vehicles v
         LEFT JOIN (SELECT vehicle_id, SUM(amount) AS total, COUNT(*) AS count
                      FROM expenses GROUP BY vehicle_id) agg ON agg.vehicle_id = v.id
        WHERE v.user_id = $1
        ORDER BY v.is_primary DESC, v.created_at`,
      [req.user.id],
    )
    res.json({ items: rows.map(mapVehicle) })
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = parseOrThrow(vehicleSchema, req.body)

    const created = await withTransaction(async (client) => {
      const { rows: existing } = await client.query(
        'SELECT COUNT(*) AS count FROM vehicles WHERE user_id = $1',
        [req.user.id],
      )
      const isPrimary = input.isPrimary || existing[0].count === 0

      if (isPrimary) {
        await client.query('UPDATE vehicles SET is_primary = false WHERE user_id = $1', [req.user.id])
      }

      const vehicleId = randomUUID()
      await client.query(
        `INSERT INTO vehicles
           (id, user_id, title, vehicle_type, make, model, year, plate, vin, fuel_grade,
            tank_volume, odometer, purchase_date, purchase_price, odometer_at_purchase, is_primary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          vehicleId,
          req.user.id,
          vehicleTitle(input),
          input.vehicleType,
          emptyToNull(input.make),
          emptyToNull(input.model),
          input.year ?? null,
          emptyToNull(input.plate),
          emptyToNull(input.vin),
          input.fuelGrade,
          input.tankVolume ?? null,
          input.odometer,
          emptyToNull(input.purchaseDate),
          input.purchasePrice ?? null,
          input.odometerAtPurchase ?? null,
          isPrimary,
        ],
      )
      const { rows } = await client.query('SELECT * FROM vehicles WHERE id = $1', [vehicleId])
      return rows[0]
    })

    res.status(201).json({ item: mapVehicle(created) })
  }),
)

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const input = parseOrThrow(vehicleSchema.partial(), req.body)
    await assertVehicleAccess(req.user.id, req.params.id)

    const updated = await withTransaction(async (client) => {
      if (input.isPrimary) {
        await client.query('UPDATE vehicles SET is_primary = false WHERE user_id = $1', [req.user.id])
      }

      await client.query(
        `UPDATE vehicles
            SET vehicle_type         = COALESCE($3, vehicle_type),
                make                 = CASE WHEN $4  THEN $5  ELSE make END,
                model                = CASE WHEN $6  THEN $7  ELSE model END,
                year                 = CASE WHEN $8  THEN $9  ELSE year END,
                plate                = CASE WHEN $10 THEN $11 ELSE plate END,
                vin                  = CASE WHEN $12 THEN $13 ELSE vin END,
                fuel_grade           = COALESCE($14, fuel_grade),
                tank_volume          = CASE WHEN $15 THEN $16 ELSE tank_volume END,
                odometer             = COALESCE($17, odometer),
                purchase_date        = CASE WHEN $18 THEN $19 ELSE purchase_date END,
                purchase_price       = CASE WHEN $20 THEN $21 ELSE purchase_price END,
                odometer_at_purchase = CASE WHEN $22 THEN $23
                                            ELSE odometer_at_purchase END,
                is_primary           = COALESCE($24, is_primary)
          WHERE id = $1 AND user_id = $2`,
        [
          req.params.id,
          req.user.id,
          input.vehicleType ?? null,
          'make' in input,
          emptyToNull(input.make),
          'model' in input,
          emptyToNull(input.model),
          'year' in input,
          input.year ?? null,
          'plate' in input,
          emptyToNull(input.plate),
          'vin' in input,
          emptyToNull(input.vin),
          input.fuelGrade ?? null,
          'tankVolume' in input,
          input.tankVolume ?? null,
          input.odometer ?? null,
          'purchaseDate' in input,
          emptyToNull(input.purchaseDate),
          'purchasePrice' in input,
          input.purchasePrice ?? null,
          'odometerAtPurchase' in input,
          input.odometerAtPurchase ?? null,
          input.isPrimary ?? null,
        ],
      )

      const { rows: savedRows } = await client.query('SELECT * FROM vehicles WHERE id = $1', [
        req.params.id,
      ])
      const saved = savedRows[0]
      const title = vehicleTitle({
        make: saved.make,
        model: saved.model,
        vehicleType: saved.vehicle_type,
      })
      if (title === saved.title) return saved

      await client.query('UPDATE vehicles SET title = $2 WHERE id = $1', [saved.id, title])
      const renamed = await client.query('SELECT * FROM vehicles WHERE id = $1', [saved.id])
      return renamed.rows[0]
    })

    res.json({ item: mapVehicle(updated) })
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await assertVehicleAccess(req.user.id, req.params.id)
    await query('DELETE FROM vehicles WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])
    res.status(204).end()
  }),
)

export default router
