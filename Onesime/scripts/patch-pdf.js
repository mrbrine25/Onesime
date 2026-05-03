const fs = require('fs')
const path = require('path')

const src = fs.readFileSync(path.join(__dirname, '../src/main/ipc.ts'), 'utf-8')
const lines = src.split('\n')

// Find handler start/end by brace depth
const start = lines.findIndex(l => l.includes("ipcMain.handle('registres:exportPdf'"))
let depth = 0, end = -1
for (let i = start; i < lines.length; i++) {
  for (const c of lines[i]) { if (c === '{') depth++; else if (c === '}') depth-- }
  if (depth === 0 && i > start) { end = i; break }
}
console.log(`Replacing lines ${start+1}–${end+1}`)

const newHandler = `  ipcMain.handle('registres:exportPdf', async (_, registreId: string) => {
    try {
      const reg = getDB().prepare('SELECT * FROM registres WHERE id=?').get(registreId) as any
      if (!reg) return { ok: false, error: 'Registre introuvable' }

      const actes = getDB().prepare(
        \`SELECT a.*, (SELECT GROUP_CONCAT(p.prenom||' '||p.nom, ', ') FROM actes_parties p WHERE p.acte_id=a.id AND p.role='principal') as principals
         FROM actes a WHERE a.registre_id=? ORDER BY a.date_acte, a.folio, a.acte_num\`
      ).all(registreId) as any[]

      const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

      const IMG_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tif', '.tiff'])
      const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp', '.tif': 'image/tiff', '.tiff': 'image/tiff' }

      const TYPE_LABELS = {
        naissance: 'Naissance', bapteme: 'Baptême', mariage: 'Mariage', bans: 'Publication de bans',
        deces: 'Décès', sepulture: 'Sépulture', contrat_mariage: 'Contrat de mariage',
        inventaire: 'Inventaire après décès', recensement: 'Recensement',
        acte_notarie: 'Acte notarié', naturalisation: 'Naturalisation', autre: 'Autre',
      }
      const REG_LABELS = {
        bms: 'Registre BMS', etat_civil: 'État civil', notaire: 'Notaire',
        cadastre: 'Cadastre', recensement: 'Recensement', correspondance: 'Correspondance', autre: 'Autre',
      }
      const TYPE_COLORS = {
        naissance: 'background:#dbeafe;color:#1d4ed8',
        bapteme: 'background:#cffafe;color:#0e7490',
        mariage: 'background:#ffe4e6;color:#be123c',
        bans: 'background:#fce7f3;color:#9d174d',
        deces: 'background:#f1f5f9;color:#475569',
        sepulture: 'background:#f8fafc;color:#64748b',
        contrat_mariage: 'background:#f3e8ff;color:#7e22ce',
        inventaire: 'background:#fff7ed;color:#c2410c',
        recensement: 'background:#fffbeb;color:#b45309',
        acte_notarie: 'background:#fefce8;color:#a16207',
        naturalisation: 'background:#dcfce7;color:#15803d',
        autre: 'background:#f8fafc;color:#64748b',
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

        const typeLabel = TYPE_LABELS[a.type_acte] || a.type_acte || ''
        const typeStyle = TYPE_COLORS[a.type_acte] || TYPE_COLORS.autre
        const datePre = a.date_precision && a.date_precision !== 'exacte' ? a.date_precision + ' ' : ''
        const parts = [
          typeLabel ? '<span class="badge" style="' + typeStyle + '">' + esc(typeLabel) + '</span>' : '',
          a.date_acte ? '<span>' + esc(datePre + a.date_acte) + '</span>' : '',
          a.lieu_nom ? '<span>' + esc(a.lieu_nom) + '</span>' : '',
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
        '.badge { padding: 1pt 5pt; border-radius: 99pt; font-size: 7.5pt; font-weight: 600; flex-shrink: 0; }',
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
        defaultPath: reg.nom.replace(/[/\\\\:*?"<>|]/g, '_') + '.pdf',
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
  })`

const newLines = [...lines.slice(0, start), ...newHandler.split('\n'), ...lines.slice(end + 1)]
fs.writeFileSync(path.join(__dirname, '../src/main/ipc.ts'), newLines.join('\n'), 'utf-8')
console.log('Patch applied. Lines:', newLines.length)
