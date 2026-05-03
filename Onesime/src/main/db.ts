import { createDB, CompatDB } from './sqlcompat'

let db: CompatDB

export async function initDB(path: string): Promise<void> {
  db = await createDB(path)
  db.pragma('foreign_keys = ON')
  db.exec(schema)
  runMigrations()
}

export function getDB(): CompatDB {
  return db
}

function runMigrations() {
  try { db.exec(`ALTER TABLE documents ADD COLUMN transcription TEXT NOT NULL DEFAULT ''`) } catch {}
  try { db.exec(`ALTER TABLE zones ADD COLUMN transcription TEXT NOT NULL DEFAULT ''`) } catch {}
  try { db.exec(`ALTER TABLE fiches ADD COLUMN avatar_zone_id TEXT REFERENCES zones(id) ON DELETE SET NULL`) } catch {}
  try { db.exec(`ALTER TABLE album_documents ADD COLUMN caption TEXT NOT NULL DEFAULT ''`) } catch {}
  try { db.exec(`ALTER TABLE album_documents ADD COLUMN rotation REAL NOT NULL DEFAULT 0`) } catch {}
  try { db.exec(`ALTER TABLE album_documents ADD COLUMN crop_x REAL NOT NULL DEFAULT 0`) } catch {}
  try { db.exec(`ALTER TABLE album_documents ADD COLUMN crop_y REAL NOT NULL DEFAULT 0`) } catch {}
  try { db.exec(`ALTER TABLE album_documents ADD COLUMN crop_w REAL NOT NULL DEFAULT 1`) } catch {}
  try { db.exec(`ALTER TABLE album_documents ADD COLUMN crop_h REAL NOT NULL DEFAULT 1`) } catch {}
  try { db.exec(`ALTER TABLE album_documents ADD COLUMN brightness INTEGER NOT NULL DEFAULT 0`) } catch {}
  try { db.exec(`ALTER TABLE album_documents ADD COLUMN contrast INTEGER NOT NULL DEFAULT 0`) } catch {}
  try { db.exec(`ALTER TABLE album_documents ADD COLUMN flip_h INTEGER NOT NULL DEFAULT 0`) } catch {}
  try { db.exec(`ALTER TABLE album_documents ADD COLUMN flip_v INTEGER NOT NULL DEFAULT 0`) } catch {}
  try { db.exec(`ALTER TABLE persons ADD COLUMN avatar_zone_id TEXT REFERENCES zones(id) ON DELETE SET NULL`) } catch {}
  try { db.exec(`ALTER TABLE documents ADD COLUMN rotation REAL NOT NULL DEFAULT 0`) } catch {}
  try { db.exec(`ALTER TABLE documents ADD COLUMN crop_x REAL NOT NULL DEFAULT 0`) } catch {}
  try { db.exec(`ALTER TABLE documents ADD COLUMN crop_y REAL NOT NULL DEFAULT 0`) } catch {}
  try { db.exec(`ALTER TABLE documents ADD COLUMN crop_w REAL NOT NULL DEFAULT 1`) } catch {}
  try { db.exec(`ALTER TABLE documents ADD COLUMN crop_h REAL NOT NULL DEFAULT 1`) } catch {}
  try { db.exec(`ALTER TABLE documents ADD COLUMN brightness INTEGER NOT NULL DEFAULT 0`) } catch {}
  try { db.exec(`ALTER TABLE documents ADD COLUMN contrast INTEGER NOT NULL DEFAULT 0`) } catch {}
  try { db.exec(`ALTER TABLE documents ADD COLUMN flip_h INTEGER NOT NULL DEFAULT 0`) } catch {}
  try { db.exec(`ALTER TABLE documents ADD COLUMN flip_v INTEGER NOT NULL DEFAULT 0`) } catch {}
  try { db.exec(`ALTER TABLE zones ADD COLUMN face_descriptor TEXT`) } catch {}
  try { db.exec(`ALTER TABLE documents ADD COLUMN location TEXT NOT NULL DEFAULT ''`) } catch {}
  try { db.exec(`ALTER TABLE archives ADD COLUMN notes TEXT NOT NULL DEFAULT ''`) } catch {}
  try { db.exec(`ALTER TABLE persons ADD COLUMN birth_place TEXT NOT NULL DEFAULT ''`) } catch {}
  try { db.exec(`ALTER TABLE persons ADD COLUMN death_place TEXT NOT NULL DEFAULT ''`) } catch {}
  // Archives module
  try { db.exec(`CREATE TABLE IF NOT EXISTS depots (
    id TEXT PRIMARY KEY, archive_id TEXT NOT NULL REFERENCES archives(id) ON DELETE CASCADE,
    nom TEXT NOT NULL, sigle TEXT NOT NULL DEFAULT '', adresse TEXT NOT NULL DEFAULT '',
    telephone TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', url TEXT NOT NULL DEFAULT '',
    heures TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')))`) } catch {}
  try { db.exec(`CREATE TABLE IF NOT EXISTS sources_arch (
    id TEXT PRIMARY KEY, archive_id TEXT NOT NULL REFERENCES archives(id) ON DELETE CASCADE,
    depot_id TEXT REFERENCES depots(id) ON DELETE SET NULL,
    titre TEXT NOT NULL, abbrev TEXT NOT NULL DEFAULT '', auteur TEXT NOT NULL DEFAULT '',
    date_pub TEXT NOT NULL DEFAULT '', editeur TEXT NOT NULL DEFAULT '', lieu_pub TEXT NOT NULL DEFAULT '',
    cote TEXT NOT NULL DEFAULT '', type_source TEXT NOT NULL DEFAULT 'autre',
    date_debut TEXT NOT NULL DEFAULT '', date_fin TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')))`) } catch {}
  try { db.exec(`CREATE TABLE IF NOT EXISTS lieux (
    id TEXT PRIMARY KEY, archive_id TEXT NOT NULL REFERENCES archives(id) ON DELETE CASCADE,
    nom TEXT NOT NULL, type_lieu TEXT NOT NULL DEFAULT 'commune',
    parent_id TEXT REFERENCES lieux(id) ON DELETE SET NULL,
    code_insee TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')))`) } catch {}
  try { db.exec(`CREATE TABLE IF NOT EXISTS actes (
    id TEXT PRIMARY KEY, archive_id TEXT NOT NULL REFERENCES archives(id) ON DELETE CASCADE,
    source_id TEXT REFERENCES sources_arch(id) ON DELETE SET NULL,
    lieu_id TEXT REFERENCES lieux(id) ON DELETE SET NULL,
    type_acte TEXT NOT NULL DEFAULT 'autre', date_acte TEXT NOT NULL DEFAULT '',
    date_precision TEXT NOT NULL DEFAULT 'exacte', folio TEXT NOT NULL DEFAULT '',
    acte_num TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '',
    transcription TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`) } catch {}
  try { db.exec(`CREATE TABLE IF NOT EXISTS actes_parties (
    id TEXT PRIMARY KEY, acte_id TEXT NOT NULL REFERENCES actes(id) ON DELETE CASCADE,
    prenom TEXT NOT NULL DEFAULT '', nom TEXT NOT NULL DEFAULT '', age TEXT NOT NULL DEFAULT '',
    profession TEXT NOT NULL DEFAULT '', domicile TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'principal', notes TEXT NOT NULL DEFAULT '',
    ordre INTEGER NOT NULL DEFAULT 0)`) } catch {}
  // Registres table (simplified Archives v2)
  try { db.exec(`CREATE TABLE IF NOT EXISTS registres (
    id TEXT PRIMARY KEY, archive_id TEXT NOT NULL REFERENCES archives(id) ON DELETE CASCADE,
    nom TEXT NOT NULL, type_registre TEXT NOT NULL DEFAULT 'autre',
    date_debut TEXT NOT NULL DEFAULT '', date_fin TEXT NOT NULL DEFAULT '',
    lieu_nom TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')))`) } catch {}
  // New actes columns (simplified model)
  try { db.exec(`ALTER TABLE actes ADD COLUMN file_path TEXT NOT NULL DEFAULT ''`) } catch {}
  try { db.exec(`ALTER TABLE actes ADD COLUMN filename TEXT NOT NULL DEFAULT ''`) } catch {}
  try { db.exec(`ALTER TABLE actes ADD COLUMN registre_id TEXT REFERENCES registres(id) ON DELETE SET NULL`) } catch {}
  try { db.exec(`ALTER TABLE actes ADD COLUMN lieu_nom TEXT NOT NULL DEFAULT ''`) } catch {}
  try { db.exec(`ALTER TABLE registres ADD COLUMN default_type_acte TEXT NOT NULL DEFAULT ''`) } catch {}
  try { db.exec(`ALTER TABLE registres ADD COLUMN default_lieu_nom TEXT NOT NULL DEFAULT ''`) } catch {}
}

