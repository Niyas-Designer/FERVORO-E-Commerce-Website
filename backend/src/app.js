import cors from 'cors'
import express from 'express'

const startedAt = Date.now()

/** Builds the Express app (kept separate from `listen` so it is easy to test). */
export function createApp({ corsOrigin = 'http://localhost:5173' } = {}) {
  const app = express()

  app.disable('x-powered-by')
  app.use(cors({ origin: corsOrigin.split(',').map((o) => o.trim()) }))
  app.use(express.json({ limit: '100kb' }))

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'fervoro-api',
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
    })
  })

  // Unknown API routes → JSON 404 (never HTML)
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }))

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  })

  return app
}
