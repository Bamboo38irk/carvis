export const USER_FIELDS = 'id, login, currency, distance_unit, created_at'

export const publicUser = (row) => ({
  login: row.login,
  currency: row.currency,
  distanceUnit: row.distance_unit,
  createdAt: row.created_at,
})
