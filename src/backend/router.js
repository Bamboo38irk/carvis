import { handleError, notFoundHandler } from './middleware/error.js'

const compilePath = (path) => {
  const keys = []
  const source = path
    .replace(/\/+$/, '')
    .replace(/:(\w+)/g, (match, key) => {
      keys.push(key)
      return '([^/]+)'
    })
  return { keys, regex: new RegExp(`^${source}/?$`) }
}

export function Router() {
  const routes = []

  const add = (method) => (path, ...handlers) => {
    routes.push({ method, handlers, ...compilePath(path) })
    return router
  }

  const router = {
    get: add('GET'),
    post: add('POST'),
    patch: add('PATCH'),
    delete: add('DELETE'),
    match(method, path) {
      for (const route of routes) {
        if (route.method !== method) continue
        const found = route.regex.exec(path)
        if (!found) continue
        const params = {}
        route.keys.forEach((key, index) => {
          params[key] = decodeURIComponent(found[index + 1])
        })
        return { handlers: route.handlers, params }
      }
      return null
    },
  }

  return router
}

const createResponse = () => {
  const res = { statusCode: 200, headers: {}, body: undefined, finished: false }
  res.status = (code) => {
    res.statusCode = code
    return res
  }
  res.setHeader = (name, value) => {
    res.headers[name.toLowerCase()] = value
    return res
  }
  res.json = (data) => {
    res.headers['content-type'] = 'application/json'
    res.body = data
    res.finished = true
    return res
  }
  res.send = (data) => {
    res.body = data
    res.finished = true
    return res
  }
  res.end = () => {
    res.finished = true
    return res
  }
  return res
}

async function runHandlers(handlers, req, res) {
  for (const handler of handlers) {
    let proceed = false
    let failure = null
    await handler(req, res, (error) => {
      if (error) failure = error
      else proceed = true
    })
    if (failure) throw failure
    if (!proceed || res.finished) return
  }
}

export function createApp() {
  const mounts = []

  return {
    use(prefix, ...handlers) {
      const router = handlers.pop()
      mounts.push({ prefix, middlewares: handlers, router })
    },

    async handle({ method, path, query = {}, body, headers = {} }) {
      const req = { method, path, query, body: body ?? {}, headers, params: {}, user: null }
      const res = createResponse()

      try {
        for (const { prefix, middlewares, router } of mounts) {
          if (path !== prefix && !path.startsWith(`${prefix}/`)) continue
          const matched = router.match(method, path.slice(prefix.length) || '/')
          if (!matched) continue

          req.params = matched.params
          await runHandlers([...middlewares, ...matched.handlers], req, res)
          return res
        }
        notFoundHandler(req, res)
      } catch (error) {
        handleError(error, res)
      }

      return res
    },
  }
}
