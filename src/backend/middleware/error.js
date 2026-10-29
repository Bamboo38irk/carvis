import { HttpError } from '../lib/http.js'

const DB_ERRORS = {
  23505: [409, 'Такая запись уже существует'],
  23502: [400, 'Не заполнено обязательное поле'],
  23514: [400, 'Значение поля выходит за допустимые границы'],
  22003: [400, 'Значение поля выходит за допустимые границы'],
  '22P02': [400, 'Некорректное значение'],
  '22007': [400, 'Некорректная дата'],
  '22008': [400, 'Некорректная дата'],
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: `Неизвестный эндпоинт: ${req.method} ${req.path}` } })
}

export function handleError(error, res) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({
      error: { message: error.message, details: error.details },
    })
  }

  if (error.code === '23503') {
    const usedElsewhere = /update or delete/.test(error.message)
    return res.status(usedElsewhere ? 409 : 400).json({
      error: {
        message: usedElsewhere
          ? 'Запись используется и не может быть удалена'
          : 'Связанная запись не найдена',
      },
    })
  }

  const known = DB_ERRORS[error.code]
  if (known) {
    return res.status(known[0]).json({ error: { message: known[1] } })
  }

  console.error('[api]', error)
  res.status(500).json({ error: { message: 'Внутренняя ошибка' } })
}
