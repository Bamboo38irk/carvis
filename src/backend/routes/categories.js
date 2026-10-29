import { z } from 'zod'
import { query } from '../db/pool.js'
import { asyncHandler, badRequest, notFound, parseOrThrow } from '../lib/http.js'
import { randomUUID } from '../lib/random.js'
import { Router } from '../router.js'

const router = Router()

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Укажите название').max(60),
  description: z.string().trim().max(200).optional().or(z.literal('')),
  icon: z.string().trim().max(40).default('receipt'),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Цвет указывается в формате #7c5cff')
    .default('#7c5cff'),
  kind: z.enum(['generic', 'fuel']).default('generic'),
})

const mapCategory = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  icon: row.icon,
  color: row.color,
  kind: row.kind,
  isSystem: row.user_id === null,
  expensesTotal: row.expenses_total ?? 0,
  expensesCount: row.expenses_count ?? 0,
})

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'category'

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT c.*,
              COALESCE(agg.total, 0) AS expenses_total,
              COALESCE(agg.count, 0) AS expenses_count
         FROM categories c
         LEFT JOIN (SELECT category_id, SUM(amount) AS total, COUNT(*) AS count
                      FROM expenses WHERE user_id = $1
                     GROUP BY category_id) agg ON agg.category_id = c.id
        WHERE c.user_id IS NULL OR c.user_id = $1
        ORDER BY c.sort_order, c.name`,
      [req.user.id],
    )
    res.json({ items: rows.map(mapCategory) })
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = parseOrThrow(categorySchema, req.body)

    const base = slugify(input.name)
    const { rows: taken } = await query(
      `SELECT slug FROM categories
        WHERE (user_id = $1 OR user_id IS NULL) AND slug LIKE $2`,
      [req.user.id, `${base}%`],
    )

    let slug = base
    let suffix = 2
    while (taken.some((row) => row.slug === slug)) {
      slug = `${base}-${suffix}`
      suffix += 1
    }

    const id = randomUUID()
    await query(
      `INSERT INTO categories (id, user_id, slug, name, description, icon, color, kind, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 100)`,
      [
        id,
        req.user.id,
        slug,
        input.name,
        input.description || null,
        input.icon,
        input.color,
        input.kind,
      ],
    )

    const { rows } = await query('SELECT * FROM categories WHERE id = $1', [id])
    res.status(201).json({ item: mapCategory(rows[0]) })
  }),
)

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const input = parseOrThrow(categorySchema.partial(), req.body)

    const { rows: found } = await query('SELECT user_id FROM categories WHERE id = $1', [
      req.params.id,
    ])
    if (found.length === 0) throw notFound('Категория не найдена')
    if (found[0].user_id === null) throw badRequest('Базовые категории нельзя изменять')
    if (found[0].user_id !== req.user.id) throw notFound('Категория не найдена')

    await query(
      `UPDATE categories
          SET name        = COALESCE($3, name),
              description = CASE WHEN $4 THEN $5 ELSE description END,
              icon        = COALESCE($6, icon),
              color       = COALESCE($7, color),
              kind        = COALESCE($8, kind)
        WHERE id = $1 AND user_id = $2`,
      [
        req.params.id,
        req.user.id,
        input.name ?? null,
        'description' in input,
        input.description || null,
        input.icon ?? null,
        input.color ?? null,
        input.kind ?? null,
      ],
    )

    const { rows } = await query('SELECT * FROM categories WHERE id = $1', [req.params.id])
    res.json({ item: mapCategory(rows[0]) })
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT c.user_id, COUNT(e.id) AS used
         FROM categories c
         LEFT JOIN expenses e ON e.category_id = c.id AND e.user_id = $2
        WHERE c.id = $1
        GROUP BY c.user_id`,
      [req.params.id, req.user.id],
    )
    const category = rows[0]

    if (!category) throw notFound('Категория не найдена')
    if (category.user_id === null) throw badRequest('Базовые категории нельзя удалять')
    if (category.user_id !== req.user.id) throw notFound('Категория не найдена')
    if (category.used > 0) {
      throw badRequest('В категории есть расходы. Сначала перенесите или удалите их.')
    }

    await query('DELETE FROM categories WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])
    res.status(204).end()
  }),
)

export default router
