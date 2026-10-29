export class HttpError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

export const badRequest = (message, details) => new HttpError(400, message, details)
export const unauthorized = (message = 'Требуется авторизация') => new HttpError(401, message)
export const forbidden = (message = 'Недостаточно прав') => new HttpError(403, message)
export const notFound = (message = 'Не найдено') => new HttpError(404, message)

export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next)

export function parseOrThrow(schema, data) {
  const result = schema.safeParse(data)
  if (!result.success) {
    const details = {}
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || 'root'
      if (!details[key]) details[key] = issue.message
    }
    throw badRequest('Проверьте заполненные поля', details)
  }
  return result.data
}
