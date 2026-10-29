import { PGlite, types } from '@electric-sql/pglite'

let db = null

const parsers = {
  [types.INT8]: (value) => Number(value),
  [types.NUMERIC]: (value) => Number(value),
  [types.DATE]: (value) => value,
}

const toResult = (result) => ({
  rows: result.rows,
  rowCount: result.fields.length > 0 ? result.rows.length : (result.affectedRows ?? 0),
})

export async function openDatabase(dataDir) {
  db = await PGlite.create(dataDir, { parsers })
  return db
}

export async function migrate(migrations) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `)
  const { rows } = await db.query('SELECT name FROM schema_migrations')
  const applied = new Set(rows.map((row) => row.name))

  for (const migration of migrations) {
    if (applied.has(migration.name)) continue
    await db.transaction(async (tx) => {
      await tx.exec(migration.sql)
      await tx.query('INSERT INTO schema_migrations (name) VALUES ($1)', [migration.name])
    })
  }
}

export async function query(text, params) {
  return toResult(await db.query(text, params))
}

export async function withTransaction(callback) {
  return db.transaction((tx) =>
    callback({
      query: async (text, params) => toResult(await tx.query(text, params)),
    }),
  )
}
