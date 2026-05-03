/**
 * Compatibility layer: wraps sql.js with a better-sqlite3-style synchronous API.
 * Allows ipc.ts to use db.prepare('...').run() / .all() / .get() unchanged.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import initSqlJs from 'sql.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let rawDb: any
let dbPath: string

// Save the in-memory SQLite database to disk after every write.
function persist(): void {
  if (!rawDb || !dbPath) return
  const data: Uint8Array = rawDb.export()
  writeFileSync(dbPath, Buffer.from(data))
}

// Convert a better-sqlite3-style param array into what sql.js expects.
// better-sqlite3: .run({ id: '1', name: 'foo' }) → SQL uses @id, @name
// sql.js:         stmt.bind({ '@id': '1', '@name': 'foo' })
function toSqlJs(args: unknown[]): unknown {
  if (args.length === 0) return undefined
  if (args.length > 1) return args           // positional spread → array
  const a = args[0]
  if (a === null || a === undefined) return undefined
  if (Array.isArray(a)) return a             // already array
  if (typeof a === 'object') {
    // Named params — prefix every key with '@'
    return Object.fromEntries(
      Object.entries(a as Record<string, unknown>).map(([k, v]) => [`@${k}`, v])
    )
  }
  return [a]                                 // single scalar → wrap in array
}

class CompatStatement {
  constructor(private sql: string) {}

  run(...args: unknown[]): void {
    const stmt = rawDb.prepare(this.sql)
    const p = toSqlJs(args)
    if (p !== undefined) stmt.bind(p)
    stmt.step()
    stmt.free()
    persist()
  }

  all(...args: unknown[]): Record<string, unknown>[] {
    const stmt = rawDb.prepare(this.sql)
    const p = toSqlJs(args)
    if (p !== undefined) stmt.bind(p)
    const cols: string[] = stmt.getColumnNames()
    const rows: Record<string, unknown>[] = []
    while (stmt.step()) {
      const row: unknown[] = stmt.get()
      rows.push(Object.fromEntries(cols.map((c, i) => [c, row[i]])))
    }
    stmt.free()
    return rows
  }

  get(...args: unknown[]): Record<string, unknown> | undefined {
    const stmt = rawDb.prepare(this.sql)
    const p = toSqlJs(args)
    if (p !== undefined) stmt.bind(p)
    if (!stmt.step()) { stmt.free(); return undefined }
    const cols: string[] = stmt.getColumnNames()
    const row: unknown[] = stmt.get()
    stmt.free()
    return Object.fromEntries(cols.map((c, i) => [c, row[i]]))
  }
}

export class CompatDB {
  exec(sql: string): void { rawDb.run(sql); persist() }
  pragma(str: string): void { rawDb.run(`PRAGMA ${str}`) }
  prepare(sql: string): CompatStatement { return new CompatStatement(sql) }
}

export function exportDBBytes(): Uint8Array {
  return rawDb ? rawDb.export() : new Uint8Array()
}

export function getDBPath(): string { return dbPath }

export async function createDB(path: string): Promise<CompatDB> {
  dbPath = path

  // Locate the sql.js WASM file next to the package
  const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm')
  const SQL = await initSqlJs({ locateFile: () => wasmPath })

  rawDb = existsSync(path)
    ? new SQL.Database(readFileSync(path))
    : new SQL.Database()

  return new CompatDB()
}
