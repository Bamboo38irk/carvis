import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { query } from '../db/pool.js'
import { CURRENCIES, DISTANCE_UNITS } from '../lib/constants.js'
import { asyncHandler, parseOrThrow, unauthorized } from '../lib/http.js'
import { createSession, deleteSession } from '../lib/sessions.js'
import { publicUser, USER_FIELDS } from '../lib/users.js'
import { requireAuth } from '../middleware/auth.js'
import { Router } from '../router.js'

const router = Router()

const loginSchema = z.object({
  login: z.string().trim().min(1, 'Введите логин'),
  password: z.string().min(1, 'Введите пароль'),
})

const profileSchema = z.object({
  currency: z.enum(CURRENCIES).optional(),
  distanceUnit: z.enum(DISTANCE_UNITS).optional(),
})

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const input = parseOrThrow(loginSchema, req.body)

    const { rows } = await query(
      `SELECT ${USER_FIELDS}, password_hash FROM users
        WHERE lower(login) = lower($1)`,
      [input.login],
    )
    const user = rows[0]
    if (!user || !(await bcrypt.compare(input.password, user.password_hash))) {
      throw unauthorized('Неверный логин или пароль')
    }

    res.json({ token: await createSession(user.id), user: publicUser(user) })
  }),
)

router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    await deleteSession(req.token)
    res.status(204).end()
  }),
)

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: publicUser(req.user) })
  }),
)

router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = parseOrThrow(profileSchema, req.body)

    const { rows } = await query(
      `UPDATE users
          SET currency      = COALESCE($2, currency),
              distance_unit = COALESCE($3, distance_unit)
        WHERE id = $1
    RETURNING ${USER_FIELDS}`,
      [req.user.id, input.currency ?? null, input.distanceUnit ?? null],
    )

    res.json({ user: publicUser(rows[0]) })
  }),
)

export default router
