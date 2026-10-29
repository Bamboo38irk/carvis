import { requireAuth } from './middleware/auth.js'
import { createApp } from './router.js'
import authRoutes from './routes/auth.js'
import categoryRoutes from './routes/categories.js'
import expenseRoutes from './routes/expenses.js'
import exportRoutes from './routes/exports.js'
import importRoutes from './routes/imports.js'
import passportRoutes, { publicRouter } from './routes/passports.js'
import statsRoutes from './routes/stats.js'
import vehicleRoutes from './routes/vehicles.js'

export function createBackendApp() {
  const app = createApp()

  app.use('/auth', authRoutes)
  app.use('/public', publicRouter)
  app.use('/vehicles', requireAuth, vehicleRoutes)
  app.use('/categories', requireAuth, categoryRoutes)
  app.use('/expenses', requireAuth, expenseRoutes)
  app.use('/stats', requireAuth, statsRoutes)
  app.use('/passports', requireAuth, passportRoutes)
  app.use('/export', requireAuth, exportRoutes)
  app.use('/import', requireAuth, importRoutes)

  return app
}
