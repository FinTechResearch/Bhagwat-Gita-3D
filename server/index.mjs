import http from 'node:http'
import { handleApiRequest } from './gita-router.mjs'
import { closeDatabase, tryOpenDatabase } from '../api/_db.js'

const port = Number.parseInt(process.env.PORT || '8787', 10)

const database = tryOpenDatabase()
const server = http.createServer((request, response) => {
  handleApiRequest(request, response).catch((error) => {
    if (!response.headersSent) {
      response.statusCode = database.ok ? 500 : 503
    }
    response.end(
      JSON.stringify({
        error: database.ok
          ? error instanceof Error ? error.message : String(error)
          : 'Source database unavailable',
        detail: database.ok ? undefined : database.error instanceof Error ? database.error.message : String(database.error),
        hint: database.ok
          ? undefined
          : `Set GITA_DB_PATH to a BhagwatGita.db file, or run "npm run dev:web" to use the committed content projection.`,
      }),
    )
  })
})
server.listen(port, () => {
  console.log(`Gita SQLite API listening on http://localhost:${port}`)
  if (database.ok) return
  console.warn(`\n  WARNING: could not open the source database at ${database.path}`)
  console.warn('  Live /api/verses, /api/chapters, and /api/health will return 503.')
  console.warn('  The web reader still works: it uses the committed src/data/gita.json projection.')
  console.warn('  Set GITA_DB_PATH to a BhagwatGita.db file to enable the live API.\n')
})

const shutdown = () => {
  server.close(() => {
    closeDatabase()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
