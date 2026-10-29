import { query } from '../db/pool.js'
import { notFound } from './http.js'

export async function assertVehicleAccess(userId, vehicleId) {
  const { rows } = await query('SELECT * FROM vehicles WHERE id = $1 AND user_id = $2', [
    vehicleId,
    userId,
  ])
  if (!rows[0]) throw notFound('Транспорт не найден')
  return rows[0]
}
