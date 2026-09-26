import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'

let database

/** Absolute path of the SQLite file this process will open. */
export function getDatabasePath() {
  return process.env.GITA_DB_PATH || path.resolve(process.cwd(), 'BhagwatGita.db')
}

export function getDatabase() {
  if (!database) {
    database = new DatabaseSync(getDatabasePath(), { readOnly: true })
  }
  return database
}

/**
 * Opens the database eagerly so startup problems surface immediately.
 * The source database is not committed, so a fresh clone legitimately has none;
 * callers should treat a failure as "run the web client only" rather than fatal.
 */
export function tryOpenDatabase() {
  try {
    getDatabase()
    return { ok: true }
  } catch (error) {
    return { ok: false, path: getDatabasePath(), error }
  }
}

export function closeDatabase() {
  if (database) {
    database.close()
    database = undefined
  }
}
