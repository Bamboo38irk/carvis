import { randomUUID } from './random.js'

export const ITEM_KINDS = ['part', 'labour']

const round = (value) => Math.round(Number(value) * 100) / 100

const lineTotal = (item) => round(Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0))

export const itemsTotal = (items) =>
  round((items ?? []).reduce((sum, item) => sum + lineTotal(item), 0))

const mapItem = (row) => ({
  id: row.id,
  kind: row.kind,
  name: row.name,
  quantity: Number(row.quantity),
  unitPrice: Number(row.unit_price),
  partCode: row.part_code,
  total: round(Number(row.quantity) * Number(row.unit_price)),
})

export async function loadItems(client, expenseIds) {
  const ids = [...new Set(expenseIds.filter(Boolean))]
  if (ids.length === 0) return new Map()

  const placeholders = ids.map((unused, index) => `$${index + 1}`).join(', ')
  const { rows } = await client.query(
    `SELECT * FROM expense_items WHERE expense_id IN (${placeholders}) ORDER BY position, created_at`,
    ids,
  )

  const byExpense = new Map()
  for (const row of rows) {
    if (!byExpense.has(row.expense_id)) byExpense.set(row.expense_id, [])
    byExpense.get(row.expense_id).push(mapItem(row))
  }
  return byExpense
}

export async function replaceItems(client, expenseId, items) {
  await client.query('DELETE FROM expense_items WHERE expense_id = $1', [expenseId])
  if (!items || items.length === 0) return

  for (const [position, item] of items.entries()) {
    await client.query(
      `INSERT INTO expense_items
         (id, expense_id, kind, name, quantity, unit_price, part_code, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        randomUUID(),
        expenseId,
        item.kind,
        item.name,
        item.quantity,
        item.unitPrice,
        item.partCode || null,
        position,
      ],
    )
  }
}
