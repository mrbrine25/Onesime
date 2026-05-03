import { ipcMain, dialog, BrowserWindow, nativeImage, app } from 'electron'
import { randomUUID } from 'crypto'
import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, basename, extname, relative, dirname } from 'path'
import { spawn, ChildProcess } from 'child_process'
import { request as httpRequest } from 'http'
import { getDB } from './db'
import { exportDBBytes, getDBPath } from './sqlcompat'

const now = () => new Date().toISOString()
const id = () => randomUUID()

export function registerIPC(): void {
  // ── DIALOG ──────────────────────────────────────────────────────────────────
  ipcMain.handle('dialog:selectFolder', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, { properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  // ── ARCHIVES ─────────────────────────────────────────────────────────────────
  ipcMain.handle('archives:list', () =>
    getDB().prepare('SELECT * FROM archives ORDER BY name').all()
  )

  ipcMain.handle('archives:create', (_, data: { name: string; root_path: string; description?: string }) => {
    const rec = { id: id(), name: data.name, root_path: data.root_path, description: data.description || '', created_at: now(), updated_at: now() }
    getDB().prepare('INSERT INTO archives (id,name,root_path,description,created_at,updated_at) VALUES (@id,@name,@root_path,@description,@created_at,@updated_at)').run(rec)
    return rec
  })

  ipcMain.handle('archives:update', (_, archiveId: string, data: { name: string; description?: string }) => {
    getDB().prepare('UPDATE archives SET name=@name,description=@description,updated_at=@u WHERE id=@id').run({ name: data.name, description: data.description || '', u: now(), id: archiveId })
    return { ok: true }
  })

  ipcMain.handle('archives:delete', (_, archiveId: string) => {
    getDB().prepare('DELETE FROM archives WHERE id=?').run(archiveId)
    return { ok: true }
  })

  // ── FILES BROWSER ────────────────────────────────────────────────────────────
  ipcMain.handle('files:browse', (_, archiveId: string, subPath: string) => {
    const archive = getDB().prepare('SELECT root_path FROM archives WHERE id=?').get(archiveId) as { root_path: string } | undefined
    if (!archive) throw new Error('Archive introuvable')

    const target = subPath ? join(archive.root_path, subPath) : archive.root_path
    const entries = readdirSync(target, { withFileTypes: true })

    return entries
      .filter(e => !e.name.startsWith('.'))
      .map(e => {
        const fullPath = join(target, e.name)
        const isDir = e.isDirectory()
        const rel = relative(archive.root_path, fullPath).replace(/\\/g, '/')
        let size = 0
        try { if (!isDir) size = statSync(fullPath).size } catch {}
        return { name: e.name, path: rel, full_path: fullPath, is_dir: isDir, size, ext: extname(e.name).toLowerCase() }
      })
      .sort((a, b) => {
        if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1
        return a.name.localeCompare(b.name, 'fr')
      })
  })

  ipcMain.handle('files:browseAll', (_, archiveId: string, subPath: string) => {
    const archive = getDB().prepare('SELECT root_path FROM archives WHERE id=?').get(archiveId) as { root_path: string } | undefined
    if (!archive) throw new Error('Archive introuvable')
    const root = archive.root_path

    function collectFiles(dir: string): object[] {
      let result: object[] = []
      let entries: ReturnType<typeof readdirSync>
      try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return result }
      for (const e of entries) {
        if (e.name.startsWith('.')) continue
        const fullPath = join(dir, e.name)
        if (e.isDirectory()) {
          result = result.concat(collectFiles(fullPath))
        } else {
          const rel = relative(root, fullPath).replace(/\\/g, '/')
          let size = 0
          try { size = statSync(fullPath).size } catch {}
          result.push({ name: e.name, path: rel, full_path: fullPath, is_dir: false, size, ext: extname(e.name).toLowerCase() })
        }
      }
      return result
    }

    const target = subPath ? join(root, subPath) : root
    return collectFiles(target)
  })

  // ── FICHES ───────────────────────────────────────────────────────────────────
  ipcMain.handle('fiches:list', (_, archiveId: string) => {
    const fiches = getDB().prepare(`
      SELECT f.*, COUNT(d.id) as document_count
      FROM fiches f LEFT JOIN documents d ON d.fiche_id = f.id
      WHERE f.archive_id = ? GROUP BY f.id ORDER BY f.title
    `).all(archiveId)
    return (fiches as any[]).map(f => {
      if (!f.avatar_zone_id) return { ...f, avatar_zone: null }
      const az = getDB().prepare('SELECT z.*, d.file_path as doc_file_path FROM zones z JOIN documents d ON z.document_id = d.id WHERE z.id = ?').get(f.avatar_zone_id)
      return { ...f, avatar_zone: az || null }
    })
  })

  ipcMain.handle('fiches:create', (_, archiveId: string, data: { title: string; description?: string; date?: string }) => {
    const rec = { id: id(), archive_id: archiveId, title: data.title, description: data.description || '', date: data.date || '', created_at: now(), updated_at: now() }
    getDB().prepare('INSERT INTO fiches (id,archive_id,title,description,date,created_at,updated_at) VALUES (@id,@archive_id,@title,@description,@date,@created_at,@updated_at)').run(rec)
    return rec
  })

  ipcMain.handle('fiches:get', (_, ficheId: string) => {
    const fiche = getDB().prepare('SELECT * FROM fiches WHERE id=?').get(ficheId) as any
    if (!fiche) throw new Error('Fiche introuvable')
    const documents = getDB().prepare('SELECT * FROM documents WHERE fiche_id=? ORDER BY filename').all(ficheId)
    let avatarZone = null
    if (fiche.avatar_zone_id) {
      avatarZone = getDB().prepare('SELECT z.*, d.file_path as doc_file_path FROM zones z JOIN documents d ON z.document_id = d.id WHERE z.id = ?').get(fiche.avatar_zone_id) || null
    }
    return { ...fiche, documents, avatar_zone: avatarZone }
  })

  ipcMain.handle('fiches:setAvatar', (_, ficheId: string, zoneId: string | null) => {
    getDB().prepare('UPDATE fiches SET avatar_zone_id=?,updated_at=? WHERE id=?').run(zoneId, now(), ficheId)
    return { ok: true }
  })

  ipcMain.handle('fiches:update', (_, ficheId: string, data: { title: string; description?: string; date?: string }) => {
    getDB().prepare('UPDATE fiches SET title=@t,description=@d,date=@dt,updated_at=@u WHERE id=@id').run({ t: data.title, d: data.description || '', dt: data.date || '', u: now(), id: ficheId })
    return { ok: true }
  })

  ipcMain.handle('fiches:delete', (_, ficheId: string) => {
    getDB().prepare('DELETE FROM fiches WHERE id=?').run(ficheId)
    return { ok: true }
  })

  ipcMain.handle('fiches:addDocument', (_, ficheId: string, documentId: string) => {
    getDB().prepare('UPDATE documents SET fiche_id=?,updated_at=? WHERE id=?').run(ficheId, now(), documentId)
    return { ok: true }
  })

  ipcMain.handle('fiches:removeDocument', (_, ficheId: string, documentId: string) => {
    getDB().prepare('UPDATE documents SET fiche_id=NULL,updated_at=? WHERE id=? AND fiche_id=?').run(now(), documentId, ficheId)
    return { ok: true }
  })

  // ── DOCUMENTS ────────────────────────────────────────────────────────────────
  ipcMain.handle('documents:list', (_, archiveId: string) =>
    getDB().prepare('SELECT * FROM documents WHERE archive_id=? ORDER BY filename').all(archiveId)
  )

  ipcMain.handle('documents:recentForHome', (_, archiveId: string) =>
    getDB().prepare('SELECT * FROM documents WHERE archive_id=? ORDER BY updated_at DESC LIMIT 12').all(archiveId)
  )

  ipcMain.handle('documents:create', (_, archiveId: string, data: { file_path: string; fiche_id?: string; title?: string; description?: string; date?: string; location?: string }) => {
    const filename = basename(data.file_path)
    const ext = extname(filename).toLowerCase()
    const mimeMap: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.tiff': 'image/tiff', '.pdf': 'application/pdf' }
    const rec = { id: id(), archive_id: archiveId, fiche_id: data.fiche_id || null, file_path: data.file_path, filename, mime_type: mimeMap[ext] || 'application/octet-stream', title: data.title || '', description: data.description || '', date: data.date || '', location: data.location || '', linked_document_id: null, link_type: '', created_at: now(), updated_at: now() }
    getDB().prepare('INSERT INTO documents (id,archive_id,fiche_id,file_path,filename,mime_type,title,description,date,location,linked_document_id,link_type,created_at,updated_at) VALUES (@id,@archive_id,@fiche_id,@file_path,@filename,@mime_type,@title,@description,@date,@location,@linked_document_id,@link_type,@created_at,@updated_at)').run(rec)
    return rec
  })

  ipcMain.handle('documents:get', (_, docId: string) => {
    const doc = getDB().prepare('SELECT * FROM documents WHERE id=?').get(docId)
    if (!doc) throw new Error('Document introuvable')
    const zones = getDB().prepare('SELECT * FROM zones WHERE document_id=? ORDER BY created_at').all(docId)
    const zonesWithPersons = zones.map((z: any) => {
      const persons = getDB().prepare('SELECT p.* FROM persons p JOIN zone_persons zp ON p.id=zp.person_id WHERE zp.zone_id=?').all(z.id)
      return { ...z, persons }
    })
    return { ...doc as object, zones: zonesWithPersons }
  })

  ipcMain.handle('documents:update', (_, docId: string, data: { title?: string; description?: string; date?: string; location?: string; transcription?: string; fiche_id?: string | null; rotation?: number; crop_x?: number; crop_y?: number; crop_w?: number; crop_h?: number; brightness?: number; contrast?: number; flip_h?: number; flip_v?: number }) => {
    const sets: string[] = ['updated_at=@u']
    const params: Record<string, unknown> = { u: now(), id: docId }
    if (data.title !== undefined)         { sets.push('title=@title');               params.title = data.title }
    if (data.description !== undefined)   { sets.push('description=@description');   params.description = data.description }
    if (data.date !== undefined)          { sets.push('date=@date');                 params.date = data.date }
    if (data.location !== undefined)      { sets.push('location=@location');         params.location = data.location }
    if (data.transcription !== undefined) { sets.push('transcription=@transcription'); params.transcription = data.transcription }
    if ('fiche_id' in data)               { sets.push('fiche_id=@fiche_id');         params.fiche_id = data.fiche_id ?? null }
    if (data.rotation !== undefined)      { sets.push('rotation=@rotation');         params.rotation = data.rotation }
    if (data.crop_x !== undefined)        { sets.push('crop_x=@crop_x');             params.crop_x = data.crop_x }
    if (data.crop_y !== undefined)        { sets.push('crop_y=@crop_y');             params.crop_y = data.crop_y }
    if (data.crop_w !== undefined)        { sets.push('crop_w=@crop_w');             params.crop_w = data.crop_w }
    if (data.crop_h !== undefined)        { sets.push('crop_h=@crop_h');             params.crop_h = data.crop_h }
    if (data.brightness !== undefined)    { sets.push('brightness=@brightness');     params.brightness = data.brightness }
    if (data.contrast !== undefined)      { sets.push('contrast=@contrast');         params.contrast = data.contrast }
    if (data.flip_h !== undefined)        { sets.push('flip_h=@flip_h');             params.flip_h = data.flip_h }
    if (data.flip_v !== undefined)        { sets.push('flip_v=@flip_v');             params.flip_v = data.flip_v }
    getDB().prepare(`UPDATE documents SET ${sets.join(',')} WHERE id=@id`).run(params)
    return { ok: true }
  })

  ipcMain.handle('documents:delete', (_, docId: string) => {
    getDB().prepare('DELETE FROM documents WHERE id=?').run(docId)
    return { ok: true }
  })

  ipcMain.handle('documents:link', (_, docId: string, linkedId: string, linkType: 'recto' | 'verso') => {
    const opposite = linkType === 'recto' ? 'verso' : 'recto'
    getDB().prepare('UPDATE documents SET linked_document_id=?,link_type=?,updated_at=? WHERE id=?').run(linkedId, linkType, now(), docId)
    getDB().prepare('UPDATE documents SET linked_document_id=?,link_type=?,updated_at=? WHERE id=?').run(docId, opposite, now(), linkedId)
    return { ok: true }
  })

  ipcMain.handle('documents:unlink', (_, docId: string) => {
    const doc = getDB().prepare('SELECT linked_document_id FROM documents WHERE id=?').get(docId) as { linked_document_id: string | null } | undefined
    if (doc?.linked_document_id) {
      getDB().prepare('UPDATE documents SET linked_document_id=NULL,link_type=\'\',updated_at=? WHERE id=?').run(now(), doc.linked_document_id)
    }
    getDB().prepare('UPDATE documents SET linked_document_id=NULL,link_type=\'\',updated_at=? WHERE id=?').run(now(), docId)
    return { ok: true }
  })

  // ── ZONES ────────────────────────────────────────────────────────────────────
  ipcMain.handle('zones:create', (_, docId: string, data: { x: number; y: number; width: number; height: number; label?: string; notes?: string; transcription?: string }) => {
    const rec = { id: id(), document_id: docId, x: data.x, y: data.y, width: data.width, height: data.height, label: data.label || '', notes: data.notes || '', transcription: data.transcription || '', created_at: now() }
    getDB().prepare('INSERT INTO zones (id,document_id,x,y,width,height,label,notes,transcription,created_at) VALUES (@id,@document_id,@x,@y,@width,@height,@label,@notes,@transcription,@created_at)').run(rec)
    return rec
  })

  ipcMain.handle('zones:update', (_, zoneId: string, data: { x?: number; y?: number; width?: number; height?: number; label?: string; notes?: string; transcription?: string; face_descriptor?: string | null }) => {
    const sets: string[] = []
    const params: Record<string, unknown> = { id: zoneId }
    if (data.x !== undefined)              { sets.push('x=@x');                       params.x = data.x }
    if (data.y !== undefined)              { sets.push('y=@y');                       params.y = data.y }
    if (data.width !== undefined)          { sets.push('width=@w');                   params.w = data.width }
    if (data.height !== undefined)         { sets.push('height=@h');                  params.h = data.height }
    if (data.label !== undefined)          { sets.push('label=@l');                   params.l = data.label }
    if (data.notes !== undefined)          { sets.push('notes=@n');                   params.n = data.notes }
    if (data.transcription !== undefined)  { sets.push('transcription=@t');           params.t = data.transcription }
    if ('face_descriptor' in data)         { sets.push('face_descriptor=@fd');        params.fd = data.face_descriptor ?? null }
    if (sets.length === 0) return { ok: true }
    getDB().prepare(`UPDATE zones SET ${sets.join(',')} WHERE id=@id`).run(params)
    return { ok: true }
  })

  ipcMain.handle('zones:withFace', (_, archiveId: string) => {
    return getDB().prepare(`
      SELECT z.*, d.file_path as doc_file_path, d.title as doc_title, d.filename as doc_filename, d.id as doc_id,
             p.first_name, p.last_name
      FROM zones z
      JOIN documents d ON z.document_id = d.id
      LEFT JOIN zone_persons zp ON zp.zone_id = z.id
      LEFT JOIN persons p ON p.id = zp.person_id
      WHERE d.archive_id = ? AND z.face_descriptor IS NOT NULL
      ORDER BY z.created_at
    `).all(archiveId)
  })

  ipcMain.handle('zones:listLabels', (_, archiveId: string) => {
    const rows = getDB().prepare(`
      SELECT DISTINCT z.label FROM zones z
      JOIN documents d ON d.id = z.document_id
      WHERE d.archive_id = ? AND z.label != ''
      ORDER BY z.label
    `).all(archiveId) as { label: string }[]
    return rows.map(r => r.label)
  })

  ipcMain.handle('zones:delete', (_, zoneId: string) => {
    getDB().prepare('DELETE FROM zones WHERE id=?').run(zoneId)
    return { ok: true }
  })

  ipcMain.handle('zones:addPerson', (_, zoneId: string, personId: string) => {
    getDB().prepare('INSERT OR IGNORE INTO zone_persons (zone_id,person_id) VALUES (?,?)').run(zoneId, personId)
    return { ok: true }
  })

  ipcMain.handle('zones:removePerson', (_, zoneId: string, personId: string) => {
    getDB().prepare('DELETE FROM zone_persons WHERE zone_id=? AND person_id=?').run(zoneId, personId)
    return { ok: true }
  })

  // ── PERSONS ──────────────────────────────────────────────────────────────────
  ipcMain.handle('doc:thumbnail', async (_, filePath: string, maxPx: number) => {
    try {
      const normalized = filePath.replace(/\//g, '\\')
      const img = await nativeImage.createThumbnailFromPath(normalized, { width: maxPx, height: maxPx })
      return img.toDataURL()
    } catch { return null }
  })

  ipcMain.handle('persons:list', (_, archiveId: string, q?: string) => {
    const like = `%${q || ''}%`
    const persons = archiveId
      ? getDB().prepare('SELECT * FROM persons WHERE archive_id=? AND (first_name LIKE ? OR last_name LIKE ?) ORDER BY last_name,first_name').all(archiveId, like, like)
      : getDB().prepare('SELECT * FROM persons WHERE (first_name LIKE ? OR last_name LIKE ?) ORDER BY last_name,first_name').all(like, like)
    return (persons as any[]).map(p => {
      if (!p.avatar_zone_id) return { ...p, avatar_zone: null }
      const az = getDB().prepare('SELECT z.*, d.file_path as doc_file_path FROM zones z JOIN documents d ON z.document_id = d.id WHERE z.id = ?').get(p.avatar_zone_id)
      return { ...p, avatar_zone: az || null }
    })
  })

  ipcMain.handle('persons:get', (_, personId: string) => {
    const person = getDB().prepare('SELECT * FROM persons WHERE id=?').get(personId) as any
    if (!person) throw new Error('Personne introuvable')
    const zones = getDB().prepare(`
      SELECT z.*, d.file_path as doc_file_path, d.filename as doc_filename,
             COALESCE(NULLIF(d.title,''), d.filename) as doc_title, d.id as doc_id
      FROM zone_persons zp
      JOIN zones z ON z.id = zp.zone_id
      JOIN documents d ON d.id = z.document_id
      WHERE zp.person_id = ?
      ORDER BY z.created_at
    `).all(personId)
    let avatarZone = null
    if (person.avatar_zone_id) {
      avatarZone = getDB().prepare('SELECT z.*, d.file_path as doc_file_path FROM zones z JOIN documents d ON z.document_id = d.id WHERE z.id = ?').get(person.avatar_zone_id) || null
    }
    return { ...person, zones, avatar_zone: avatarZone }
  })

  ipcMain.handle('persons:setAvatar', (_, personId: string, zoneId: string | null) => {
    getDB().prepare('UPDATE persons SET avatar_zone_id=?,updated_at=? WHERE id=?').run(zoneId, now(), personId)
    return { ok: true }
  })

  ipcMain.handle('persons:create', (_, archiveId: string, data: { first_name?: string; last_name: string; birth_date?: string; death_date?: string; birth_place?: string; death_place?: string; notes?: string }) => {
    const rec = { id: id(), archive_id: archiveId, first_name: data.first_name || '', last_name: data.last_name, birth_date: data.birth_date || '', death_date: data.death_date || '', birth_place: data.birth_place || '', death_place: data.death_place || '', notes: data.notes || '', created_at: now(), updated_at: now() }
    getDB().prepare('INSERT INTO persons (id,archive_id,first_name,last_name,birth_date,death_date,birth_place,death_place,notes,created_at,updated_at) VALUES (@id,@archive_id,@first_name,@last_name,@birth_date,@death_date,@birth_place,@death_place,@notes,@created_at,@updated_at)').run(rec)
    return rec
  })

  ipcMain.handle('persons:update', (_, personId: string, data: { first_name?: string; last_name: string; birth_date?: string; death_date?: string; birth_place?: string; death_place?: string; notes?: string }) => {
    getDB().prepare('UPDATE persons SET first_name=@fn,last_name=@ln,birth_date=@bd,death_date=@dd,birth_place=@bp,death_place=@dp,notes=@n,updated_at=@u WHERE id=@id').run({ fn: data.first_name || '', ln: data.last_name, bd: data.birth_date || '', dd: data.death_date || '', bp: data.birth_place || '', dp: data.death_place || '', n: data.notes || '', u: now(), id: personId })
    return { ok: true }
  })

  ipcMain.handle('persons:delete', (_, personId: string) => {
    getDB().prepare('DELETE FROM persons WHERE id=?').run(personId)
    return { ok: true }
  })

  // ── TAGS ─────────────────────────────────────────────────────────────────────
  ipcMain.handle('tags:list', () =>
    getDB().prepare('SELECT * FROM tags ORDER BY name').all()
  )

  ipcMain.handle('tags:create', (_, data: { name: string; color: string }) => {
    const existing = getDB().prepare('SELECT * FROM tags WHERE name=?').get(data.name)
    if (existing) return existing
    const rec = { id: id(), name: data.name, color: data.color }
    getDB().prepare('INSERT INTO tags (id,name,color) VALUES (@id,@name,@color)').run(rec)
    return rec
  })

  ipcMain.handle('tags:update', (_, tagId: string, data: { name: string; color: string }) => {
    getDB().prepare('UPDATE tags SET name=@name,color=@color WHERE id=@id').run({ ...data, id: tagId })
    return { ok: true }
  })

  ipcMain.handle('tags:delete', (_, tagId: string) => {
    getDB().prepare('DELETE FROM tags WHERE id=?').run(tagId)
    return { ok: true }
  })

  ipcMain.handle('tags:forDocument', (_, docId: string) =>
    getDB().prepare('SELECT t.* FROM tags t JOIN document_tags dt ON t.id=dt.tag_id WHERE dt.document_id=? ORDER BY t.name').all(docId)
  )

  ipcMain.handle('tags:addToDocument', (_, docId: string, tagId: string) => {
    getDB().prepare('INSERT OR IGNORE INTO document_tags (document_id,tag_id) VALUES (?,?)').run(docId, tagId)
    return { ok: true }
  })

  ipcMain.handle('tags:removeFromDocument', (_, docId: string, tagId: string) => {
    getDB().prepare('DELETE FROM document_tags WHERE document_id=? AND tag_id=?').run(docId, tagId)
    return { ok: true }
  })

  ipcMain.handle('tags:forFiche', (_, ficheId: string) =>
    getDB().prepare('SELECT t.* FROM tags t JOIN fiche_tags ft ON t.id=ft.tag_id WHERE ft.fiche_id=? ORDER BY t.name').all(ficheId)
  )

  ipcMain.handle('tags:addToFiche', (_, ficheId: string, tagId: string) => {
    getDB().prepare('INSERT OR IGNORE INTO fiche_tags (fiche_id,tag_id) VALUES (?,?)').run(ficheId, tagId)
    return { ok: true }
  })

  ipcMain.handle('tags:removeFromFiche', (_, ficheId: string, tagId: string) => {
    getDB().prepare('DELETE FROM fiche_tags WHERE fiche_id=? AND tag_id=?').run(ficheId, tagId)
    return { ok: true }
  })

  ipcMain.handle('tags:documents', (_, tagId: string) =>
    getDB().prepare(`
      SELECT d.* FROM documents d
      JOIN document_tags dt ON d.id = dt.document_id
      WHERE dt.tag_id = ?
      ORDER BY d.filename
    `).all(tagId)
  )

  ipcMain.handle('tags:counts', () => {
    const rows = getDB().prepare('SELECT tag_id, COUNT(*) as count FROM document_tags GROUP BY tag_id').all() as { tag_id: string; count: number }[]
    const result: Record<string, number> = {}
    rows.forEach(r => { result[r.tag_id] = r.count })
    return result
  })

  // ── ALBUMS ────────────────────────────────────────────────────────────────────
  ipcMain.handle('albums:list', (_, archiveId: string) =>
    getDB().prepare(`
      SELECT a.*, COUNT(ad.document_id) as document_count
      FROM albums a LEFT JOIN album_documents ad ON a.id=ad.album_id
      WHERE a.archive_id=? GROUP BY a.id ORDER BY a.name
    `).all(archiveId)
  )

  ipcMain.handle('albums:create', (_, archiveId: string, data: { name: string; description?: string }) => {
    const rec = { id: id(), archive_id: archiveId, name: data.name, description: data.description || '', cover_doc_id: null, created_at: now(), updated_at: now() }
    getDB().prepare('INSERT INTO albums (id,archive_id,name,description,cover_doc_id,created_at,updated_at) VALUES (@id,@archive_id,@name,@description,@cover_doc_id,@created_at,@updated_at)').run(rec)
    return rec
  })

  ipcMain.handle('albums:get', (_, albumId: string) => {
    const album = getDB().prepare('SELECT * FROM albums WHERE id=?').get(albumId)
    if (!album) throw new Error('Album introuvable')
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
    `).all(albumId)
    return { ...album as object, documents }
  })

  ipcMain.handle('albums:updateDocEntry', (_, albumId: string, docId: string, data: { caption?: string; rotation?: number; crop_x?: number; crop_y?: number; crop_w?: number; crop_h?: number; brightness?: number; contrast?: number; flip_h?: number; flip_v?: number }) => {
    const sets: string[] = []
    const params: Record<string, unknown> = { aid: albumId, did: docId }
    if (data.caption !== undefined)    { sets.push('caption=@caption');       params.caption = data.caption }
    if (data.rotation !== undefined)   { sets.push('rotation=@rotation');      params.rotation = data.rotation }
    if (data.crop_x !== undefined)     { sets.push('crop_x=@crop_x');          params.crop_x = data.crop_x }
    if (data.crop_y !== undefined)     { sets.push('crop_y=@crop_y');          params.crop_y = data.crop_y }
    if (data.crop_w !== undefined)     { sets.push('crop_w=@crop_w');          params.crop_w = data.crop_w }
    if (data.crop_h !== undefined)     { sets.push('crop_h=@crop_h');          params.crop_h = data.crop_h }
    if (data.brightness !== undefined) { sets.push('brightness=@brightness');  params.brightness = data.brightness }
    if (data.contrast !== undefined)   { sets.push('contrast=@contrast');      params.contrast = data.contrast }
    if (data.flip_h !== undefined)     { sets.push('flip_h=@flip_h');          params.flip_h = data.flip_h }
    if (data.flip_v !== undefined)     { sets.push('flip_v=@flip_v');          params.flip_v = data.flip_v }
    if (sets.length === 0) return { ok: true }
    getDB().prepare(`UPDATE album_documents SET ${sets.join(',')} WHERE album_id=@aid AND document_id=@did`).run(params)
    return { ok: true }
  })

  ipcMain.handle('albums:reorder', (_, albumId: string, docIds: string[]) => {
    const stmt = getDB().prepare('UPDATE album_documents SET position=? WHERE album_id=? AND document_id=?')
    docIds.forEach((docId, i) => stmt.run(i, albumId, docId))
    return { ok: true }
  })

  ipcMain.handle('albums:update', (_, albumId: string, data: { name: string; description?: string; cover_doc_id?: string | null }) => {
    getDB().prepare('UPDATE albums SET name=@n,description=@d,cover_doc_id=@c,updated_at=@u WHERE id=@id').run({ n: data.name, d: data.description || '', c: data.cover_doc_id ?? null, u: now(), id: albumId })
    return { ok: true }
  })

  ipcMain.handle('albums:delete', (_, albumId: string) => {
    getDB().prepare('DELETE FROM albums WHERE id=?').run(albumId)
    return { ok: true }
  })

  ipcMain.handle('albums:addDocument', (_, albumId: string, docId: string) => {
    const maxPos: any = getDB().prepare('SELECT MAX(position) as m FROM album_documents WHERE album_id=?').get(albumId)
    const pos = (maxPos?.m ?? -1) + 1
    getDB().prepare('INSERT OR IGNORE INTO album_documents (album_id,document_id,position) VALUES (?,?,?)').run(albumId, docId, pos)
    return { ok: true }
  })

  ipcMain.handle('albums:addDocuments', (_, albumId: string, docIds: string[]) => {
    const maxPos: any = getDB().prepare('SELECT MAX(position) as m FROM album_documents WHERE album_id=?').get(albumId)
    let pos = (maxPos?.m ?? -1) + 1
    for (const docId of docIds) {
      getDB().prepare('INSERT OR IGNORE INTO album_documents (album_id,document_id,position) VALUES (?,?,?)').run(albumId, docId, pos++)
    }
    return { ok: true }
  })

  ipcMain.handle('albums:removeDocument', (_, albumId: string, docId: string) => {
    getDB().prepare('DELETE FROM album_documents WHERE album_id=? AND document_id=?').run(albumId, docId)
    return { ok: true }
  })

  // ── EXPORT / IMPORT ──────────────────────────────────────────────────────────
  ipcMain.handle('archive:export', async (event, archiveId: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const db = getDB()
    const archive = db.prepare('SELECT * FROM archives WHERE id=?').get(archiveId) as any
    if (!archive) throw new Error('Archive introuvable')
    const rootPath: string = archive.root_path

    const saveResult = await dialog.showSaveDialog(win!, {
      title: 'Exporter les données',
      defaultPath: `${archive.name.replace(/[^a-zA-Z0-9_\- ]/g, '_')}.onesime`,
      filters: [{ name: 'Fichier Onésime', extensions: ['onesime'] }],
    })
    if (saveResult.canceled || !saveResult.filePath) return { ok: false }

    const fiches   = db.prepare('SELECT * FROM fiches WHERE archive_id=?').all(archiveId) as any[]
    const persons  = db.prepare('SELECT * FROM persons WHERE archive_id=?').all(archiveId) as any[]
    const albums   = db.prepare('SELECT * FROM albums WHERE archive_id=?').all(archiveId) as any[]
    const rawDocs  = db.prepare('SELECT * FROM documents WHERE archive_id=?').all(archiveId) as any[]
    const tags     = db.prepare('SELECT * FROM tags').all() as any[]

    const inList = (arr: any[]) => arr.map(() => '?').join(',')
    const docIds   = rawDocs.map(d => d.id)
    const ficheIds = fiches.map(f => f.id)
    const albumIds = albums.map(a => a.id)

    const docs = rawDocs.map(d => ({
      ...d,
      file_path: relative(rootPath, d.file_path).replace(/\\/g, '/'),
    }))

    const zones       = docIds.length   ? (db.prepare(`SELECT * FROM zones WHERE document_id IN (${inList(docIds)})`).all(...docIds) as any[]) : []
    const zoneIds     = zones.map(z => z.id)
    const zonePersons = zoneIds.length  ? (db.prepare(`SELECT * FROM zone_persons WHERE zone_id IN (${inList(zoneIds)})`).all(...zoneIds) as any[]) : []
    const docTags     = docIds.length   ? (db.prepare(`SELECT * FROM document_tags WHERE document_id IN (${inList(docIds)})`).all(...docIds) as any[]) : []
    const ficheTags   = ficheIds.length ? (db.prepare(`SELECT * FROM fiche_tags WHERE fiche_id IN (${inList(ficheIds)})`).all(...ficheIds) as any[]) : []
    const albumDocs   = albumIds.length ? (db.prepare(`SELECT * FROM album_documents WHERE album_id IN (${inList(albumIds)})`).all(...albumIds) as any[]) : []

    const exportData = {
      version: 1,
      exported_at: new Date().toISOString(),
      archive: { name: archive.name, description: archive.description },
      fiches, persons, documents: docs, zones, zone_persons: zonePersons,
      tags, document_tags: docTags, fiche_tags: ficheTags, albums, album_documents: albumDocs,
    }

    writeFileSync(saveResult.filePath, JSON.stringify(exportData, null, 2), 'utf-8')
    return {
      ok: true,
      counts: {
        documents: docs.length, fiches: fiches.length, persons: persons.length,
        zones: zones.length, albums: albums.length,
      },
    }
  })

  ipcMain.handle('archive:import', async (event, archiveId: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const db = getDB()
    const archive = db.prepare('SELECT * FROM archives WHERE id=?').get(archiveId) as any
    if (!archive) throw new Error('Archive introuvable')
    const rootPath: string = archive.root_path

    const openResult = await dialog.showOpenDialog(win!, {
      title: 'Importer les données',
      filters: [{ name: 'Fichier Onésime', extensions: ['onesime'] }],
      properties: ['openFile'],
    })
    if (openResult.canceled || !openResult.filePaths[0]) return { ok: false }

    const raw = readFileSync(openResult.filePaths[0], 'utf-8')
    const data = JSON.parse(raw)
    if (!data.version || data.version !== 1) throw new Error('Format de fichier non reconnu')

    db.exec('BEGIN')
    try {
      for (const tag of (data.tags ?? [])) {
        db.prepare('INSERT OR IGNORE INTO tags (id,name,color) VALUES (?,?,?)').run(tag.id, tag.name, tag.color)
      }
      for (const f of (data.fiches ?? [])) {
        db.prepare('INSERT OR REPLACE INTO fiches (id,archive_id,title,description,date,avatar_zone_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').run(f.id, archiveId, f.title, f.description, f.date, f.avatar_zone_id ?? null, f.created_at, f.updated_at)
      }
      for (const p of (data.persons ?? [])) {
        db.prepare('INSERT OR REPLACE INTO persons (id,archive_id,first_name,last_name,birth_date,death_date,notes,avatar_zone_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(p.id, archiveId, p.first_name, p.last_name, p.birth_date, p.death_date, p.notes, p.avatar_zone_id ?? null, p.created_at, p.updated_at)
      }
      for (const d of (data.documents ?? [])) {
        const filePath = join(rootPath, d.file_path)
        db.prepare('INSERT OR REPLACE INTO documents (id,archive_id,fiche_id,file_path,filename,mime_type,title,description,transcription,date,location,linked_document_id,link_type,rotation,crop_x,crop_y,crop_w,crop_h,brightness,contrast,flip_h,flip_v,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(d.id, archiveId, d.fiche_id ?? null, filePath, d.filename, d.mime_type, d.title, d.description, d.transcription ?? '', d.date, d.location ?? '', d.linked_document_id ?? null, d.link_type ?? '', d.rotation ?? 0, d.crop_x ?? 0, d.crop_y ?? 0, d.crop_w ?? 1, d.crop_h ?? 1, d.brightness ?? 0, d.contrast ?? 0, d.flip_h ?? 0, d.flip_v ?? 0, d.created_at, d.updated_at)
      }
      for (const z of (data.zones ?? [])) {
        db.prepare('INSERT OR REPLACE INTO zones (id,document_id,x,y,width,height,label,notes,transcription,face_descriptor,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(z.id, z.document_id, z.x, z.y, z.width, z.height, z.label, z.notes, z.transcription ?? '', z.face_descriptor ?? null, z.created_at)
      }
      for (const zp of (data.zone_persons ?? [])) {
        db.prepare('INSERT OR IGNORE INTO zone_persons (zone_id,person_id) VALUES (?,?)').run(zp.zone_id, zp.person_id)
      }
      for (const dt of (data.document_tags ?? [])) {
        db.prepare('INSERT OR IGNORE INTO document_tags (document_id,tag_id) VALUES (?,?)').run(dt.document_id, dt.tag_id)
      }
      for (const ft of (data.fiche_tags ?? [])) {
        db.prepare('INSERT OR IGNORE INTO fiche_tags (fiche_id,tag_id) VALUES (?,?)').run(ft.fiche_id, ft.tag_id)
      }
      for (const a of (data.albums ?? [])) {
        db.prepare('INSERT OR REPLACE INTO albums (id,archive_id,name,description,cover_doc_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').run(a.id, archiveId, a.name, a.description, a.cover_doc_id ?? null, a.created_at, a.updated_at)
      }
      for (const ad of (data.album_documents ?? [])) {
        db.prepare('INSERT OR IGNORE INTO album_documents (album_id,document_id,position,caption,rotation,crop_x,crop_y,crop_w,crop_h,brightness,contrast,flip_h,flip_v) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(ad.album_id, ad.document_id, ad.position ?? 0, ad.caption ?? '', ad.rotation ?? 0, ad.crop_x ?? 0, ad.crop_y ?? 0, ad.crop_w ?? 1, ad.crop_h ?? 1, ad.brightness ?? 0, ad.contrast ?? 0, ad.flip_h ?? 0, ad.flip_v ?? 0)
      }
      db.exec('COMMIT')
    } catch (e) {
      db.exec('ROLLBACK')
      throw e
    }

    return {
      ok: true,
      counts: {
        documents: (data.documents ?? []).length,
        fiches: (data.fiches ?? []).length,
        persons: (data.persons ?? []).length,
        zones: (data.zones ?? []).length,
        albums: (data.albums ?? []).length,
      },
    }
  })

  // ── SEARCH ───────────────────────────────────────────────────────────────────
  ipcMain.handle('search:query', (_, q: string, archiveId?: string) => {
    const like = `%${q}%`
    const af = archiveId ? 'AND archive_id=?' : ''
    const args = (extra: string[]) => archiveId ? [like, like, ...extra, archiveId] : [like, like, ...extra]

    const fiches = getDB().prepare(`SELECT 'fiche' as type,id,title as label,'' as extra FROM fiches WHERE (title LIKE ? OR description LIKE ?) ${af}`).all(...args([]))
    const docs   = getDB().prepare(`SELECT 'document' as type,id,COALESCE(NULLIF(title,''),filename) as label,file_path as extra FROM documents WHERE (title LIKE ? OR description LIKE ? OR filename LIKE ? OR transcription LIKE ?) ${af}`).all(...args([like, like]))
    const persons = getDB().prepare(`SELECT 'person' as type,id,(first_name||' '||last_name) as label,(birth_date||CASE WHEN death_date!='' THEN ' – '||death_date ELSE '' END) as extra FROM persons WHERE (first_name LIKE ? OR last_name LIKE ?) ${af}`).all(...args([]))

    return [...fiches, ...docs, ...persons]
  })

  // ── PERSONS MERGE ────────────────────────────────────────────────────────────
  ipcMain.handle('persons:merge', (_, sourceId: string, targetId: string) => {
    const db = getDB()
    const source = db.prepare('SELECT * FROM persons WHERE id=?').get(sourceId) as any
    const target = db.prepare('SELECT * FROM persons WHERE id=?').get(targetId) as any
    if (!source || !target) throw new Error('Personne introuvable')
    db.prepare('UPDATE zone_persons SET person_id=? WHERE person_id=?').run(targetId, sourceId)
    if (source.avatar_zone_id && !target.avatar_zone_id) {
      db.prepare('UPDATE persons SET avatar_zone_id=? WHERE id=?').run(source.avatar_zone_id, targetId)
    }
    const mergedNotes = [target.notes, source.notes].filter(Boolean).join('\n')
    if (mergedNotes) db.prepare('UPDATE persons SET notes=? WHERE id=?').run(mergedNotes, targetId)
    db.prepare('DELETE FROM persons WHERE id=?').run(sourceId)
    return { ok: true }
  })

  // ── FICHES MERGE ─────────────────────────────────────────────────────────────
  ipcMain.handle('fiches:merge', (_, sourceId: string, targetId: string) => {
    const db = getDB()
    const source = db.prepare('SELECT * FROM fiches WHERE id=?').get(sourceId) as any
    const target = db.prepare('SELECT * FROM fiches WHERE id=?').get(targetId) as any
    if (!source || !target) throw new Error('Fiche introuvable')
    db.prepare('UPDATE documents SET fiche_id=? WHERE fiche_id=?').run(targetId, sourceId)
    if (source.date && !target.date) db.prepare('UPDATE fiches SET date=? WHERE id=?').run(source.date, targetId)
    if (source.avatar_zone_id && !target.avatar_zone_id) {
      db.prepare('UPDATE fiches SET avatar_zone_id=? WHERE id=?').run(source.avatar_zone_id, targetId)
    }
    const mergedDesc = [target.description, source.description].filter(Boolean).join('\n')
    if (mergedDesc) db.prepare('UPDATE fiches SET description=? WHERE id=?').run(mergedDesc, targetId)
    db.prepare('DELETE FROM fiches WHERE id=?').run(sourceId)
    return { ok: true }
  })

  // ── ZONES ALL LABELED (batch reindex) ────────────────────────────────────────
  ipcMain.handle('zones:allLabeled', (_, archiveId: string) => {
    return getDB().prepare(`
      SELECT z.id, z.document_id, z.x, z.y, z.width, z.height, z.label, z.face_descriptor,
             d.file_path as doc_file_path, COALESCE(NULLIF(d.title,''), d.filename) as doc_name
      FROM zones z
      JOIN documents d ON z.document_id = d.id
      WHERE d.archive_id = ? AND (z.label != '' OR z.face_descriptor IS NOT NULL)
      ORDER BY d.filename, z.id
    `).all(archiveId)
  })

  // ── ARCHIVE NOTES ─────────────────────────────────────────────────────────────
  ipcMain.handle('archive:notes:get', (_, archiveId: string) => {
    const row = getDB().prepare('SELECT notes FROM archives WHERE id=?').get(archiveId) as any
    return row?.notes ?? ''
  })

  ipcMain.handle('archive:notes:set', (_, archiveId: string, notes: string) => {
    getDB().prepare('UPDATE archives SET notes=?,updated_at=? WHERE id=?').run(notes, now(), archiveId)
    return { ok: true }
  })

  // ── ARCHIVE STATS ─────────────────────────────────────────────────────────────
  ipcMain.handle('archive:stats', (_, archiveId: string) => {
    const db = getDB()
    const docCount = (db.prepare('SELECT COUNT(*) as n FROM documents WHERE archive_id=?').get(archiveId) as any).n
    const ficheCount = (db.prepare('SELECT COUNT(*) as n FROM fiches WHERE archive_id=?').get(archiveId) as any).n
    const personCount = (db.prepare('SELECT COUNT(*) as n FROM persons WHERE archive_id=?').get(archiveId) as any).n
    const zoneCount = (db.prepare('SELECT COUNT(*) as n FROM zones z JOIN documents d ON z.document_id=d.id WHERE d.archive_id=?').get(archiveId) as any).n
    const faceCount = (db.prepare("SELECT COUNT(*) as n FROM zones z JOIN documents d ON z.document_id=d.id WHERE d.archive_id=? AND z.face_descriptor IS NOT NULL").get(archiveId) as any).n
    const albumCount = (db.prepare('SELECT COUNT(*) as n FROM albums WHERE archive_id=?').get(archiveId) as any).n
    const transcribedCount = (db.prepare("SELECT COUNT(*) as n FROM documents WHERE archive_id=? AND transcription!=''").get(archiveId) as any).n
    const withLocation = (db.prepare("SELECT COUNT(*) as n FROM documents WHERE archive_id=? AND location!=''").get(archiveId) as any).n
    const withDate = (db.prepare("SELECT COUNT(*) as n FROM documents WHERE archive_id=? AND date!=''").get(archiveId) as any).n
    const byMime = db.prepare("SELECT mime_type, COUNT(*) as n FROM documents WHERE archive_id=? GROUP BY mime_type ORDER BY n DESC").all(archiveId) as any[]
    const recentDocs = db.prepare("SELECT COALESCE(NULLIF(title,''),filename) as name, updated_at FROM documents WHERE archive_id=? ORDER BY updated_at DESC LIMIT 5").all(archiveId)
    return { docCount, ficheCount, personCount, zoneCount, faceCount, albumCount, transcribedCount, withLocation, withDate, byMime, recentDocs }
  })

  // ── ARCHIVE DUPLICATES ────────────────────────────────────────────────────────
  ipcMain.handle('archive:duplicates', (_, archiveId: string) => {
    const docs = getDB().prepare('SELECT id, filename, file_path FROM documents WHERE archive_id=? ORDER BY filename').all(archiveId) as any[]
    const groups: Record<string, typeof docs> = {}
    for (const d of docs) {
      const key = d.filename.toLowerCase()
      if (!groups[key]) groups[key] = []
      groups[key].push(d)
    }
    return Object.values(groups).filter(g => g.length > 1)
  })

  // ── DÉPÔTS ───────────────────────────────────────────────────────────────────
  ipcMain.handle('depots:list', (_, archiveId: string) =>
    getDB().prepare('SELECT d.*, COUNT(s.id) as source_count FROM depots d LEFT JOIN sources_arch s ON s.depot_id=d.id WHERE d.archive_id=? GROUP BY d.id ORDER BY d.nom').all(archiveId)
  )
  ipcMain.handle('depots:create', (_, archiveId: string, data: any) => {
    const rec = { id: id(), archive_id: archiveId, nom: data.nom, sigle: data.sigle||'', adresse: data.adresse||'', telephone: data.telephone||'', email: data.email||'', url: data.url||'', heures: data.heures||'', notes: data.notes||'', created_at: now() }
    getDB().prepare('INSERT INTO depots (id,archive_id,nom,sigle,adresse,telephone,email,url,heures,notes,created_at) VALUES (@id,@archive_id,@nom,@sigle,@adresse,@telephone,@email,@url,@heures,@notes,@created_at)').run(rec)
    return rec
  })
  ipcMain.handle('depots:update', (_, depotId: string, data: any) => {
    getDB().prepare('UPDATE depots SET nom=@nom,sigle=@sigle,adresse=@adresse,telephone=@tel,email=@email,url=@url,heures=@heures,notes=@notes WHERE id=@id').run({ nom:data.nom, sigle:data.sigle||'', adresse:data.adresse||'', tel:data.telephone||'', email:data.email||'', url:data.url||'', heures:data.heures||'', notes:data.notes||'', id:depotId })
    return { ok: true }
  })
  ipcMain.handle('depots:delete', (_, depotId: string) => { getDB().prepare('DELETE FROM depots WHERE id=?').run(depotId); return { ok: true } })

  // ── SOURCES ───────────────────────────────────────────────────────────────────
  ipcMain.handle('sources_arch:list', (_, archiveId: string) =>
    getDB().prepare('SELECT s.*, d.nom as depot_nom, d.sigle as depot_sigle FROM sources_arch s LEFT JOIN depots d ON d.id=s.depot_id WHERE s.archive_id=? ORDER BY s.titre').all(archiveId)
  )
  ipcMain.handle('sources_arch:create', (_, archiveId: string, data: any) => {
    const rec = { id: id(), archive_id: archiveId, depot_id: data.depot_id||null, titre: data.titre, abbrev: data.abbrev||'', auteur: data.auteur||'', date_pub: data.date_pub||'', editeur: data.editeur||'', lieu_pub: data.lieu_pub||'', cote: data.cote||'', type_source: data.type_source||'autre', date_debut: data.date_debut||'', date_fin: data.date_fin||'', description: data.description||'', notes: data.notes||'', created_at: now() }
    getDB().prepare('INSERT INTO sources_arch (id,archive_id,depot_id,titre,abbrev,auteur,date_pub,editeur,lieu_pub,cote,type_source,date_debut,date_fin,description,notes,created_at) VALUES (@id,@archive_id,@depot_id,@titre,@abbrev,@auteur,@date_pub,@editeur,@lieu_pub,@cote,@type_source,@date_debut,@date_fin,@description,@notes,@created_at)').run(rec)
    return rec
  })
  ipcMain.handle('sources_arch:update', (_, sourceId: string, data: any) => {
    getDB().prepare('UPDATE sources_arch SET depot_id=@depot_id,titre=@titre,abbrev=@abbrev,auteur=@auteur,date_pub=@date_pub,editeur=@editeur,lieu_pub=@lieu_pub,cote=@cote,type_source=@type_source,date_debut=@date_debut,date_fin=@date_fin,description=@description,notes=@notes WHERE id=@id').run({ depot_id:data.depot_id||null, titre:data.titre, abbrev:data.abbrev||'', auteur:data.auteur||'', date_pub:data.date_pub||'', editeur:data.editeur||'', lieu_pub:data.lieu_pub||'', cote:data.cote||'', type_source:data.type_source||'autre', date_debut:data.date_debut||'', date_fin:data.date_fin||'', description:data.description||'', notes:data.notes||'', id:sourceId })
    return { ok: true }
  })
  ipcMain.handle('sources_arch:delete', (_, sourceId: string) => { getDB().prepare('DELETE FROM sources_arch WHERE id=?').run(sourceId); return { ok: true } })

  // ── LIEUX ─────────────────────────────────────────────────────────────────────
  ipcMain.handle('lieux:list', (_, archiveId: string) =>
    getDB().prepare('SELECT l.*, p.nom as parent_nom FROM lieux l LEFT JOIN lieux p ON p.id=l.parent_id WHERE l.archive_id=? ORDER BY l.nom').all(archiveId)
  )
  ipcMain.handle('lieux:create', (_, archiveId: string, data: any) => {
    const rec = { id: id(), archive_id: archiveId, nom: data.nom, type_lieu: data.type_lieu||'commune', parent_id: data.parent_id||null, code_insee: data.code_insee||'', notes: data.notes||'', created_at: now() }
    getDB().prepare('INSERT INTO lieux (id,archive_id,nom,type_lieu,parent_id,code_insee,notes,created_at) VALUES (@id,@archive_id,@nom,@type_lieu,@parent_id,@code_insee,@notes,@created_at)').run(rec)
    return rec
  })
  ipcMain.handle('lieux:update', (_, lieuId: string, data: any) => {
    getDB().prepare('UPDATE lieux SET nom=@nom,type_lieu=@tl,parent_id=@pid,code_insee=@ci,notes=@notes WHERE id=@id').run({ nom:data.nom, tl:data.type_lieu||'commune', pid:data.parent_id||null, ci:data.code_insee||'', notes:data.notes||'', id:lieuId })
    return { ok: true }
  })
  ipcMain.handle('lieux:delete', (_, lieuId: string) => { getDB().prepare('DELETE FROM lieux WHERE id=?').run(lieuId); return { ok: true } })

  // ── ACTES ─────────────────────────────────────────────────────────────────────
  ipcMain.handle('actes:list', (_, archiveId: string, filters?: { type_acte?: string; registre_id?: string; q?: string; no_registre?: boolean }) => {
    const f = filters || {}
    let sql = `SELECT a.*, r.nom as registre_nom,
      (SELECT GROUP_CONCAT(p.prenom||' '||p.nom, ', ') FROM actes_parties p WHERE p.acte_id=a.id AND p.role='principal') as principals
      FROM actes a LEFT JOIN registres r ON r.id=a.registre_id
      WHERE a.archive_id=?`
    const args: any[] = [archiveId]
    if (f.type_acte)   { sql += ' AND a.type_acte=?';   args.push(f.type_acte) }
    if (f.registre_id) { sql += ' AND a.registre_id=?'; args.push(f.registre_id) }
    if (f.no_registre) { sql += ' AND a.registre_id IS NULL' }
    if (f.q) {
      sql += ` AND (a.description LIKE ? OR a.lieu_nom LIKE ? OR a.transcription LIKE ? OR a.filename LIKE ? OR EXISTS (SELECT 1 FROM actes_parties p WHERE p.acte_id=a.id AND (p.nom LIKE ? OR p.prenom LIKE ?)))`
      const like = `%${f.q}%`; args.push(like, like, like, like, like, like)
    }
    sql += ' ORDER BY a.date_acte DESC, a.created_at DESC'
    return getDB().prepare(sql).all(...args)
  })
  ipcMain.handle('actes:get', (_, acteId: string) => {
    const acte = getDB().prepare('SELECT a.*, r.nom as registre_nom FROM actes a LEFT JOIN registres r ON r.id=a.registre_id WHERE a.id=?').get(acteId)
    if (!acte) throw new Error('Acte introuvable')
    const parties = getDB().prepare('SELECT * FROM actes_parties WHERE acte_id=? ORDER BY ordre').all(acteId)
    return { ...acte as object, parties }
  })
  ipcMain.handle('actes:create', (_, archiveId: string, data: any) => {
    const rec = { id: id(), archive_id: archiveId, file_path: data.file_path||'', filename: data.filename||basename(data.file_path||''), registre_id: data.registre_id||null, source_id: null, lieu_id: null, lieu_nom: data.lieu_nom||'', type_acte: data.type_acte||'autre', date_acte: data.date_acte||'', date_precision: data.date_precision||'exacte', folio: data.folio||'', acte_num: data.acte_num||'', description: data.description||'', transcription: data.transcription||'', notes: data.notes||'', created_at: now(), updated_at: now() }
    getDB().prepare('INSERT INTO actes (id,archive_id,file_path,filename,registre_id,source_id,lieu_id,lieu_nom,type_acte,date_acte,date_precision,folio,acte_num,description,transcription,notes,created_at,updated_at) VALUES (@id,@archive_id,@file_path,@filename,@registre_id,@source_id,@lieu_id,@lieu_nom,@type_acte,@date_acte,@date_precision,@folio,@acte_num,@description,@transcription,@notes,@created_at,@updated_at)').run(rec)
    return rec
  })
  ipcMain.handle('actes:update', (_, acteId: string, data: any) => {
    getDB().prepare('UPDATE actes SET registre_id=@rid,lieu_nom=@ln,type_acte=@ta,date_acte=@da,date_precision=@dp,folio=@fo,acte_num=@an,description=@desc,transcription=@tr,notes=@no,updated_at=@u WHERE id=@id').run({ rid:data.registre_id||null, ln:data.lieu_nom||'', ta:data.type_acte||'autre', da:data.date_acte||'', dp:data.date_precision||'exacte', fo:data.folio||'', an:data.acte_num||'', desc:data.description||'', tr:data.transcription||'', no:data.notes||'', u:now(), id:acteId })
    return { ok: true }
  })
  ipcMain.handle('actes:delete', (_, acteId: string) => { getDB().prepare('DELETE FROM actes WHERE id=?').run(acteId); return { ok: true } })
  ipcMain.handle('actes:importFiles', async (event, archiveId: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, {
      title: 'Importer des actes',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Images & Documents', extensions: ['jpg', 'jpeg', 'png', 'tif', 'tiff', 'bmp', 'webp', 'gif', 'pdf'] },
        { name: 'Tous les fichiers', extensions: ['*'] },
      ],
    })
    if (result.canceled || result.filePaths.length === 0) return []
    const created: any[] = []
    for (const filePath of result.filePaths) {
      const filename = basename(filePath)
      const rec = { id: id(), archive_id: archiveId, file_path: filePath, filename, registre_id: null, source_id: null, lieu_id: null, lieu_nom: '', type_acte: 'autre', date_acte: '', date_precision: 'exacte', folio: '', acte_num: '', description: '', transcription: '', notes: '', created_at: now(), updated_at: now() }
      getDB().prepare('INSERT INTO actes (id,archive_id,file_path,filename,registre_id,source_id,lieu_id,lieu_nom,type_acte,date_acte,date_precision,folio,acte_num,description,transcription,notes,created_at,updated_at) VALUES (@id,@archive_id,@file_path,@filename,@registre_id,@source_id,@lieu_id,@lieu_nom,@type_acte,@date_acte,@date_precision,@folio,@acte_num,@description,@transcription,@notes,@created_at,@updated_at)').run(rec)
      created.push(rec)
    }
    return created
  })
  ipcMain.handle('actes:parties:set', (_, acteId: string, parties: any[]) => {
    getDB().prepare('DELETE FROM actes_parties WHERE acte_id=?').run(acteId)
    const stmt = getDB().prepare('INSERT INTO actes_parties (id,acte_id,prenom,nom,age,profession,domicile,role,notes,ordre) VALUES (@id,@acte_id,@prenom,@nom,@age,@profession,@domicile,@role,@notes,@ordre)')
    parties.forEach((p, i) => stmt.run({ id:id(), acte_id:acteId, prenom:p.prenom||'', nom:p.nom||'', age:p.age||'', profession:p.profession||'', domicile:p.domicile||'', role:p.role||'principal', notes:p.notes||'', ordre:i }))
    return { ok: true }
  })
  ipcMain.handle('actes:stats', (_, archiveId: string) => {
    const byType = getDB().prepare("SELECT type_acte, COUNT(*) as n FROM actes WHERE archive_id=? GROUP BY type_acte ORDER BY n DESC").all(archiveId)
    const total = getDB().prepare("SELECT COUNT(*) as n FROM actes WHERE archive_id=?").get(archiveId) as any
    return { byType, total: total.n }
  })

  // ── REGISTRES ─────────────────────────────────────────────────────────────────
  ipcMain.handle('registres:list', (_, archiveId: string) =>
    getDB().prepare(`SELECT r.*, COUNT(a.id) as acte_count FROM registres r LEFT JOIN actes a ON a.registre_id=r.id WHERE r.archive_id=? GROUP BY r.id ORDER BY r.date_debut DESC, r.nom`).all(archiveId)
  )
  ipcMain.handle('registres:create', (_, archiveId: string, data: any) => {
    const rec = { id: id(), archive_id: archiveId, nom: data.nom, type_registre: data.type_registre||'autre', default_type_acte: data.default_type_acte||'', default_lieu_nom: data.default_lieu_nom||'', date_debut: data.date_debut||'', date_fin: data.date_fin||'', lieu_nom: data.lieu_nom||'', description: data.description||'', notes: data.notes||'', created_at: now(), updated_at: now() }
    getDB().prepare('INSERT INTO registres (id,archive_id,nom,type_registre,default_type_acte,default_lieu_nom,date_debut,date_fin,lieu_nom,description,notes,created_at,updated_at) VALUES (@id,@archive_id,@nom,@type_registre,@default_type_acte,@default_lieu_nom,@date_debut,@date_fin,@lieu_nom,@description,@notes,@created_at,@updated_at)').run(rec)
    return rec
  })
  ipcMain.handle('registres:get', (_, registreId: string) => {
    const reg = getDB().prepare('SELECT * FROM registres WHERE id=?').get(registreId)
    if (!reg) throw new Error('Registre introuvable')
    const actes = getDB().prepare(`SELECT a.*, (SELECT GROUP_CONCAT(p.prenom||' '||p.nom, ', ') FROM actes_parties p WHERE p.acte_id=a.id AND p.role='principal') as principals FROM actes a WHERE a.registre_id=? ORDER BY a.date_acte, a.created_at`).all(registreId)
    return { ...reg as object, actes }
  })
  ipcMain.handle('registres:update', (_, registreId: string, data: any) => {
    getDB().prepare('UPDATE registres SET nom=@nom,type_registre=@tr,default_type_acte=@dta,default_lieu_nom=@dln,date_debut=@dd,date_fin=@df,lieu_nom=@ln,description=@desc,notes=@no,updated_at=@u WHERE id=@id').run({ nom:data.nom, tr:data.type_registre||'autre', dta:data.default_type_acte||'', dln:data.default_lieu_nom||'', dd:data.date_debut||'', df:data.date_fin||'', ln:data.lieu_nom||'', desc:data.description||'', no:data.notes||'', u:now(), id:registreId })
    return { ok: true }
  })
  ipcMain.handle('registres:delete', (_, registreId: string) => { getDB().prepare('DELETE FROM registres WHERE id=?').run(registreId); return { ok: true } })
  ipcMain.handle('registres:setActe', (_, acteId: string, registreId: string | null) => {
    getDB().prepare('UPDATE actes SET registre_id=?,updated_at=? WHERE id=?').run(registreId, now(), acteId)
    if (registreId) {
      const reg = getDB().prepare('SELECT default_type_acte, default_lieu_nom FROM registres WHERE id=?').get(registreId) as any
      if (reg?.default_type_acte) getDB().prepare('UPDATE actes SET type_acte=?,updated_at=? WHERE id=?').run(reg.default_type_acte, now(), acteId)
      if (reg?.default_lieu_nom) getDB().prepare('UPDATE actes SET lieu_nom=?,updated_at=? WHERE id=?').run(reg.default_lieu_nom, now(), acteId)
    }
    return { ok: true }
  })
  ipcMain.handle('registres:applyDefaults', (_, registreId: string) => {
    const reg = getDB().prepare('SELECT default_type_acte, default_lieu_nom FROM registres WHERE id=?').get(registreId) as any
    if (!reg) return { updated: 0 }
    if (reg.default_type_acte) getDB().prepare('UPDATE actes SET type_acte=?,updated_at=? WHERE registre_id=?').run(reg.default_type_acte, now(), registreId)
    if (reg.default_lieu_nom) getDB().prepare('UPDATE actes SET lieu_nom=?,updated_at=? WHERE registre_id=?').run(reg.default_lieu_nom, now(), registreId)
    const row = getDB().prepare('SELECT COUNT(*) as n FROM actes WHERE registre_id=?').get(registreId) as any
    return { updated: row.n }
  })

  ipcMain.handle('registres:exportPdf', async (_, registreId: string) => {
    try {
      const reg = getDB().prepare('SELECT * FROM registres WHERE id=?').get(registreId) as any
      if (!reg) return { ok: false, error: 'Registre introuvable' }

      const actes = getDB().prepare(
        `SELECT a.*, (SELECT GROUP_CONCAT(p.prenom||' '||p.nom, ', ') FROM actes_parties p WHERE p.acte_id=a.id AND p.role='principal') as principals
         FROM actes a WHERE a.registre_id=? ORDER BY a.date_acte, a.folio, a.acte_num`
      ).all(registreId) as any[]

      const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

      const IMG_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tif', '.tiff'])
      const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp', '.tif': 'image/tiff', '.tiff': 'image/tiff' }

      const REG_LABELS = {
        bms: 'Registre BMS', etat_civil: 'État civil', notaire: 'Notaire',
        cadastre: 'Cadastre', recensement: 'Recensement', correspondance: 'Correspondance', autre: 'Autre',
      }
      const actePages = actes.map((a) => {
        const ex = a.file_path ? extname(a.file_path).toLowerCase() : ''
        let content = '<div class="no-img"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span>' + esc(a.filename || '') + '</span></div>'
        if (IMG_EXTS.has(ex) && a.file_path) {
          try {
            const b64 = readFileSync(a.file_path).toString('base64')
            content = '<img src="data:' + (MIME[ex] || 'image/jpeg') + ';base64,' + b64 + '" alt="">'
          } catch {}
        }

        const datePre = a.date_precision && a.date_precision !== 'exacte' ? a.date_precision + ' ' : ''
        const parts = [
          a.date_acte ? '<span>' + esc(datePre + a.date_acte) + '</span>' : '',
          a.principals ? '<span class="principals">' + esc(a.principals) + '</span>' : '',
          a.folio ? '<span>Folio ' + esc(a.folio) + '</span>' : '',
          a.acte_num ? '<span>N&deg;&nbsp;' + esc(a.acte_num) + '</span>' : '',
        ].filter(Boolean).join('<span class="sep">&middot;</span>')

        return '<div class="page">\n  <div class="page-header">' + parts + '</div>\n  <div class="page-body">' + content + '</div>\n</div>'
      }).join('\n')

      const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
      const period = [reg.date_debut, reg.date_fin].filter(Boolean).join(' – ')

      const css = [
        '* { box-sizing: border-box; margin: 0; padding: 0; }',
        "html, body { background: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }",
        '@page { margin: 0; size: A4; }',
        '.cover { width: 210mm; height: 297mm; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 25mm 30mm; text-align: center; page-break-after: always; break-after: page; position: relative; }',
        '.cover-title { font-size: 26pt; font-weight: 700; color: #0f172a; line-height: 1.2; margin-bottom: 4mm; }',
        '.cover-type { font-size: 9pt; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 3mm; }',
        '.cover-period { font-size: 13pt; color: #475569; margin-bottom: 2mm; }',
        '.cover-lieu { font-size: 11pt; color: #64748b; margin-bottom: 8mm; }',
        '.cover-rule { width: 16mm; height: 2.5pt; background: #f59e0b; border: none; margin: 0 auto 8mm; }',
        '.cover-desc { font-size: 10pt; color: #475569; line-height: 1.6; max-width: 120mm; margin-bottom: 8mm; }',
        '.cover-count { font-size: 10pt; color: #94a3b8; }',
        '.cover-foot { position: absolute; bottom: 10mm; font-size: 8pt; color: #cbd5e1; }',
        '.page { width: 210mm; height: 297mm; display: flex; flex-direction: column; page-break-after: always; break-after: page; overflow: hidden; }',
        '.page-header { flex-shrink: 0; height: 9mm; padding: 0 6mm; display: flex; align-items: center; gap: 3mm; border-bottom: 0.5pt solid #e2e8f0; font-size: 8pt; color: #64748b; white-space: nowrap; overflow: hidden; }',
        '.principals { font-weight: 600; color: #1e293b; }',
        '.sep { color: #cbd5e1; flex-shrink: 0; }',
        '.page-body { flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; background: white; }',
        '.page-body img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }',
        '.no-img { display: flex; flex-direction: column; align-items: center; gap: 4mm; color: #94a3b8; font-size: 9pt; }',
      ].join('\n')

      const coverParts = [
        '<div class="cover">',
        '  <div class="cover-title">' + esc(reg.nom) + '</div>',
        '  <div class="cover-type">' + esc(REG_LABELS[reg.type_registre] || reg.type_registre || 'Autre') + '</div>',
        period ? '  <div class="cover-period">' + esc(period) + '</div>' : '',
        reg.lieu_nom ? '  <div class="cover-lieu">' + esc(reg.lieu_nom) + '</div>' : '',
        '  <hr class="cover-rule">',
        reg.description ? '  <div class="cover-desc">' + esc(reg.description) + '</div>' : '',
        '  <div class="cover-count">' + actes.length + ' acte' + (actes.length !== 1 ? 's' : '') + ' &middot; Export&eacute; le ' + dateStr + '</div>',
        '  <div class="cover-foot">On&eacute;sime v0.2.5.0</div>',
        '</div>',
      ].filter(Boolean).join('\n')

      const html = '<!DOCTYPE html>\n<html lang="fr"><head><meta charset="UTF-8">\n<style>\n' + css + '\n</style>\n</head><body>\n' + coverParts + '\n' + actePages + '\n</body></html>'

      const { filePath, canceled } = await dialog.showSaveDialog({
        title: 'Exporter le registre en PDF',
        defaultPath: reg.nom.replace(/[/\\:*?"<>|]/g, '_') + '.pdf',
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      })
      if (canceled || !filePath) return { ok: false }

      const tmpPath = join(app.getPath('temp'), 'onesime-reg-' + Date.now() + '.html')
      writeFileSync(tmpPath, html, 'utf-8')

      const win = new BrowserWindow({ show: false, webPreferences: { sandbox: false } })
      await win.loadFile(tmpPath)
      const pdfBuf = await win.webContents.printToPDF({ pageSize: 'A4', printBackground: false })
      win.close()
      try { require('fs').unlinkSync(tmpPath) } catch {}

      writeFileSync(filePath, pdfBuf)
      return { ok: true, path: filePath }
    } catch (e) {
      return { ok: false, error: String(e?.message ?? e) }
    }
  })

  // ── ARCHIVE BACKUP ────────────────────────────────────────────────────────────
  ipcMain.handle('archive:backup', async () => {
    const dbPath = getDBPath()
    if (!dbPath) return { ok: false, error: 'DB non initialisée' }
    const backupDir = join(dirname(dbPath), 'backups')
    if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true })
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const dest = join(backupDir, `onesime-${ts}.db`)
    const bytes = exportDBBytes()
    writeFileSync(dest, Buffer.from(bytes))
    // Keep only last 10 backups
    const files = readdirSync(backupDir).filter(f => f.startsWith('onesime-') && f.endsWith('.db')).sort()
    for (const old of files.slice(0, Math.max(0, files.length - 10))) {
      try { require('fs').unlinkSync(join(backupDir, old)) } catch {}
    }
    return { ok: true, path: dest, count: files.length }
  })

  // ── HTR ─────────────────────────────────────────────────────────────────────
  ipcMain.handle('htr:status', () => htrGet('/status').catch(() => ({ ok: false, model_ready: false, model_loading: false, model_error: 'Service non disponible' })))
  ipcMain.handle('htr:transcribe', (_, filePath: string) => htrPost('/transcribe', { file_path: filePath }))
  ipcMain.handle('htr:saveCorrection', (_, acteId: string, filePath: string, transcription: string) => htrPost('/correction', { acte_id: acteId, file_path: filePath, transcription }))
  ipcMain.handle('htr:train', () => htrPost('/train', {}))
  ipcMain.handle('htr:trainStatus', () => htrGet('/train/status').catch(() => ({ running: false, status: 'error' })))
}

// ── HTR Service ───────────────────────────────────────────────────────────────
const HTR_PORT = 7842
let _htrProc: ChildProcess | null = null

function htrGet(path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = httpRequest({ hostname: '127.0.0.1', port: HTR_PORT, path, method: 'GET' }, (res) => {
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => { try { resolve(JSON.parse(data)) } catch { reject(new Error('Parse error')) } })
    })
    req.on('error', reject)
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')) })
    req.end()
  })
}

function htrPost(path: string, body: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body)
    const req = httpRequest(
      { hostname: '127.0.0.1', port: HTR_PORT, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) } },
      (res) => {
        let data = ''
        res.on('data', c => { data += c })
        res.on('end', () => { try { resolve(JSON.parse(data)) } catch { reject(new Error('Parse error')) } })
      }
    )
    req.on('error', reject)
    req.setTimeout(120000, () => { req.destroy(); reject(new Error('Timeout')) })
    req.write(bodyStr)
    req.end()
  })
}

export function startHtrService(): void {
  const serverScript = join(app.getAppPath(), 'htr_service', 'server.py')
  if (!existsSync(serverScript)) {
    console.warn('[HTR] server.py introuvable, service désactivé')
    return
  }

  // Préférer python3 (3.13) à python (3.14 sur ce système)
  const python = process.platform === 'win32' ? 'python3' : 'python3'

  _htrProc = spawn(python, [serverScript], {
    env: { ...process.env, HTR_PORT: String(HTR_PORT), PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  _htrProc.stdout?.on('data', d => process.stdout.write(`[HTR] ${d}`))
  _htrProc.stderr?.on('data', d => process.stderr.write(`[HTR] ${d}`))
  _htrProc.on('error', e => console.error('[HTR] Erreur démarrage :', e.message))
  _htrProc.on('exit', code => { if (code !== null && code !== 0) console.warn(`[HTR] Processus terminé (code ${code})`) })
}

export function stopHtrService(): void {
  if (_htrProc) {
    _htrProc.kill()
    _htrProc = null
  }
}
