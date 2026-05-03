"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const initSqlJs = require("sql.js");
const crypto = require("crypto");
const child_process = require("child_process");
const http = require("http");
let rawDb;
let dbPath;
function persist() {
  if (!rawDb || !dbPath) return;
  const data = rawDb.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}
function toSqlJs(args) {
  if (args.length === 0) return void 0;
  if (args.length > 1) return args;
  const a = args[0];
  if (a === null || a === void 0) return void 0;
  if (Array.isArray(a)) return a;
  if (typeof a === "object") {
    return Object.fromEntries(
      Object.entries(a).map(([k, v]) => [`@${k}`, v])
    );
  }
  return [a];
}
class CompatStatement {
  constructor(sql) {
    this.sql = sql;
  }
  run(...args) {
    const stmt = rawDb.prepare(this.sql);
    const p = toSqlJs(args);
    if (p !== void 0) stmt.bind(p);
    stmt.step();
    stmt.free();
    persist();
  }
  all(...args) {
    const stmt = rawDb.prepare(this.sql);
    const p = toSqlJs(args);
    if (p !== void 0) stmt.bind(p);
    const cols = stmt.getColumnNames();
    const rows = [];
    while (stmt.step()) {
      const row = stmt.get();
      rows.push(Object.fromEntries(cols.map((c, i) => [c, row[i]])));
    }
    stmt.free();
    return rows;
  }
  get(...args) {
    const stmt = rawDb.prepare(this.sql);
    const p = toSqlJs(args);
    if (p !== void 0) stmt.bind(p);
    if (!stmt.step()) {
      stmt.free();
      return void 0;
    }
    const cols = stmt.getColumnNames();
    const row = stmt.get();
    stmt.free();
    return Object.fromEntries(cols.map((c, i) => [c, row[i]]));
  }
}
class CompatDB {
  exec(sql) {
    rawDb.run(sql);
    persist();
  }
  pragma(str) {
    rawDb.run(`PRAGMA ${str}`);
  }
  prepare(sql) {
    return new CompatStatement(sql);
  }
}
function exportDBBytes() {
  return rawDb ? rawDb.export() : new Uint8Array();
}
function getDBPath() {
  return dbPath;
}
async function createDB(path2) {
  dbPath = path2;
  const wasmPath = require.resolve("sql.js/dist/sql-wasm.wasm");
  const SQL = await initSqlJs({ locateFile: () => wasmPath });
  rawDb = fs.existsSync(path2) ? new SQL.Database(fs.readFileSync(path2)) : new SQL.Database();
  return new CompatDB();
}
let db;
async function initDB(path2) {
  db = await createDB(path2);
  db.pragma("foreign_keys = ON");
  db.exec(schema);
  runMigrations();
}
function getDB() {
  return db;
}
function runMigrations() {
  try {
    db.exec(`ALTER TABLE documents ADD COLUMN transcription TEXT NOT NULL DEFAULT ''`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE zones ADD COLUMN transcription TEXT NOT NULL DEFAULT ''`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE fiches ADD COLUMN avatar_zone_id TEXT REFERENCES zones(id) ON DELETE SET NULL`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE album_documents ADD COLUMN caption TEXT NOT NULL DEFAULT ''`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE album_documents ADD COLUMN rotation REAL NOT NULL DEFAULT 0`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE album_documents ADD COLUMN crop_x REAL NOT NULL DEFAULT 0`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE album_documents ADD COLUMN crop_y REAL NOT NULL DEFAULT 0`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE album_documents ADD COLUMN crop_w REAL NOT NULL DEFAULT 1`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE album_documents ADD COLUMN crop_h REAL NOT NULL DEFAULT 1`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE album_documents ADD COLUMN brightness INTEGER NOT NULL DEFAULT 0`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE album_documents ADD COLUMN contrast INTEGER NOT NULL DEFAULT 0`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE album_documents ADD COLUMN flip_h INTEGER NOT NULL DEFAULT 0`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE album_documents ADD COLUMN flip_v INTEGER NOT NULL DEFAULT 0`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE persons ADD COLUMN avatar_zone_id TEXT REFERENCES zones(id) ON DELETE SET NULL`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE documents ADD COLUMN rotation REAL NOT NULL DEFAULT 0`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE documents ADD COLUMN crop_x REAL NOT NULL DEFAULT 0`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE documents ADD COLUMN crop_y REAL NOT NULL DEFAULT 0`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE documents ADD COLUMN crop_w REAL NOT NULL DEFAULT 1`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE documents ADD COLUMN crop_h REAL NOT NULL DEFAULT 1`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE documents ADD COLUMN brightness INTEGER NOT NULL DEFAULT 0`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE documents ADD COLUMN contrast INTEGER NOT NULL DEFAULT 0`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE documents ADD COLUMN flip_h INTEGER NOT NULL DEFAULT 0`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE documents ADD COLUMN flip_v INTEGER NOT NULL DEFAULT 0`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE zones ADD COLUMN face_descriptor TEXT`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE documents ADD COLUMN location TEXT NOT NULL DEFAULT ''`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE archives ADD COLUMN notes TEXT NOT NULL DEFAULT ''`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE persons ADD COLUMN birth_place TEXT NOT NULL DEFAULT ''`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE persons ADD COLUMN death_place TEXT NOT NULL DEFAULT ''`);
  } catch {
  }
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS depots (
    id TEXT PRIMARY KEY, archive_id TEXT NOT NULL REFERENCES archives(id) ON DELETE CASCADE,
    nom TEXT NOT NULL, sigle TEXT NOT NULL DEFAULT '', adresse TEXT NOT NULL DEFAULT '',
    telephone TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', url TEXT NOT NULL DEFAULT '',
    heures TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')))`);
  } catch {
  }
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS sources_arch (
    id TEXT PRIMARY KEY, archive_id TEXT NOT NULL REFERENCES archives(id) ON DELETE CASCADE,
    depot_id TEXT REFERENCES depots(id) ON DELETE SET NULL,
    titre TEXT NOT NULL, abbrev TEXT NOT NULL DEFAULT '', auteur TEXT NOT NULL DEFAULT '',
    date_pub TEXT NOT NULL DEFAULT '', editeur TEXT NOT NULL DEFAULT '', lieu_pub TEXT NOT NULL DEFAULT '',
    cote TEXT NOT NULL DEFAULT '', type_source TEXT NOT NULL DEFAULT 'autre',
    date_debut TEXT NOT NULL DEFAULT '', date_fin TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')))`);
  } catch {
  }
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS lieux (
    id TEXT PRIMARY KEY, archive_id TEXT NOT NULL REFERENCES archives(id) ON DELETE CASCADE,
    nom TEXT NOT NULL, type_lieu TEXT NOT NULL DEFAULT 'commune',
    parent_id TEXT REFERENCES lieux(id) ON DELETE SET NULL,
    code_insee TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')))`);
  } catch {
  }
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS actes (
    id TEXT PRIMARY KEY, archive_id TEXT NOT NULL REFERENCES archives(id) ON DELETE CASCADE,
    source_id TEXT REFERENCES sources_arch(id) ON DELETE SET NULL,
    lieu_id TEXT REFERENCES lieux(id) ON DELETE SET NULL,
    type_acte TEXT NOT NULL DEFAULT 'autre', date_acte TEXT NOT NULL DEFAULT '',
    date_precision TEXT NOT NULL DEFAULT 'exacte', folio TEXT NOT NULL DEFAULT '',
    acte_num TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '',
    transcription TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`);
  } catch {
  }
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS actes_parties (
    id TEXT PRIMARY KEY, acte_id TEXT NOT NULL REFERENCES actes(id) ON DELETE CASCADE,
    prenom TEXT NOT NULL DEFAULT '', nom TEXT NOT NULL DEFAULT '', age TEXT NOT NULL DEFAULT '',
    profession TEXT NOT NULL DEFAULT '', domicile TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'principal', notes TEXT NOT NULL DEFAULT '',
    ordre INTEGER NOT NULL DEFAULT 0)`);
  } catch {
  }
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS registres (
    id TEXT PRIMARY KEY, archive_id TEXT NOT NULL REFERENCES archives(id) ON DELETE CASCADE,
    nom TEXT NOT NULL, type_registre TEXT NOT NULL DEFAULT 'autre',
    date_debut TEXT NOT NULL DEFAULT '', date_fin TEXT NOT NULL DEFAULT '',
    lieu_nom TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')))`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE actes ADD COLUMN file_path TEXT NOT NULL DEFAULT ''`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE actes ADD COLUMN filename TEXT NOT NULL DEFAULT ''`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE actes ADD COLUMN registre_id TEXT REFERENCES registres(id) ON DELETE SET NULL`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE actes ADD COLUMN lieu_nom TEXT NOT NULL DEFAULT ''`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE registres ADD COLUMN default_type_acte TEXT NOT NULL DEFAULT ''`);
  } catch {
  }
  try {
    db.exec(`ALTER TABLE registres ADD COLUMN default_lieu_nom TEXT NOT NULL DEFAULT ''`);
  } catch {
  }
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
`;
const now = () => (/* @__PURE__ */ new Date()).toISOString();
const id = () => crypto.randomUUID();
function registerIPC() {
  electron.ipcMain.handle("dialog:selectFolder", async (event) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    const result = await electron.dialog.showOpenDialog(win, { properties: ["openDirectory"] });
    return result.canceled ? null : result.filePaths[0];
  });
  electron.ipcMain.handle(
    "archives:list",
    () => getDB().prepare("SELECT * FROM archives ORDER BY name").all()
  );
  electron.ipcMain.handle("archives:create", (_, data) => {
    const rec = { id: id(), name: data.name, root_path: data.root_path, description: data.description || "", created_at: now(), updated_at: now() };
    getDB().prepare("INSERT INTO archives (id,name,root_path,description,created_at,updated_at) VALUES (@id,@name,@root_path,@description,@created_at,@updated_at)").run(rec);
    return rec;
  });
  electron.ipcMain.handle("archives:update", (_, archiveId, data) => {
    getDB().prepare("UPDATE archives SET name=@name,description=@description,updated_at=@u WHERE id=@id").run({ name: data.name, description: data.description || "", u: now(), id: archiveId });
    return { ok: true };
  });
  electron.ipcMain.handle("archives:delete", (_, archiveId) => {
    getDB().prepare("DELETE FROM archives WHERE id=?").run(archiveId);
    return { ok: true };
  });
  electron.ipcMain.handle("files:browse", (_, archiveId, subPath) => {
    const archive = getDB().prepare("SELECT root_path FROM archives WHERE id=?").get(archiveId);
    if (!archive) throw new Error("Archive introuvable");
    const target = subPath ? path.join(archive.root_path, subPath) : archive.root_path;
    const entries = fs.readdirSync(target, { withFileTypes: true });
    return entries.filter((e) => !e.name.startsWith(".")).map((e) => {
      const fullPath = path.join(target, e.name);
      const isDir = e.isDirectory();
      const rel = path.relative(archive.root_path, fullPath).replace(/\\/g, "/");
      let size = 0;
      try {
        if (!isDir) size = fs.statSync(fullPath).size;
      } catch {
      }
      return { name: e.name, path: rel, full_path: fullPath, is_dir: isDir, size, ext: path.extname(e.name).toLowerCase() };
    }).sort((a, b) => {
      if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
      return a.name.localeCompare(b.name, "fr");
    });
  });
  electron.ipcMain.handle("files:browseAll", (_, archiveId, subPath) => {
    const archive = getDB().prepare("SELECT root_path FROM archives WHERE id=?").get(archiveId);
    if (!archive) throw new Error("Archive introuvable");
    const root = archive.root_path;
    function collectFiles(dir) {
      let result = [];
      let entries;
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return result;
      }
      for (const e of entries) {
        if (e.name.startsWith(".")) continue;
        const fullPath = path.join(dir, e.name);
        if (e.isDirectory()) {
          result = result.concat(collectFiles(fullPath));
        } else {
          const rel = path.relative(root, fullPath).replace(/\\/g, "/");
          let size = 0;
          try {
            size = fs.statSync(fullPath).size;
          } catch {
          }
          result.push({ name: e.name, path: rel, full_path: fullPath, is_dir: false, size, ext: path.extname(e.name).toLowerCase() });
        }
      }
      return result;
    }
    const target = subPath ? path.join(root, subPath) : root;
    return collectFiles(target);
  });
  electron.ipcMain.handle("fiches:list", (_, archiveId) => {
    const fiches = getDB().prepare(`
      SELECT f.*, COUNT(d.id) as document_count
      FROM fiches f LEFT JOIN documents d ON d.fiche_id = f.id
      WHERE f.archive_id = ? GROUP BY f.id ORDER BY f.title
    `).all(archiveId);
    return fiches.map((f) => {
      if (!f.avatar_zone_id) return { ...f, avatar_zone: null };
      const az = getDB().prepare("SELECT z.*, d.file_path as doc_file_path FROM zones z JOIN documents d ON z.document_id = d.id WHERE z.id = ?").get(f.avatar_zone_id);
      return { ...f, avatar_zone: az || null };
    });
  });
  electron.ipcMain.handle("fiches:create", (_, archiveId, data) => {
    const rec = { id: id(), archive_id: archiveId, title: data.title, description: data.description || "", date: data.date || "", created_at: now(), updated_at: now() };
    getDB().prepare("INSERT INTO fiches (id,archive_id,title,description,date,created_at,updated_at) VALUES (@id,@archive_id,@title,@description,@date,@created_at,@updated_at)").run(rec);
    return rec;
  });
  electron.ipcMain.handle("fiches:get", (_, ficheId) => {
    const fiche = getDB().prepare("SELECT * FROM fiches WHERE id=?").get(ficheId);
    if (!fiche) throw new Error("Fiche introuvable");
    const documents = getDB().prepare("SELECT * FROM documents WHERE fiche_id=? ORDER BY filename").all(ficheId);
    let avatarZone = null;
    if (fiche.avatar_zone_id) {
      avatarZone = getDB().prepare("SELECT z.*, d.file_path as doc_file_path FROM zones z JOIN documents d ON z.document_id = d.id WHERE z.id = ?").get(fiche.avatar_zone_id) || null;
    }
    return { ...fiche, documents, avatar_zone: avatarZone };
  });
  electron.ipcMain.handle("fiches:setAvatar", (_, ficheId, zoneId) => {
    getDB().prepare("UPDATE fiches SET avatar_zone_id=?,updated_at=? WHERE id=?").run(zoneId, now(), ficheId);
    return { ok: true };
  });
  electron.ipcMain.handle("fiches:update", (_, ficheId, data) => {
    getDB().prepare("UPDATE fiches SET title=@t,description=@d,date=@dt,updated_at=@u WHERE id=@id").run({ t: data.title, d: data.description || "", dt: data.date || "", u: now(), id: ficheId });
    return { ok: true };
  });
  electron.ipcMain.handle("fiches:delete", (_, ficheId) => {
    getDB().prepare("DELETE FROM fiches WHERE id=?").run(ficheId);
    return { ok: true };
  });
  electron.ipcMain.handle("fiches:addDocument", (_, ficheId, documentId) => {
    getDB().prepare("UPDATE documents SET fiche_id=?,updated_at=? WHERE id=?").run(ficheId, now(), documentId);
    return { ok: true };
  });
  electron.ipcMain.handle("fiches:removeDocument", (_, ficheId, documentId) => {
    getDB().prepare("UPDATE documents SET fiche_id=NULL,updated_at=? WHERE id=? AND fiche_id=?").run(now(), documentId, ficheId);
    return { ok: true };
  });
  electron.ipcMain.handle(
    "documents:list",
    (_, archiveId) => getDB().prepare("SELECT * FROM documents WHERE archive_id=? ORDER BY filename").all(archiveId)
  );
  electron.ipcMain.handle(
    "documents:recentForHome",
    (_, archiveId) => getDB().prepare("SELECT * FROM documents WHERE archive_id=? ORDER BY updated_at DESC LIMIT 12").all(archiveId)
  );
  electron.ipcMain.handle("documents:create", (_, archiveId, data) => {
    const filename = path.basename(data.file_path);
    const ext = path.extname(filename).toLowerCase();
    const mimeMap = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp", ".tiff": "image/tiff", ".pdf": "application/pdf" };
    const rec = { id: id(), archive_id: archiveId, fiche_id: data.fiche_id || null, file_path: data.file_path, filename, mime_type: mimeMap[ext] || "application/octet-stream", title: data.title || "", description: data.description || "", date: data.date || "", location: data.location || "", linked_document_id: null, link_type: "", created_at: now(), updated_at: now() };
    getDB().prepare("INSERT INTO documents (id,archive_id,fiche_id,file_path,filename,mime_type,title,description,date,location,linked_document_id,link_type,created_at,updated_at) VALUES (@id,@archive_id,@fiche_id,@file_path,@filename,@mime_type,@title,@description,@date,@location,@linked_document_id,@link_type,@created_at,@updated_at)").run(rec);
    return rec;
  });
  electron.ipcMain.handle("documents:get", (_, docId) => {
    const doc = getDB().prepare("SELECT * FROM documents WHERE id=?").get(docId);
    if (!doc) throw new Error("Document introuvable");
    const zones = getDB().prepare("SELECT * FROM zones WHERE document_id=? ORDER BY created_at").all(docId);
    const zonesWithPersons = zones.map((z) => {
      const persons = getDB().prepare("SELECT p.* FROM persons p JOIN zone_persons zp ON p.id=zp.person_id WHERE zp.zone_id=?").all(z.id);
      return { ...z, persons };
    });
    return { ...doc, zones: zonesWithPersons };
  });
  electron.ipcMain.handle("documents:update", (_, docId, data) => {
    const sets = ["updated_at=@u"];
    const params = { u: now(), id: docId };
    if (data.title !== void 0) {
      sets.push("title=@title");
      params.title = data.title;
    }
    if (data.description !== void 0) {
      sets.push("description=@description");
      params.description = data.description;
    }
    if (data.date !== void 0) {
      sets.push("date=@date");
      params.date = data.date;
    }
    if (data.location !== void 0) {
      sets.push("location=@location");
      params.location = data.location;
    }
    if (data.transcription !== void 0) {
      sets.push("transcription=@transcription");
      params.transcription = data.transcription;
    }
    if ("fiche_id" in data) {
      sets.push("fiche_id=@fiche_id");
      params.fiche_id = data.fiche_id ?? null;
    }
    if (data.rotation !== void 0) {
      sets.push("rotation=@rotation");
      params.rotation = data.rotation;
    }
    if (data.crop_x !== void 0) {
      sets.push("crop_x=@crop_x");
      params.crop_x = data.crop_x;
    }
    if (data.crop_y !== void 0) {
      sets.push("crop_y=@crop_y");
      params.crop_y = data.crop_y;
    }
    if (data.crop_w !== void 0) {
      sets.push("crop_w=@crop_w");
      params.crop_w = data.crop_w;
    }
    if (data.crop_h !== void 0) {
      sets.push("crop_h=@crop_h");
      params.crop_h = data.crop_h;
    }
    if (data.brightness !== void 0) {
      sets.push("brightness=@brightness");
      params.brightness = data.brightness;
    }
    if (data.contrast !== void 0) {
      sets.push("contrast=@contrast");
      params.contrast = data.contrast;
    }
    if (data.flip_h !== void 0) {
      sets.push("flip_h=@flip_h");
      params.flip_h = data.flip_h;
    }
    if (data.flip_v !== void 0) {
      sets.push("flip_v=@flip_v");
      params.flip_v = data.flip_v;
    }
    getDB().prepare(`UPDATE documents SET ${sets.join(",")} WHERE id=@id`).run(params);
    return { ok: true };
  });
  electron.ipcMain.handle("documents:delete", (_, docId) => {
    getDB().prepare("DELETE FROM documents WHERE id=?").run(docId);
    return { ok: true };
  });
  electron.ipcMain.handle("documents:link", (_, docId, linkedId, linkType) => {
    const opposite = linkType === "recto" ? "verso" : "recto";
    getDB().prepare("UPDATE documents SET linked_document_id=?,link_type=?,updated_at=? WHERE id=?").run(linkedId, linkType, now(), docId);
    getDB().prepare("UPDATE documents SET linked_document_id=?,link_type=?,updated_at=? WHERE id=?").run(docId, opposite, now(), linkedId);
    return { ok: true };
  });
  electron.ipcMain.handle("documents:unlink", (_, docId) => {
    const doc = getDB().prepare("SELECT linked_document_id FROM documents WHERE id=?").get(docId);
    if (doc?.linked_document_id) {
      getDB().prepare("UPDATE documents SET linked_document_id=NULL,link_type='',updated_at=? WHERE id=?").run(now(), doc.linked_document_id);
    }
    getDB().prepare("UPDATE documents SET linked_document_id=NULL,link_type='',updated_at=? WHERE id=?").run(now(), docId);
    return { ok: true };
  });
  electron.ipcMain.handle("zones:create", (_, docId, data) => {
    const rec = { id: id(), document_id: docId, x: data.x, y: data.y, width: data.width, height: data.height, label: data.label || "", notes: data.notes || "", transcription: data.transcription || "", created_at: now() };
    getDB().prepare("INSERT INTO zones (id,document_id,x,y,width,height,label,notes,transcription,created_at) VALUES (@id,@document_id,@x,@y,@width,@height,@label,@notes,@transcription,@created_at)").run(rec);
    return rec;
  });
  electron.ipcMain.handle("zones:update", (_, zoneId, data) => {
    const sets = [];
    const params = { id: zoneId };
    if (data.x !== void 0) {
      sets.push("x=@x");
      params.x = data.x;
    }
    if (data.y !== void 0) {
      sets.push("y=@y");
      params.y = data.y;
    }
    if (data.width !== void 0) {
      sets.push("width=@w");
      params.w = data.width;
    }
    if (data.height !== void 0) {
      sets.push("height=@h");
      params.h = data.height;
    }
    if (data.label !== void 0) {
      sets.push("label=@l");
      params.l = data.label;
    }
    if (data.notes !== void 0) {
      sets.push("notes=@n");
      params.n = data.notes;
    }
    if (data.transcription !== void 0) {
      sets.push("transcription=@t");
      params.t = data.transcription;
    }
    if ("face_descriptor" in data) {
      sets.push("face_descriptor=@fd");
      params.fd = data.face_descriptor ?? null;
    }
    if (sets.length === 0) return { ok: true };
    getDB().prepare(`UPDATE zones SET ${sets.join(",")} WHERE id=@id`).run(params);
    return { ok: true };
  });
  electron.ipcMain.handle("zones:withFace", (_, archiveId) => {
    return getDB().prepare(`
      SELECT z.*, d.file_path as doc_file_path, d.title as doc_title, d.filename as doc_filename, d.id as doc_id,
             p.first_name, p.last_name
      FROM zones z
      JOIN documents d ON z.document_id = d.id
      LEFT JOIN zone_persons zp ON zp.zone_id = z.id
      LEFT JOIN persons p ON p.id = zp.person_id
      WHERE d.archive_id = ? AND z.face_descriptor IS NOT NULL
      ORDER BY z.created_at
    `).all(archiveId);
  });
  electron.ipcMain.handle("zones:listLabels", (_, archiveId) => {
    const rows = getDB().prepare(`
      SELECT DISTINCT z.label FROM zones z
      JOIN documents d ON d.id = z.document_id
      WHERE d.archive_id = ? AND z.label != ''
      ORDER BY z.label
    `).all(archiveId);
    return rows.map((r) => r.label);
  });
  electron.ipcMain.handle("zones:delete", (_, zoneId) => {
    getDB().prepare("DELETE FROM zones WHERE id=?").run(zoneId);
    return { ok: true };
  });
  electron.ipcMain.handle("zones:addPerson", (_, zoneId, personId) => {
    getDB().prepare("INSERT OR IGNORE INTO zone_persons (zone_id,person_id) VALUES (?,?)").run(zoneId, personId);
    return { ok: true };
  });
  electron.ipcMain.handle("zones:removePerson", (_, zoneId, personId) => {
    getDB().prepare("DELETE FROM zone_persons WHERE zone_id=? AND person_id=?").run(zoneId, personId);
    return { ok: true };
  });
  electron.ipcMain.handle("doc:thumbnail", async (_, filePath, maxPx) => {
    try {
      const normalized = filePath.replace(/\//g, "\\");
      const img = await electron.nativeImage.createThumbnailFromPath(normalized, { width: maxPx, height: maxPx });
      return img.toDataURL();
    } catch {
      return null;
    }
  });
  electron.ipcMain.handle("persons:list", (_, archiveId, q) => {
    const like = `%${q || ""}%`;
    const persons = archiveId ? getDB().prepare("SELECT * FROM persons WHERE archive_id=? AND (first_name LIKE ? OR last_name LIKE ?) ORDER BY last_name,first_name").all(archiveId, like, like) : getDB().prepare("SELECT * FROM persons WHERE (first_name LIKE ? OR last_name LIKE ?) ORDER BY last_name,first_name").all(like, like);
    return persons.map((p) => {
      if (!p.avatar_zone_id) return { ...p, avatar_zone: null };
      const az = getDB().prepare("SELECT z.*, d.file_path as doc_file_path FROM zones z JOIN documents d ON z.document_id = d.id WHERE z.id = ?").get(p.avatar_zone_id);
      return { ...p, avatar_zone: az || null };
    });
  });
  electron.ipcMain.handle("persons:get", (_, personId) => {
    const person = getDB().prepare("SELECT * FROM persons WHERE id=?").get(personId);
    if (!person) throw new Error("Personne introuvable");
    const zones = getDB().prepare(`
      SELECT z.*, d.file_path as doc_file_path, d.filename as doc_filename,
             COALESCE(NULLIF(d.title,''), d.filename) as doc_title, d.id as doc_id
      FROM zone_persons zp
      JOIN zones z ON z.id = zp.zone_id
      JOIN documents d ON d.id = z.document_id
      WHERE zp.person_id = ?
      ORDER BY z.created_at
    `).all(personId);
    let avatarZone = null;
    if (person.avatar_zone_id) {
      avatarZone = getDB().prepare("SELECT z.*, d.file_path as doc_file_path FROM zones z JOIN documents d ON z.document_id = d.id WHERE z.id = ?").get(person.avatar_zone_id) || null;
    }
    return { ...person, zones, avatar_zone: avatarZone };
  });
  electron.ipcMain.handle("persons:setAvatar", (_, personId, zoneId) => {
    getDB().prepare("UPDATE persons SET avatar_zone_id=?,updated_at=? WHERE id=?").run(zoneId, now(), personId);
    return { ok: true };
  });
  electron.ipcMain.handle("persons:create", (_, archiveId, data) => {
    const rec = { id: id(), archive_id: archiveId, first_name: data.first_name || "", last_name: data.last_name, birth_date: data.birth_date || "", death_date: data.death_date || "", birth_place: data.birth_place || "", death_place: data.death_place || "", notes: data.notes || "", created_at: now(), updated_at: now() };
    getDB().prepare("INSERT INTO persons (id,archive_id,first_name,last_name,birth_date,death_date,birth_place,death_place,notes,created_at,updated_at) VALUES (@id,@archive_id,@first_name,@last_name,@birth_date,@death_date,@birth_place,@death_place,@notes,@created_at,@updated_at)").run(rec);
    return rec;
  });
  electron.ipcMain.handle("persons:update", (_, personId, data) => {
    getDB().prepare("UPDATE persons SET first_name=@fn,last_name=@ln,birth_date=@bd,death_date=@dd,birth_place=@bp,death_place=@dp,notes=@n,updated_at=@u WHERE id=@id").run({ fn: data.first_name || "", ln: data.last_name, bd: data.birth_date || "", dd: data.death_date || "", bp: data.birth_place || "", dp: data.death_place || "", n: data.notes || "", u: now(), id: personId });
    return { ok: true };
  });
  electron.ipcMain.handle("persons:delete", (_, personId) => {
    getDB().prepare("DELETE FROM persons WHERE id=?").run(personId);
    return { ok: true };
  });
  electron.ipcMain.handle(
    "tags:list",
    () => getDB().prepare("SELECT * FROM tags ORDER BY name").all()
  );
  electron.ipcMain.handle("tags:create", (_, data) => {
    const existing = getDB().prepare("SELECT * FROM tags WHERE name=?").get(data.name);
    if (existing) return existing;
    const rec = { id: id(), name: data.name, color: data.color };
    getDB().prepare("INSERT INTO tags (id,name,color) VALUES (@id,@name,@color)").run(rec);
    return rec;
  });
  electron.ipcMain.handle("tags:update", (_, tagId, data) => {
    getDB().prepare("UPDATE tags SET name=@name,color=@color WHERE id=@id").run({ ...data, id: tagId });
    return { ok: true };
  });
  electron.ipcMain.handle("tags:delete", (_, tagId) => {
    getDB().prepare("DELETE FROM tags WHERE id=?").run(tagId);
    return { ok: true };
  });
  electron.ipcMain.handle(
    "tags:forDocument",
    (_, docId) => getDB().prepare("SELECT t.* FROM tags t JOIN document_tags dt ON t.id=dt.tag_id WHERE dt.document_id=? ORDER BY t.name").all(docId)
  );
  electron.ipcMain.handle("tags:addToDocument", (_, docId, tagId) => {
    getDB().prepare("INSERT OR IGNORE INTO document_tags (document_id,tag_id) VALUES (?,?)").run(docId, tagId);
    return { ok: true };
  });
  electron.ipcMain.handle("tags:removeFromDocument", (_, docId, tagId) => {
    getDB().prepare("DELETE FROM document_tags WHERE document_id=? AND tag_id=?").run(docId, tagId);
    return { ok: true };
  });
  electron.ipcMain.handle(
    "tags:forFiche",
    (_, ficheId) => getDB().prepare("SELECT t.* FROM tags t JOIN fiche_tags ft ON t.id=ft.tag_id WHERE ft.fiche_id=? ORDER BY t.name").all(ficheId)
  );
  electron.ipcMain.handle("tags:addToFiche", (_, ficheId, tagId) => {
    getDB().prepare("INSERT OR IGNORE INTO fiche_tags (fiche_id,tag_id) VALUES (?,?)").run(ficheId, tagId);
    return { ok: true };
  });
  electron.ipcMain.handle("tags:removeFromFiche", (_, ficheId, tagId) => {
    getDB().prepare("DELETE FROM fiche_tags WHERE fiche_id=? AND tag_id=?").run(ficheId, tagId);
    return { ok: true };
  });
  electron.ipcMain.handle(
    "tags:documents",
    (_, tagId) => getDB().prepare(`
      SELECT d.* FROM documents d
      JOIN document_tags dt ON d.id = dt.document_id
      WHERE dt.tag_id = ?
      ORDER BY d.filename
    `).all(tagId)
  );
  electron.ipcMain.handle("tags:counts", () => {
    const rows = getDB().prepare("SELECT tag_id, COUNT(*) as count FROM document_tags GROUP BY tag_id").all();
    const result = {};
    rows.forEach((r) => {
      result[r.tag_id] = r.count;
    });
    return result;
  });
  electron.ipcMain.handle(
    "albums:list",
    (_, archiveId) => getDB().prepare(`
      SELECT a.*, COUNT(ad.document_id) as document_count
      FROM albums a LEFT JOIN album_documents ad ON a.id=ad.album_id
      WHERE a.archive_id=? GROUP BY a.id ORDER BY a.name
    `).all(archiveId)
  );
  electron.ipcMain.handle("albums:create", (_, archiveId, data) => {
    const rec = { id: id(), archive_id: archiveId, name: data.name, description: data.description || "", cover_doc_id: null, created_at: now(), updated_at: now() };
    getDB().prepare("INSERT INTO albums (id,archive_id,name,description,cover_doc_id,created_at,updated_at) VALUES (@id,@archive_id,@name,@description,@cover_doc_id,@created_at,@updated_at)").run(rec);
    return rec;
  });
  electron.ipcMain.handle("albums:get", (_, albumId) => {
    const album = getDB().prepare("SELECT * FROM albums WHERE id=?").get(albumId);
    if (!album) throw new Error("Album introuvable");
    const documents = getDB().prepare(`
      SELECT d.*,
        ad.caption as album_caption, ad.rotation as album_rotation,
        ad.crop_x as album_crop_x, ad.crop_y as album_crop_y,
        ad.crop_w as album_crop_w, ad.crop_h as album_crop_h,
        ad.brightness as album_brightness, ad.contrast as album_contrast,
        ad.flip_h as album_flip_h, ad.flip_v as album_flip_v,
        ad.position as album_position
      FROM documents d
      JOIN album_documents ad ON d.id=ad.document_id
      WHERE ad.album_id=? ORDER BY ad.position, d.filename
    `).all(albumId);
    return { ...album, documents };
  });
  electron.ipcMain.handle("albums:updateDocEntry", (_, albumId, docId, data) => {
    const sets = [];
    const params = { aid: albumId, did: docId };
    if (data.caption !== void 0) {
      sets.push("caption=@caption");
      params.caption = data.caption;
    }
    if (data.rotation !== void 0) {
      sets.push("rotation=@rotation");
      params.rotation = data.rotation;
    }
    if (data.crop_x !== void 0) {
      sets.push("crop_x=@crop_x");
      params.crop_x = data.crop_x;
    }
    if (data.crop_y !== void 0) {
      sets.push("crop_y=@crop_y");
      params.crop_y = data.crop_y;
    }
    if (data.crop_w !== void 0) {
      sets.push("crop_w=@crop_w");
      params.crop_w = data.crop_w;
    }
    if (data.crop_h !== void 0) {
      sets.push("crop_h=@crop_h");
      params.crop_h = data.crop_h;
    }
    if (data.brightness !== void 0) {
      sets.push("brightness=@brightness");
      params.brightness = data.brightness;
    }
    if (data.contrast !== void 0) {
      sets.push("contrast=@contrast");
      params.contrast = data.contrast;
    }
    if (data.flip_h !== void 0) {
      sets.push("flip_h=@flip_h");
      params.flip_h = data.flip_h;
    }
    if (data.flip_v !== void 0) {
      sets.push("flip_v=@flip_v");
      params.flip_v = data.flip_v;
    }
    if (sets.length === 0) return { ok: true };
    getDB().prepare(`UPDATE album_documents SET ${sets.join(",")} WHERE album_id=@aid AND document_id=@did`).run(params);
    return { ok: true };
  });
  electron.ipcMain.handle("albums:reorder", (_, albumId, docIds) => {
    const stmt = getDB().prepare("UPDATE album_documents SET position=? WHERE album_id=? AND document_id=?");
    docIds.forEach((docId, i) => stmt.run(i, albumId, docId));
    return { ok: true };
  });
  electron.ipcMain.handle("albums:update", (_, albumId, data) => {
    getDB().prepare("UPDATE albums SET name=@n,description=@d,cover_doc_id=@c,updated_at=@u WHERE id=@id").run({ n: data.name, d: data.description || "", c: data.cover_doc_id ?? null, u: now(), id: albumId });
    return { ok: true };
  });
  electron.ipcMain.handle("albums:delete", (_, albumId) => {
    getDB().prepare("DELETE FROM albums WHERE id=?").run(albumId);
    return { ok: true };
  });
  electron.ipcMain.handle("albums:addDocument", (_, albumId, docId) => {
    const maxPos = getDB().prepare("SELECT MAX(position) as m FROM album_documents WHERE album_id=?").get(albumId);
    const pos = (maxPos?.m ?? -1) + 1;
    getDB().prepare("INSERT OR IGNORE INTO album_documents (album_id,document_id,position) VALUES (?,?,?)").run(albumId, docId, pos);
    return { ok: true };
  });
  electron.ipcMain.handle("albums:addDocuments", (_, albumId, docIds) => {
    const maxPos = getDB().prepare("SELECT MAX(position) as m FROM album_documents WHERE album_id=?").get(albumId);
    let pos = (maxPos?.m ?? -1) + 1;
    for (const docId of docIds) {
      getDB().prepare("INSERT OR IGNORE INTO album_documents (album_id,document_id,position) VALUES (?,?,?)").run(albumId, docId, pos++);
    }
    return { ok: true };
  });
  electron.ipcMain.handle("albums:removeDocument", (_, albumId, docId) => {
    getDB().prepare("DELETE FROM album_documents WHERE album_id=? AND document_id=?").run(albumId, docId);
    return { ok: true };
  });
  electron.ipcMain.handle("archive:export", async (event, archiveId) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    const db2 = getDB();
    const archive = db2.prepare("SELECT * FROM archives WHERE id=?").get(archiveId);
    if (!archive) throw new Error("Archive introuvable");
    const rootPath = archive.root_path;
    const saveResult = await electron.dialog.showSaveDialog(win, {
      title: "Exporter les données",
      defaultPath: `${archive.name.replace(/[^a-zA-Z0-9_\- ]/g, "_")}.onesime`,
      filters: [{ name: "Fichier Onésime", extensions: ["onesime"] }]
    });
    if (saveResult.canceled || !saveResult.filePath) return { ok: false };
    const fiches = db2.prepare("SELECT * FROM fiches WHERE archive_id=?").all(archiveId);
    const persons = db2.prepare("SELECT * FROM persons WHERE archive_id=?").all(archiveId);
    const albums = db2.prepare("SELECT * FROM albums WHERE archive_id=?").all(archiveId);
    const rawDocs = db2.prepare("SELECT * FROM documents WHERE archive_id=?").all(archiveId);
    const tags = db2.prepare("SELECT * FROM tags").all();
    const inList = (arr) => arr.map(() => "?").join(",");
    const docIds = rawDocs.map((d) => d.id);
    const ficheIds = fiches.map((f) => f.id);
    const albumIds = albums.map((a) => a.id);
    const docs = rawDocs.map((d) => ({
      ...d,
      file_path: path.relative(rootPath, d.file_path).replace(/\\/g, "/")
    }));
    const zones = docIds.length ? db2.prepare(`SELECT * FROM zones WHERE document_id IN (${inList(docIds)})`).all(...docIds) : [];
    const zoneIds = zones.map((z) => z.id);
    const zonePersons = zoneIds.length ? db2.prepare(`SELECT * FROM zone_persons WHERE zone_id IN (${inList(zoneIds)})`).all(...zoneIds) : [];
    const docTags = docIds.length ? db2.prepare(`SELECT * FROM document_tags WHERE document_id IN (${inList(docIds)})`).all(...docIds) : [];
    const ficheTags = ficheIds.length ? db2.prepare(`SELECT * FROM fiche_tags WHERE fiche_id IN (${inList(ficheIds)})`).all(...ficheIds) : [];
    const albumDocs = albumIds.length ? db2.prepare(`SELECT * FROM album_documents WHERE album_id IN (${inList(albumIds)})`).all(...albumIds) : [];
    const exportData = {
      version: 1,
      exported_at: (/* @__PURE__ */ new Date()).toISOString(),
      archive: { name: archive.name, description: archive.description },
      fiches,
      persons,
      documents: docs,
      zones,
      zone_persons: zonePersons,
      tags,
      document_tags: docTags,
      fiche_tags: ficheTags,
      albums,
      album_documents: albumDocs
    };
    fs.writeFileSync(saveResult.filePath, JSON.stringify(exportData, null, 2), "utf-8");
    return {
      ok: true,
      counts: {
        documents: docs.length,
        fiches: fiches.length,
        persons: persons.length,
        zones: zones.length,
        albums: albums.length
      }
    };
  });
  electron.ipcMain.handle("archive:import", async (event, archiveId) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    const db2 = getDB();
    const archive = db2.prepare("SELECT * FROM archives WHERE id=?").get(archiveId);
    if (!archive) throw new Error("Archive introuvable");
    const rootPath = archive.root_path;
    const openResult = await electron.dialog.showOpenDialog(win, {
      title: "Importer les données",
      filters: [{ name: "Fichier Onésime", extensions: ["onesime"] }],
      properties: ["openFile"]
    });
    if (openResult.canceled || !openResult.filePaths[0]) return { ok: false };
    const raw = fs.readFileSync(openResult.filePaths[0], "utf-8");
    const data = JSON.parse(raw);
    if (!data.version || data.version !== 1) throw new Error("Format de fichier non reconnu");
    db2.exec("BEGIN");
    try {
      for (const tag of data.tags ?? []) {
        db2.prepare("INSERT OR IGNORE INTO tags (id,name,color) VALUES (?,?,?)").run(tag.id, tag.name, tag.color);
      }
      for (const f of data.fiches ?? []) {
        db2.prepare("INSERT OR REPLACE INTO fiches (id,archive_id,title,description,date,avatar_zone_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)").run(f.id, archiveId, f.title, f.description, f.date, f.avatar_zone_id ?? null, f.created_at, f.updated_at);
      }
      for (const p of data.persons ?? []) {
        db2.prepare("INSERT OR REPLACE INTO persons (id,archive_id,first_name,last_name,birth_date,death_date,notes,avatar_zone_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)").run(p.id, archiveId, p.first_name, p.last_name, p.birth_date, p.death_date, p.notes, p.avatar_zone_id ?? null, p.created_at, p.updated_at);
      }
      for (const d of data.documents ?? []) {
        const filePath = path.join(rootPath, d.file_path);
        db2.prepare("INSERT OR REPLACE INTO documents (id,archive_id,fiche_id,file_path,filename,mime_type,title,description,transcription,date,location,linked_document_id,link_type,rotation,crop_x,crop_y,crop_w,crop_h,brightness,contrast,flip_h,flip_v,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(d.id, archiveId, d.fiche_id ?? null, filePath, d.filename, d.mime_type, d.title, d.description, d.transcription ?? "", d.date, d.location ?? "", d.linked_document_id ?? null, d.link_type ?? "", d.rotation ?? 0, d.crop_x ?? 0, d.crop_y ?? 0, d.crop_w ?? 1, d.crop_h ?? 1, d.brightness ?? 0, d.contrast ?? 0, d.flip_h ?? 0, d.flip_v ?? 0, d.created_at, d.updated_at);
      }
      for (const z of data.zones ?? []) {
        db2.prepare("INSERT OR REPLACE INTO zones (id,document_id,x,y,width,height,label,notes,transcription,face_descriptor,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(z.id, z.document_id, z.x, z.y, z.width, z.height, z.label, z.notes, z.transcription ?? "", z.face_descriptor ?? null, z.created_at);
      }
      for (const zp of data.zone_persons ?? []) {
        db2.prepare("INSERT OR IGNORE INTO zone_persons (zone_id,person_id) VALUES (?,?)").run(zp.zone_id, zp.person_id);
      }
      for (const dt of data.document_tags ?? []) {
        db2.prepare("INSERT OR IGNORE INTO document_tags (document_id,tag_id) VALUES (?,?)").run(dt.document_id, dt.tag_id);
      }
      for (const ft of data.fiche_tags ?? []) {
        db2.prepare("INSERT OR IGNORE INTO fiche_tags (fiche_id,tag_id) VALUES (?,?)").run(ft.fiche_id, ft.tag_id);
      }
      for (const a of data.albums ?? []) {
        db2.prepare("INSERT OR REPLACE INTO albums (id,archive_id,name,description,cover_doc_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?)").run(a.id, archiveId, a.name, a.description, a.cover_doc_id ?? null, a.created_at, a.updated_at);
      }
      for (const ad of data.album_documents ?? []) {
        db2.prepare("INSERT OR IGNORE INTO album_documents (album_id,document_id,position,caption,rotation,crop_x,crop_y,crop_w,crop_h,brightness,contrast,flip_h,flip_v) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").run(ad.album_id, ad.document_id, ad.position ?? 0, ad.caption ?? "", ad.rotation ?? 0, ad.crop_x ?? 0, ad.crop_y ?? 0, ad.crop_w ?? 1, ad.crop_h ?? 1, ad.brightness ?? 0, ad.contrast ?? 0, ad.flip_h ?? 0, ad.flip_v ?? 0);
      }
      db2.exec("COMMIT");
    } catch (e) {
      db2.exec("ROLLBACK");
      throw e;
    }
    return {
      ok: true,
      counts: {
        documents: (data.documents ?? []).length,
        fiches: (data.fiches ?? []).length,
        persons: (data.persons ?? []).length,
        zones: (data.zones ?? []).length,
        albums: (data.albums ?? []).length
      }
    };
  });
  electron.ipcMain.handle("search:query", (_, q, archiveId) => {
    const like = `%${q}%`;
    const af = archiveId ? "AND archive_id=?" : "";
    const args = (extra) => archiveId ? [like, like, ...extra, archiveId] : [like, like, ...extra];
    const fiches = getDB().prepare(`SELECT 'fiche' as type,id,title as label,'' as extra FROM fiches WHERE (title LIKE ? OR description LIKE ?) ${af}`).all(...args([]));
    const docs = getDB().prepare(`SELECT 'document' as type,id,COALESCE(NULLIF(title,''),filename) as label,file_path as extra FROM documents WHERE (title LIKE ? OR description LIKE ? OR filename LIKE ? OR transcription LIKE ?) ${af}`).all(...args([like, like]));
    const persons = getDB().prepare(`SELECT 'person' as type,id,(first_name||' '||last_name) as label,(birth_date||CASE WHEN death_date!='' THEN ' – '||death_date ELSE '' END) as extra FROM persons WHERE (first_name LIKE ? OR last_name LIKE ?) ${af}`).all(...args([]));
    return [...fiches, ...docs, ...persons];
  });
  electron.ipcMain.handle("persons:merge", (_, sourceId, targetId) => {
    const db2 = getDB();
    const source = db2.prepare("SELECT * FROM persons WHERE id=?").get(sourceId);
    const target = db2.prepare("SELECT * FROM persons WHERE id=?").get(targetId);
    if (!source || !target) throw new Error("Personne introuvable");
    db2.prepare("UPDATE zone_persons SET person_id=? WHERE person_id=?").run(targetId, sourceId);
    if (source.avatar_zone_id && !target.avatar_zone_id) {
      db2.prepare("UPDATE persons SET avatar_zone_id=? WHERE id=?").run(source.avatar_zone_id, targetId);
    }
    const mergedNotes = [target.notes, source.notes].filter(Boolean).join("\n");
    if (mergedNotes) db2.prepare("UPDATE persons SET notes=? WHERE id=?").run(mergedNotes, targetId);
    db2.prepare("DELETE FROM persons WHERE id=?").run(sourceId);
    return { ok: true };
  });
  electron.ipcMain.handle("fiches:merge", (_, sourceId, targetId) => {
    const db2 = getDB();
    const source = db2.prepare("SELECT * FROM fiches WHERE id=?").get(sourceId);
    const target = db2.prepare("SELECT * FROM fiches WHERE id=?").get(targetId);
    if (!source || !target) throw new Error("Fiche introuvable");
    db2.prepare("UPDATE documents SET fiche_id=? WHERE fiche_id=?").run(targetId, sourceId);
    if (source.date && !target.date) db2.prepare("UPDATE fiches SET date=? WHERE id=?").run(source.date, targetId);
    if (source.avatar_zone_id && !target.avatar_zone_id) {
      db2.prepare("UPDATE fiches SET avatar_zone_id=? WHERE id=?").run(source.avatar_zone_id, targetId);
    }
    const mergedDesc = [target.description, source.description].filter(Boolean).join("\n");
    if (mergedDesc) db2.prepare("UPDATE fiches SET description=? WHERE id=?").run(mergedDesc, targetId);
    db2.prepare("DELETE FROM fiches WHERE id=?").run(sourceId);
    return { ok: true };
  });
  electron.ipcMain.handle("zones:allLabeled", (_, archiveId) => {
    return getDB().prepare(`
      SELECT z.id, z.document_id, z.x, z.y, z.width, z.height, z.label, z.face_descriptor,
             d.file_path as doc_file_path, COALESCE(NULLIF(d.title,''), d.filename) as doc_name
      FROM zones z
      JOIN documents d ON z.document_id = d.id
      WHERE d.archive_id = ? AND (z.label != '' OR z.face_descriptor IS NOT NULL)
      ORDER BY d.filename, z.id
    `).all(archiveId);
  });
  electron.ipcMain.handle("archive:notes:get", (_, archiveId) => {
    const row = getDB().prepare("SELECT notes FROM archives WHERE id=?").get(archiveId);
    return row?.notes ?? "";
  });
  electron.ipcMain.handle("archive:notes:set", (_, archiveId, notes) => {
    getDB().prepare("UPDATE archives SET notes=?,updated_at=? WHERE id=?").run(notes, now(), archiveId);
    return { ok: true };
  });
  electron.ipcMain.handle("archive:stats", (_, archiveId) => {
    const db2 = getDB();
    const docCount = db2.prepare("SELECT COUNT(*) as n FROM documents WHERE archive_id=?").get(archiveId).n;
    const ficheCount = db2.prepare("SELECT COUNT(*) as n FROM fiches WHERE archive_id=?").get(archiveId).n;
    const personCount = db2.prepare("SELECT COUNT(*) as n FROM persons WHERE archive_id=?").get(archiveId).n;
    const zoneCount = db2.prepare("SELECT COUNT(*) as n FROM zones z JOIN documents d ON z.document_id=d.id WHERE d.archive_id=?").get(archiveId).n;
    const faceCount = db2.prepare("SELECT COUNT(*) as n FROM zones z JOIN documents d ON z.document_id=d.id WHERE d.archive_id=? AND z.face_descriptor IS NOT NULL").get(archiveId).n;
    const albumCount = db2.prepare("SELECT COUNT(*) as n FROM albums WHERE archive_id=?").get(archiveId).n;
    const transcribedCount = db2.prepare("SELECT COUNT(*) as n FROM documents WHERE archive_id=? AND transcription!=''").get(archiveId).n;
    const withLocation = db2.prepare("SELECT COUNT(*) as n FROM documents WHERE archive_id=? AND location!=''").get(archiveId).n;
    const withDate = db2.prepare("SELECT COUNT(*) as n FROM documents WHERE archive_id=? AND date!=''").get(archiveId).n;
    const byMime = db2.prepare("SELECT mime_type, COUNT(*) as n FROM documents WHERE archive_id=? GROUP BY mime_type ORDER BY n DESC").all(archiveId);
    const recentDocs = db2.prepare("SELECT COALESCE(NULLIF(title,''),filename) as name, updated_at FROM documents WHERE archive_id=? ORDER BY updated_at DESC LIMIT 5").all(archiveId);
    return { docCount, ficheCount, personCount, zoneCount, faceCount, albumCount, transcribedCount, withLocation, withDate, byMime, recentDocs };
  });
  electron.ipcMain.handle("archive:duplicates", (_, archiveId) => {
    const docs = getDB().prepare("SELECT id, filename, file_path FROM documents WHERE archive_id=? ORDER BY filename").all(archiveId);
    const groups = {};
    for (const d of docs) {
      const key = d.filename.toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    }
    return Object.values(groups).filter((g) => g.length > 1);
  });
  electron.ipcMain.handle(
    "depots:list",
    (_, archiveId) => getDB().prepare("SELECT d.*, COUNT(s.id) as source_count FROM depots d LEFT JOIN sources_arch s ON s.depot_id=d.id WHERE d.archive_id=? GROUP BY d.id ORDER BY d.nom").all(archiveId)
  );
  electron.ipcMain.handle("depots:create", (_, archiveId, data) => {
    const rec = { id: id(), archive_id: archiveId, nom: data.nom, sigle: data.sigle || "", adresse: data.adresse || "", telephone: data.telephone || "", email: data.email || "", url: data.url || "", heures: data.heures || "", notes: data.notes || "", created_at: now() };
    getDB().prepare("INSERT INTO depots (id,archive_id,nom,sigle,adresse,telephone,email,url,heures,notes,created_at) VALUES (@id,@archive_id,@nom,@sigle,@adresse,@telephone,@email,@url,@heures,@notes,@created_at)").run(rec);
    return rec;
  });
  electron.ipcMain.handle("depots:update", (_, depotId, data) => {
    getDB().prepare("UPDATE depots SET nom=@nom,sigle=@sigle,adresse=@adresse,telephone=@tel,email=@email,url=@url,heures=@heures,notes=@notes WHERE id=@id").run({ nom: data.nom, sigle: data.sigle || "", adresse: data.adresse || "", tel: data.telephone || "", email: data.email || "", url: data.url || "", heures: data.heures || "", notes: data.notes || "", id: depotId });
    return { ok: true };
  });
  electron.ipcMain.handle("depots:delete", (_, depotId) => {
    getDB().prepare("DELETE FROM depots WHERE id=?").run(depotId);
    return { ok: true };
  });
  electron.ipcMain.handle(
    "sources_arch:list",
    (_, archiveId) => getDB().prepare("SELECT s.*, d.nom as depot_nom, d.sigle as depot_sigle FROM sources_arch s LEFT JOIN depots d ON d.id=s.depot_id WHERE s.archive_id=? ORDER BY s.titre").all(archiveId)
  );
  electron.ipcMain.handle("sources_arch:create", (_, archiveId, data) => {
    const rec = { id: id(), archive_id: archiveId, depot_id: data.depot_id || null, titre: data.titre, abbrev: data.abbrev || "", auteur: data.auteur || "", date_pub: data.date_pub || "", editeur: data.editeur || "", lieu_pub: data.lieu_pub || "", cote: data.cote || "", type_source: data.type_source || "autre", date_debut: data.date_debut || "", date_fin: data.date_fin || "", description: data.description || "", notes: data.notes || "", created_at: now() };
    getDB().prepare("INSERT INTO sources_arch (id,archive_id,depot_id,titre,abbrev,auteur,date_pub,editeur,lieu_pub,cote,type_source,date_debut,date_fin,description,notes,created_at) VALUES (@id,@archive_id,@depot_id,@titre,@abbrev,@auteur,@date_pub,@editeur,@lieu_pub,@cote,@type_source,@date_debut,@date_fin,@description,@notes,@created_at)").run(rec);
    return rec;
  });
  electron.ipcMain.handle("sources_arch:update", (_, sourceId, data) => {
    getDB().prepare("UPDATE sources_arch SET depot_id=@depot_id,titre=@titre,abbrev=@abbrev,auteur=@auteur,date_pub=@date_pub,editeur=@editeur,lieu_pub=@lieu_pub,cote=@cote,type_source=@type_source,date_debut=@date_debut,date_fin=@date_fin,description=@description,notes=@notes WHERE id=@id").run({ depot_id: data.depot_id || null, titre: data.titre, abbrev: data.abbrev || "", auteur: data.auteur || "", date_pub: data.date_pub || "", editeur: data.editeur || "", lieu_pub: data.lieu_pub || "", cote: data.cote || "", type_source: data.type_source || "autre", date_debut: data.date_debut || "", date_fin: data.date_fin || "", description: data.description || "", notes: data.notes || "", id: sourceId });
    return { ok: true };
  });
  electron.ipcMain.handle("sources_arch:delete", (_, sourceId) => {
    getDB().prepare("DELETE FROM sources_arch WHERE id=?").run(sourceId);
    return { ok: true };
  });
  electron.ipcMain.handle(
    "lieux:list",
    (_, archiveId) => getDB().prepare("SELECT l.*, p.nom as parent_nom FROM lieux l LEFT JOIN lieux p ON p.id=l.parent_id WHERE l.archive_id=? ORDER BY l.nom").all(archiveId)
  );
  electron.ipcMain.handle("lieux:create", (_, archiveId, data) => {
    const rec = { id: id(), archive_id: archiveId, nom: data.nom, type_lieu: data.type_lieu || "commune", parent_id: data.parent_id || null, code_insee: data.code_insee || "", notes: data.notes || "", created_at: now() };
    getDB().prepare("INSERT INTO lieux (id,archive_id,nom,type_lieu,parent_id,code_insee,notes,created_at) VALUES (@id,@archive_id,@nom,@type_lieu,@parent_id,@code_insee,@notes,@created_at)").run(rec);
    return rec;
  });
  electron.ipcMain.handle("lieux:update", (_, lieuId, data) => {
    getDB().prepare("UPDATE lieux SET nom=@nom,type_lieu=@tl,parent_id=@pid,code_insee=@ci,notes=@notes WHERE id=@id").run({ nom: data.nom, tl: data.type_lieu || "commune", pid: data.parent_id || null, ci: data.code_insee || "", notes: data.notes || "", id: lieuId });
    return { ok: true };
  });
  electron.ipcMain.handle("lieux:delete", (_, lieuId) => {
    getDB().prepare("DELETE FROM lieux WHERE id=?").run(lieuId);
    return { ok: true };
  });
  electron.ipcMain.handle("actes:list", (_, archiveId, filters) => {
    const f = filters || {};
    let sql = `SELECT a.*, r.nom as registre_nom,
      (SELECT GROUP_CONCAT(p.prenom||' '||p.nom, ', ') FROM actes_parties p WHERE p.acte_id=a.id AND p.role='principal') as principals
      FROM actes a LEFT JOIN registres r ON r.id=a.registre_id
      WHERE a.archive_id=?`;
    const args = [archiveId];
    if (f.type_acte) {
      sql += " AND a.type_acte=?";
      args.push(f.type_acte);
    }
    if (f.registre_id) {
      sql += " AND a.registre_id=?";
      args.push(f.registre_id);
    }
    if (f.no_registre) {
      sql += " AND a.registre_id IS NULL";
    }
    if (f.q) {
      sql += ` AND (a.description LIKE ? OR a.lieu_nom LIKE ? OR a.transcription LIKE ? OR a.filename LIKE ? OR EXISTS (SELECT 1 FROM actes_parties p WHERE p.acte_id=a.id AND (p.nom LIKE ? OR p.prenom LIKE ?)))`;
      const like = `%${f.q}%`;
      args.push(like, like, like, like, like, like);
    }
    sql += " ORDER BY a.date_acte DESC, a.created_at DESC";
    return getDB().prepare(sql).all(...args);
  });
  electron.ipcMain.handle("actes:get", (_, acteId) => {
    const acte = getDB().prepare("SELECT a.*, r.nom as registre_nom FROM actes a LEFT JOIN registres r ON r.id=a.registre_id WHERE a.id=?").get(acteId);
    if (!acte) throw new Error("Acte introuvable");
    const parties = getDB().prepare("SELECT * FROM actes_parties WHERE acte_id=? ORDER BY ordre").all(acteId);
    return { ...acte, parties };
  });
  electron.ipcMain.handle("actes:create", (_, archiveId, data) => {
    const rec = { id: id(), archive_id: archiveId, file_path: data.file_path || "", filename: data.filename || path.basename(data.file_path || ""), registre_id: data.registre_id || null, source_id: null, lieu_id: null, lieu_nom: data.lieu_nom || "", type_acte: data.type_acte || "autre", date_acte: data.date_acte || "", date_precision: data.date_precision || "exacte", folio: data.folio || "", acte_num: data.acte_num || "", description: data.description || "", transcription: data.transcription || "", notes: data.notes || "", created_at: now(), updated_at: now() };
    getDB().prepare("INSERT INTO actes (id,archive_id,file_path,filename,registre_id,source_id,lieu_id,lieu_nom,type_acte,date_acte,date_precision,folio,acte_num,description,transcription,notes,created_at,updated_at) VALUES (@id,@archive_id,@file_path,@filename,@registre_id,@source_id,@lieu_id,@lieu_nom,@type_acte,@date_acte,@date_precision,@folio,@acte_num,@description,@transcription,@notes,@created_at,@updated_at)").run(rec);
    return rec;
  });
  electron.ipcMain.handle("actes:update", (_, acteId, data) => {
    getDB().prepare("UPDATE actes SET registre_id=@rid,lieu_nom=@ln,type_acte=@ta,date_acte=@da,date_precision=@dp,folio=@fo,acte_num=@an,description=@desc,transcription=@tr,notes=@no,updated_at=@u WHERE id=@id").run({ rid: data.registre_id || null, ln: data.lieu_nom || "", ta: data.type_acte || "autre", da: data.date_acte || "", dp: data.date_precision || "exacte", fo: data.folio || "", an: data.acte_num || "", desc: data.description || "", tr: data.transcription || "", no: data.notes || "", u: now(), id: acteId });
    return { ok: true };
  });
  electron.ipcMain.handle("actes:delete", (_, acteId) => {
    getDB().prepare("DELETE FROM actes WHERE id=?").run(acteId);
    return { ok: true };
  });
  electron.ipcMain.handle("actes:importFiles", async (event, archiveId) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    const result = await electron.dialog.showOpenDialog(win, {
      title: "Importer des actes",
      properties: ["openFile", "multiSelections"],
      filters: [
        { name: "Images & Documents", extensions: ["jpg", "jpeg", "png", "tif", "tiff", "bmp", "webp", "gif", "pdf"] },
        { name: "Tous les fichiers", extensions: ["*"] }
      ]
    });
    if (result.canceled || result.filePaths.length === 0) return [];
    const created = [];
    for (const filePath of result.filePaths) {
      const filename = path.basename(filePath);
      const rec = { id: id(), archive_id: archiveId, file_path: filePath, filename, registre_id: null, source_id: null, lieu_id: null, lieu_nom: "", type_acte: "autre", date_acte: "", date_precision: "exacte", folio: "", acte_num: "", description: "", transcription: "", notes: "", created_at: now(), updated_at: now() };
      getDB().prepare("INSERT INTO actes (id,archive_id,file_path,filename,registre_id,source_id,lieu_id,lieu_nom,type_acte,date_acte,date_precision,folio,acte_num,description,transcription,notes,created_at,updated_at) VALUES (@id,@archive_id,@file_path,@filename,@registre_id,@source_id,@lieu_id,@lieu_nom,@type_acte,@date_acte,@date_precision,@folio,@acte_num,@description,@transcription,@notes,@created_at,@updated_at)").run(rec);
      created.push(rec);
    }
    return created;
  });
  electron.ipcMain.handle("actes:parties:set", (_, acteId, parties) => {
    getDB().prepare("DELETE FROM actes_parties WHERE acte_id=?").run(acteId);
    const stmt = getDB().prepare("INSERT INTO actes_parties (id,acte_id,prenom,nom,age,profession,domicile,role,notes,ordre) VALUES (@id,@acte_id,@prenom,@nom,@age,@profession,@domicile,@role,@notes,@ordre)");
    parties.forEach((p, i) => stmt.run({ id: id(), acte_id: acteId, prenom: p.prenom || "", nom: p.nom || "", age: p.age || "", profession: p.profession || "", domicile: p.domicile || "", role: p.role || "principal", notes: p.notes || "", ordre: i }));
    return { ok: true };
  });
  electron.ipcMain.handle("actes:stats", (_, archiveId) => {
    const byType = getDB().prepare("SELECT type_acte, COUNT(*) as n FROM actes WHERE archive_id=? GROUP BY type_acte ORDER BY n DESC").all(archiveId);
    const total = getDB().prepare("SELECT COUNT(*) as n FROM actes WHERE archive_id=?").get(archiveId);
    return { byType, total: total.n };
  });
  electron.ipcMain.handle(
    "registres:list",
    (_, archiveId) => getDB().prepare(`SELECT r.*, COUNT(a.id) as acte_count FROM registres r LEFT JOIN actes a ON a.registre_id=r.id WHERE r.archive_id=? GROUP BY r.id ORDER BY r.date_debut DESC, r.nom`).all(archiveId)
  );
  electron.ipcMain.handle("registres:create", (_, archiveId, data) => {
    const rec = { id: id(), archive_id: archiveId, nom: data.nom, type_registre: data.type_registre || "autre", default_type_acte: data.default_type_acte || "", default_lieu_nom: data.default_lieu_nom || "", date_debut: data.date_debut || "", date_fin: data.date_fin || "", lieu_nom: data.lieu_nom || "", description: data.description || "", notes: data.notes || "", created_at: now(), updated_at: now() };
    getDB().prepare("INSERT INTO registres (id,archive_id,nom,type_registre,default_type_acte,default_lieu_nom,date_debut,date_fin,lieu_nom,description,notes,created_at,updated_at) VALUES (@id,@archive_id,@nom,@type_registre,@default_type_acte,@default_lieu_nom,@date_debut,@date_fin,@lieu_nom,@description,@notes,@created_at,@updated_at)").run(rec);
    return rec;
  });
  electron.ipcMain.handle("registres:get", (_, registreId) => {
    const reg = getDB().prepare("SELECT * FROM registres WHERE id=?").get(registreId);
    if (!reg) throw new Error("Registre introuvable");
    const actes = getDB().prepare(`SELECT a.*, (SELECT GROUP_CONCAT(p.prenom||' '||p.nom, ', ') FROM actes_parties p WHERE p.acte_id=a.id AND p.role='principal') as principals FROM actes a WHERE a.registre_id=? ORDER BY a.date_acte, a.created_at`).all(registreId);
    return { ...reg, actes };
  });
  electron.ipcMain.handle("registres:update", (_, registreId, data) => {
    getDB().prepare("UPDATE registres SET nom=@nom,type_registre=@tr,default_type_acte=@dta,default_lieu_nom=@dln,date_debut=@dd,date_fin=@df,lieu_nom=@ln,description=@desc,notes=@no,updated_at=@u WHERE id=@id").run({ nom: data.nom, tr: data.type_registre || "autre", dta: data.default_type_acte || "", dln: data.default_lieu_nom || "", dd: data.date_debut || "", df: data.date_fin || "", ln: data.lieu_nom || "", desc: data.description || "", no: data.notes || "", u: now(), id: registreId });
    return { ok: true };
  });
  electron.ipcMain.handle("registres:delete", (_, registreId) => {
    getDB().prepare("DELETE FROM registres WHERE id=?").run(registreId);
    return { ok: true };
  });
  electron.ipcMain.handle("registres:setActe", (_, acteId, registreId) => {
    getDB().prepare("UPDATE actes SET registre_id=?,updated_at=? WHERE id=?").run(registreId, now(), acteId);
    if (registreId) {
      const reg = getDB().prepare("SELECT default_type_acte, default_lieu_nom FROM registres WHERE id=?").get(registreId);
      if (reg?.default_type_acte) getDB().prepare("UPDATE actes SET type_acte=?,updated_at=? WHERE id=?").run(reg.default_type_acte, now(), acteId);
      if (reg?.default_lieu_nom) getDB().prepare("UPDATE actes SET lieu_nom=?,updated_at=? WHERE id=?").run(reg.default_lieu_nom, now(), acteId);
    }
    return { ok: true };
  });
  electron.ipcMain.handle("registres:applyDefaults", (_, registreId) => {
    const reg = getDB().prepare("SELECT default_type_acte, default_lieu_nom FROM registres WHERE id=?").get(registreId);
    if (!reg) return { updated: 0 };
    if (reg.default_type_acte) getDB().prepare("UPDATE actes SET type_acte=?,updated_at=? WHERE registre_id=?").run(reg.default_type_acte, now(), registreId);
    if (reg.default_lieu_nom) getDB().prepare("UPDATE actes SET lieu_nom=?,updated_at=? WHERE registre_id=?").run(reg.default_lieu_nom, now(), registreId);
    const row = getDB().prepare("SELECT COUNT(*) as n FROM actes WHERE registre_id=?").get(registreId);
    return { updated: row.n };
  });
  electron.ipcMain.handle("registres:exportPdf", async (_, registreId) => {
    try {
      const reg = getDB().prepare("SELECT * FROM registres WHERE id=?").get(registreId);
      if (!reg) return { ok: false, error: "Registre introuvable" };
      const actes = getDB().prepare(
        `SELECT a.*, (SELECT GROUP_CONCAT(p.prenom||' '||p.nom, ', ') FROM actes_parties p WHERE p.acte_id=a.id AND p.role='principal') as principals
         FROM actes a WHERE a.registre_id=? ORDER BY a.date_acte, a.folio, a.acte_num`
      ).all(registreId);
      const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const IMG_EXTS = /* @__PURE__ */ new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tif", ".tiff"]);
      const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp", ".bmp": "image/bmp", ".tif": "image/tiff", ".tiff": "image/tiff" };
      const REG_LABELS = {
        bms: "Registre BMS",
        etat_civil: "État civil",
        notaire: "Notaire",
        cadastre: "Cadastre",
        recensement: "Recensement",
        correspondance: "Correspondance",
        autre: "Autre"
      };
      const actePages = actes.map((a) => {
        const ex = a.file_path ? path.extname(a.file_path).toLowerCase() : "";
        let content = '<div class="no-img"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span>' + esc(a.filename || "") + "</span></div>";
        if (IMG_EXTS.has(ex) && a.file_path) {
          try {
            const b64 = fs.readFileSync(a.file_path).toString("base64");
            content = '<img src="data:' + (MIME[ex] || "image/jpeg") + ";base64," + b64 + '" alt="">';
          } catch {
          }
        }
        const datePre = a.date_precision && a.date_precision !== "exacte" ? a.date_precision + " " : "";
        const parts = [
          a.date_acte ? "<span>" + esc(datePre + a.date_acte) + "</span>" : "",
          a.principals ? '<span class="principals">' + esc(a.principals) + "</span>" : "",
          a.folio ? "<span>Folio " + esc(a.folio) + "</span>" : "",
          a.acte_num ? "<span>N&deg;&nbsp;" + esc(a.acte_num) + "</span>" : ""
        ].filter(Boolean).join('<span class="sep">&middot;</span>');
        return '<div class="page">\n  <div class="page-header">' + parts + '</div>\n  <div class="page-body">' + content + "</div>\n</div>";
      }).join("\n");
      const dateStr = (/* @__PURE__ */ new Date()).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
      const period = [reg.date_debut, reg.date_fin].filter(Boolean).join(" – ");
      const css = [
        "* { box-sizing: border-box; margin: 0; padding: 0; }",
        "html, body { background: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }",
        "@page { margin: 0; size: A4; }",
        ".cover { width: 210mm; height: 297mm; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 25mm 30mm; text-align: center; page-break-after: always; break-after: page; position: relative; }",
        ".cover-title { font-size: 26pt; font-weight: 700; color: #0f172a; line-height: 1.2; margin-bottom: 4mm; }",
        ".cover-type { font-size: 9pt; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 3mm; }",
        ".cover-period { font-size: 13pt; color: #475569; margin-bottom: 2mm; }",
        ".cover-lieu { font-size: 11pt; color: #64748b; margin-bottom: 8mm; }",
        ".cover-rule { width: 16mm; height: 2.5pt; background: #f59e0b; border: none; margin: 0 auto 8mm; }",
        ".cover-desc { font-size: 10pt; color: #475569; line-height: 1.6; max-width: 120mm; margin-bottom: 8mm; }",
        ".cover-count { font-size: 10pt; color: #94a3b8; }",
        ".cover-foot { position: absolute; bottom: 10mm; font-size: 8pt; color: #cbd5e1; }",
        ".page { width: 210mm; height: 297mm; display: flex; flex-direction: column; page-break-after: always; break-after: page; overflow: hidden; }",
        ".page-header { flex-shrink: 0; height: 9mm; padding: 0 6mm; display: flex; align-items: center; gap: 3mm; border-bottom: 0.5pt solid #e2e8f0; font-size: 8pt; color: #64748b; white-space: nowrap; overflow: hidden; }",
        ".principals { font-weight: 600; color: #1e293b; }",
        ".sep { color: #cbd5e1; flex-shrink: 0; }",
        ".page-body { flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; background: white; }",
        ".page-body img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }",
        ".no-img { display: flex; flex-direction: column; align-items: center; gap: 4mm; color: #94a3b8; font-size: 9pt; }"
      ].join("\n");
      const coverParts = [
        '<div class="cover">',
        '  <div class="cover-title">' + esc(reg.nom) + "</div>",
        '  <div class="cover-type">' + esc(REG_LABELS[reg.type_registre] || reg.type_registre || "Autre") + "</div>",
        period ? '  <div class="cover-period">' + esc(period) + "</div>" : "",
        reg.lieu_nom ? '  <div class="cover-lieu">' + esc(reg.lieu_nom) + "</div>" : "",
        '  <hr class="cover-rule">',
        reg.description ? '  <div class="cover-desc">' + esc(reg.description) + "</div>" : "",
        '  <div class="cover-count">' + actes.length + " acte" + (actes.length !== 1 ? "s" : "") + " &middot; Export&eacute; le " + dateStr + "</div>",
        '  <div class="cover-foot">On&eacute;sime v0.2.5.0</div>',
        "</div>"
      ].filter(Boolean).join("\n");
      const html = '<!DOCTYPE html>\n<html lang="fr"><head><meta charset="UTF-8">\n<style>\n' + css + "\n</style>\n</head><body>\n" + coverParts + "\n" + actePages + "\n</body></html>";
      const { filePath, canceled } = await electron.dialog.showSaveDialog({
        title: "Exporter le registre en PDF",
        defaultPath: reg.nom.replace(/[/\\:*?"<>|]/g, "_") + ".pdf",
        filters: [{ name: "PDF", extensions: ["pdf"] }]
      });
      if (canceled || !filePath) return { ok: false };
      const tmpPath = path.join(electron.app.getPath("temp"), "onesime-reg-" + Date.now() + ".html");
      fs.writeFileSync(tmpPath, html, "utf-8");
      const win = new electron.BrowserWindow({ show: false, webPreferences: { sandbox: false } });
      await win.loadFile(tmpPath);
      const pdfBuf = await win.webContents.printToPDF({ pageSize: "A4", printBackground: false });
      win.close();
      try {
        require("fs").unlinkSync(tmpPath);
      } catch {
      }
      fs.writeFileSync(filePath, pdfBuf);
      return { ok: true, path: filePath };
    } catch (e) {
      return { ok: false, error: String(e?.message ?? e) };
    }
  });
  electron.ipcMain.handle("archive:backup", async () => {
    const dbPath2 = getDBPath();
    if (!dbPath2) return { ok: false, error: "DB non initialisée" };
    const backupDir = path.join(path.dirname(dbPath2), "backups");
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const ts = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const dest = path.join(backupDir, `onesime-${ts}.db`);
    const bytes = exportDBBytes();
    fs.writeFileSync(dest, Buffer.from(bytes));
    const files = fs.readdirSync(backupDir).filter((f) => f.startsWith("onesime-") && f.endsWith(".db")).sort();
    for (const old of files.slice(0, Math.max(0, files.length - 10))) {
      try {
        require("fs").unlinkSync(path.join(backupDir, old));
      } catch {
      }
    }
    return { ok: true, path: dest, count: files.length };
  });
  electron.ipcMain.handle("htr:status", () => htrGet("/status").catch(() => ({ ok: false, model_ready: false, model_loading: false, model_error: "Service non disponible" })));
  electron.ipcMain.handle("htr:transcribe", (_, filePath) => htrPost("/transcribe", { file_path: filePath }));
  electron.ipcMain.handle("htr:saveCorrection", (_, acteId, filePath, transcription) => htrPost("/correction", { acte_id: acteId, file_path: filePath, transcription }));
  electron.ipcMain.handle("htr:train", () => htrPost("/train", {}));
  electron.ipcMain.handle("htr:trainStatus", () => htrGet("/train/status").catch(() => ({ running: false, status: "error" })));
}
const HTR_PORT = 7842;
let _htrProc = null;
function htrGet(path2) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: "127.0.0.1", port: HTR_PORT, path: path2, method: "GET" }, (res) => {
      let data = "";
      res.on("data", (c) => {
        data += c;
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error("Parse error"));
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(1e4, () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
    req.end();
  });
}
function htrPost(path2, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = http.request(
      { hostname: "127.0.0.1", port: HTR_PORT, path: path2, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(bodyStr) } },
      (res) => {
        let data = "";
        res.on("data", (c) => {
          data += c;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error("Parse error"));
          }
        });
      }
    );
    req.on("error", reject);
    req.setTimeout(12e4, () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
    req.write(bodyStr);
    req.end();
  });
}
function startHtrService() {
  const serverScript = path.join(electron.app.getAppPath(), "htr_service", "server.py");
  if (!fs.existsSync(serverScript)) {
    console.warn("[HTR] server.py introuvable, service désactivé");
    return;
  }
  const python = process.platform === "win32" ? "python3" : "python3";
  _htrProc = child_process.spawn(python, [serverScript], {
    env: { ...process.env, HTR_PORT: String(HTR_PORT), PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  _htrProc.stdout?.on("data", (d) => process.stdout.write(`[HTR] ${d}`));
  _htrProc.stderr?.on("data", (d) => process.stderr.write(`[HTR] ${d}`));
  _htrProc.on("error", (e) => console.error("[HTR] Erreur démarrage :", e.message));
  _htrProc.on("exit", (code) => {
    if (code !== null && code !== 0) console.warn(`[HTR] Processus terminé (code ${code})`);
  });
}
function stopHtrService() {
  if (_htrProc) {
    _htrProc.kill();
    _htrProc = null;
  }
}
const isDev = process.env.NODE_ENV === "development" || !electron.app.isPackaged;
function getIcon() {
  const iconPath = path.resolve(__dirname, "../../build/icon.png");
  if (fs.existsSync(iconPath)) return electron.nativeImage.createFromPath(iconPath);
  return void 0;
}
function createWindow() {
  const win = new electron.BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: "Onésime",
    icon: getIcon(),
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true
    }
  });
  win.on("ready-to-show", () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    electron.shell.openExternal(url);
    return { action: "deny" };
  });
  if (isDev && process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(async () => {
  electron.app.setAppUserModelId("fr.onesime.app");
  electron.protocol.handle("localfile", (request) => {
    const filePath = decodeURIComponent(request.url.replace("localfile:///", ""));
    return electron.net.fetch(`file:///${filePath}`);
  });
  const dbPath2 = path.join(electron.app.getPath("userData"), "onesime.db");
  await initDB(dbPath2);
  registerIPC();
  startHtrService();
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("before-quit", () => stopHtrService());
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
