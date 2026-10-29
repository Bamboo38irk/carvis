import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { query } from '../db/pool.js'
import { assertVehicleAccess } from '../lib/access.js'
import { FUEL_GRADE_LABELS } from '../lib/constants.js'
import { asyncHandler, forbidden, notFound, parseOrThrow } from '../lib/http.js'
import { randomToken, randomUUID } from '../lib/random.js'
import { Router } from '../router.js'

const router = Router()

const createSchema = z.object({
  vehicleId: z.string().uuid('Выберите транспорт'),
  pin: z
    .string()
    .trim()
    .regex(/^\d{4,8}$/, 'PIN-код: от 4 до 8 цифр')
    .nullish()
    .or(z.literal('')),
  includeAmounts: z.boolean().default(true),
  expiresInDays: z.coerce.number().int().min(1).max(365).nullish(),
})

const mapPassport = (row) => ({
  id: row.id,
  token: row.token,
  vehicleId: row.vehicle_id,
  includeAmounts: row.include_amounts,
  hasPin: Boolean(row.pin_hash),
  expiresAt: row.expires_at,
  views: row.views,
  revokedAt: row.revoked_at,
})

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      'SELECT * FROM vehicle_passports WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id],
    )
    res.json({ items: rows.map(mapPassport) })
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = parseOrThrow(createSchema, req.body)
    await assertVehicleAccess(req.user.id, input.vehicleId)

    const token = randomToken(16)
    const pinHash = input.pin ? await bcrypt.hash(String(input.pin), 10) : null
    const expiresAt = input.expiresInDays
      ? new Date(Date.now() + input.expiresInDays * 86_400_000)
      : null

    const id = randomUUID()
    await query(
      `INSERT INTO vehicle_passports
         (id, vehicle_id, user_id, token, pin_hash, include_amounts, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, input.vehicleId, req.user.id, token, pinHash, input.includeAmounts, expiresAt],
    )

    const { rows } = await query('SELECT * FROM vehicle_passports WHERE id = $1', [id])
    res.status(201).json({ item: mapPassport(rows[0]) })
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rowCount } = await query(
      'UPDATE vehicle_passports SET revoked_at = now() WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id],
    )
    if (rowCount === 0) throw notFound('Паспорт не найден')
    res.status(204).end()
  }),
)

export const publicRouter = Router()

publicRouter.get(
  '/passport/:token',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT v.*, p.id AS passport_id, p.vehicle_id, p.include_amounts, p.pin_hash,
              p.expires_at, p.revoked_at, owner.login AS owner_login,
              owner.currency AS owner_currency
         FROM vehicle_passports p
         JOIN vehicles v ON v.id = p.vehicle_id
         JOIN users owner ON owner.id = p.user_id
        WHERE p.token = $1`,
      [req.params.token],
    )

    const passport = rows[0]
    if (!passport) throw notFound('Ссылка не найдена')
    if (passport.revoked_at) throw forbidden('Владелец отозвал доступ к этой ссылке')
    if (passport.expires_at && new Date(passport.expires_at) < new Date()) {
      throw forbidden('Срок действия ссылки истек')
    }

    if (passport.pin_hash) {
      const pin = req.query.pin ? String(req.query.pin) : ''
      const matches = pin ? await bcrypt.compare(pin, passport.pin_hash) : false
      if (!matches) {
        return res.status(401).json({
          error: { message: pin ? 'Неверный PIN-код' : 'Требуется PIN-код', details: { pin: true } },
          pinRequired: true,
        })
      }
    }

    const [history, totals, fuel] = await Promise.all([
      query(
        `SELECT e.spent_at, e.amount, e.odometer, e.vendor, e.note, e.liters, e.fuel_grade,
                c.name AS category_name, c.color AS category_color
           FROM expenses e
           JOIN categories c ON c.id = e.category_id
          WHERE e.vehicle_id = $1
          ORDER BY e.spent_at DESC
          LIMIT 400`,
        [passport.vehicle_id],
      ),
      query(
        `SELECT c.name, c.color, COUNT(*) AS count, COALESCE(SUM(e.amount), 0) AS total
           FROM expenses e
           JOIN categories c ON c.id = e.category_id
          WHERE e.vehicle_id = $1
          GROUP BY c.id, c.name, c.color
          ORDER BY total DESC`,
        [passport.vehicle_id],
      ),
      query(
        `SELECT COALESCE(SUM(e.liters), 0) AS liters, MIN(e.spent_at) AS first_date
           FROM expenses e WHERE e.vehicle_id = $1`,
        [passport.vehicle_id],
      ),
    ])

    await query('UPDATE vehicle_passports SET views = views + 1 WHERE id = $1', [
      passport.passport_id,
    ])

    const includeAmounts = passport.include_amounts

    res.json({
      vehicle: {
        title: passport.title,
        vehicleType: passport.vehicle_type,
        make: passport.make,
        model: passport.model,
        year: passport.year,
        plate: passport.plate,
        vin: passport.vin,
        fuelGradeLabel: FUEL_GRADE_LABELS[passport.fuel_grade] ?? passport.fuel_grade,
        odometer: passport.odometer,
        purchaseDate: passport.purchase_date,
        odometerAtPurchase: passport.odometer_at_purchase,
      },
      owner: { login: passport.owner_login, currency: passport.owner_currency },
      generatedAt: new Date().toISOString(),
      includeAmounts,
      summary: {
        recordsCount: history.rowCount,
        firstRecord: fuel.rows[0].first_date,
        liters: Number(fuel.rows[0].liters),
        total: includeAmounts
          ? totals.rows.reduce((sum, row) => sum + Number(row.total), 0)
          : null,
      },
      byCategory: totals.rows.map((row) => ({
        name: row.name,
        color: row.color,
        count: row.count,
        total: includeAmounts ? Number(row.total) : null,
      })),
      history: history.rows.map((row) => ({
        spentAt: row.spent_at,
        amount: includeAmounts ? row.amount : null,
        odometer: row.odometer,
        vendor: row.vendor,
        note: row.note,
        liters: row.liters,
        fuelGradeLabel: row.fuel_grade ? FUEL_GRADE_LABELS[row.fuel_grade] : null,
        categoryName: row.category_name,
        categoryColor: row.category_color,
      })),
    })
  }),
)

export default router
