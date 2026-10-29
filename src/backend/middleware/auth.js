import { unauthorized } from '../lib/http.js'
import { findSessionUser } from '../lib/sessions.js'

export async function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ')
  if (scheme !== 'Bearer' || !token) return next(unauthorized())

  const user = await findSessionUser(token)
  if (!user) return next(unauthorized('Сессия истекла, войдите заново'))

  req.user = user
  req.token = token
  next()
}
