import { query } from '../db/pool.js'
import { randomToken } from './random.js'
import { USER_FIELDS } from './users.js'

export async function createSession(userId) {
  const token = randomToken()
  await query('INSERT INTO sessions (token, user_id) VALUES ($1, $2)', [token, userId])
  return token
}

export async function findSessionUser(token) {
  const { rows } = await query(
    `SELECT ${USER_FIELDS} FROM users
      WHERE id = (SELECT user_id FROM sessions WHERE token = $1)`,
    [token],
  )
  return rows[0] ?? null
}

export const deleteSession = (token) => query('DELETE FROM sessions WHERE token = $1', [token])
