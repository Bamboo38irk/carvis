import { AxiosError } from 'axios'
import { handleRequest } from '@/backend'

const parseBody = (data) => {
  if (typeof data !== 'string' || data === '') return data
  try {
    return JSON.parse(data)
  } catch {
    return data
  }
}

const toQuery = (url, params = {}) => {
  const query = Object.fromEntries(new URLSearchParams(url.split('?')[1] ?? ''))
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query[key] = String(value)
  }
  return query
}

const toData = (res, config) => {
  if (res.body === undefined) return ''
  if (config.responseType === 'blob' && res.statusCode < 400) {
    return new Blob([res.body], { type: res.headers['content-type'] })
  }
  return JSON.parse(JSON.stringify(res.body))
}

export async function localAdapter(config) {
  const res = await handleRequest({
    method: config.method.toUpperCase(),
    path: config.url.split('?')[0],
    query: toQuery(config.url, config.params),
    body: parseBody(config.data),
    headers: { authorization: config.headers.get('Authorization') ?? undefined },
  })

  const response = {
    data: toData(res, config),
    status: res.statusCode,
    statusText: '',
    headers: res.headers,
    config,
    request: {},
  }

  if (res.statusCode >= 400) {
    throw new AxiosError(
      `Request failed with status code ${res.statusCode}`,
      res.statusCode >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
      config,
      response.request,
      response,
    )
  }

  return response
}
