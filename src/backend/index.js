import { createBackendApp } from './app.js'
import { migrate, openDatabase } from './db/pool.js'

const DATABASE = 'idb://carvis'

const migrations = Object.entries(
  import.meta.glob('./db/migrations/*.sql', { query: '?raw', import: 'default', eager: true }),
)
  .map(([path, sql]) => ({ name: path.split('/').pop(), sql }))
  .sort((a, b) => a.name.localeCompare(b.name))

const app = createBackendApp()
let ready = null

async function start() {
  await openDatabase(DATABASE)
  await migrate(migrations)
}

export async function handleRequest(request) {
  ready ??= start()
  await ready
  return app.handle(request)
}