const schema = `
CREATE TABLE IF NOT EXISTS archives (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  root_path   TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fiches (
  id          TEXT PRIMARY KEY,
  archive_id  TEXT NOT NULL REFERENCES archives(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  date        TEXT NOT NULL DEFAULT '',
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS documents (
  id                 TEXT PRIMARY KEY,
  archive_id         TEXT NOT NULL REFERENCES archives(id) ON DELETE CASCADE,
  fiche_id           TEXT REFERENCES fiches(id) ON DELETE SET NULL,
  file_path          TEXT NOT NULL,
  filename           TEXT NOT NULL,
  mime_type          TEXT NOT NULL DEFAULT '',
  title              TEXT NOT NULL DEFAULT '',
  description        TEXT NOT NULL DEFAULT '',
  transcription      TEXT NOT NULL DEFAULT '',
  date               TEXT NOT NULL DEFAULT '',
  linked_document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
  link_type          TEXT NOT NULL DEFAULT '',
  created_at         TEXT DEFAULT (datetime('now')),
  updated_at         TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS zones (
  id          TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  x           REAL NOT NULL,
  y           REAL NOT NULL,
  width       REAL NOT NULL,
  height      REAL NOT NULL,
  label       TEXT NOT NULL DEFAULT '',
  notes       TEXT NOT NULL DEFAULT '',
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS persons (
  id         TEXT PRIMARY KEY,
  archive_id TEXT NOT NULL REFERENCES archives(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name  TEXT NOT NULL,
  birth_date TEXT NOT NULL DEFAULT '',
  death_date TEXT NOT NULL DEFAULT '',
  notes      TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS zone_persons (
  zone_id   TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  PRIMARY KEY (zone_id, person_id)
);

CREATE TABLE IF NOT EXISTS document_persons (
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  person_id   TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, person_id)
);

CREATE TABLE IF NOT EXISTS tags (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6B7280'
);

CREATE TABLE IF NOT EXISTS document_tags (
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag_id      TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, tag_id)
);

CREATE TABLE IF NOT EXISTS fiche_tags (
  fiche_id TEXT NOT NULL REFERENCES fiches(id) ON DELETE CASCADE,
  tag_id   TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (fiche_id, tag_id)
);

CREATE TABLE IF NOT EXISTS albums (
  id          TEXT PRIMARY KEY,
  archive_id  TEXT NOT NULL REFERENCES archives(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cover_doc_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS album_documents (
  album_id    TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (album_id, document_id)
);
`
