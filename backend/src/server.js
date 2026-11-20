import 'dotenv/config'
import { createApp } from './app.js'

const port = Number(process.env.PORT) || 4000
const app = createApp({ corsOrigin: process.env.CORS_ORIGIN })

const server = app.listen(port, () => {
  console.log(`[fervoro-api] listening on http://localhost:${port}`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
