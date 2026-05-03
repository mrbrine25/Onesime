import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getActes, getActeStats, getRegistres, createActe, browseArchive, browseArchiveAll, getThumbnail, fileUrl } from '../../api/client'
import type { Acte, Registre, FileEntry } from '../../types'
import { TYPE_ACTE_LABELS, TYPE_ACTE_COLORS } from '../../types'

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tif', '.tiff'])
const IMPORTABLE_EXTS = new Set([...IMAGE_EXTS, '.pdf'])

function TypeBadge({ type }: { type: string }) {
  const cls = TYPE_ACTE_COLORS[type] || TYPE_ACTE_COLORS.autre
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${cls}`}>{TYPE_ACTE_LABELS[type] || type}</span>
}

function ActeThumb({ acte }: { acte: Acte }) {
  const ext = acte.filename ? acte.filename.slice(acte.filename.lastIndexOf('.')).toLowerCase() : ''
  if (!acte.file_path || !IMAGE_EXTS.has(ext)) {
    return (
      <div className="w-10 h-12 rounded bg-navy-700 border border-navy-600 flex items-center justify-center flex-shrink-0">
        <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" className="w-5 h-5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      </div>
    )
  }
  return (
    <div className="w-10 h-12 rounded overflow-hidden flex-shrink-0 bg-navy-700">
      <img src={fileUrl(acte.file_path)} alt="" className="w-full h-full object-cover" />
    </div>
  )
}

// ─── Folder browser modal ─────────────────────────────────────────────────────

function FileThumbnail({ fullPath }: { fullPath: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => { getThumbnail(fullPath, 80).then(setUrl).catch(() => {}) }, [fullPath])
  if (!url) return <div className="w-8 h-8 rounded bg-navy-700 flex-shrink-0 animate-pulse" />
  return <img src={url} className="w-8 h-8 rounded object-cover flex-shrink-0" alt="" />
}

function fmtSize(n: number) {
  if (n < 1024) return `${n} o`
  if (n < 1048576) return `${(n / 1024).toFixed(0)} Ko`
  return `${(n / 1048576).toFixed(1)} Mo`
}

function FolderBrowserModal({ archiveId, existingPaths, onClose, onAdded }: {
  archiveId: string
  existingPaths: Set<string>
  onClose: () => void
  onAdded: () => void
}) {
  const [path, setPath] = useState('')
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [folderFiles, setFolderFiles] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [loadingAll, setLoadingAll] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null)
  const [imagesOnly, setImagesOnly] = useState(true)

  const isImportable = (name: string) => IMPORTABLE_EXTS.has(name.slice(name.lastIndexOf('.')).toLowerCase())
  const isImg = (name: string) => IMAGE_EXTS.has(name.slice(name.lastIndexOf('.')).toLowerCase())

  const load = async (p: string) => {
    setLoading(true)
    try { const data = await browseArchive(archiveId, p); setEntries(data); setPath(p) }
    finally { setLoading(false) }
  }

  useEffect(() => { load('') }, [archiveId])

  const parts = path ? path.split('/').filter(Boolean) : []
  const filterFile = (name: string) => !imagesOnly || isImportable(name)

  const toggleSel = (e: FileEntry) => {
    if (!filterFile(e.name)) return
    setSelected(s => { const n = new Set(s); n.has(e.path) ? n.delete(e.path) : n.add(e.path); return n })
  }

  const toggleFolder = async (entry: FileEntry) => {
    const allFiles = await browseArchiveAll(archiveId, entry.path) as FileEntry[]
    const prefix = entry.path + '/'
    const alreadySelected = Array.from(folderFiles.keys()).some(p => p.startsWith(prefix))
    setFolderFiles(prev => {
      const updated = new Map(prev)
      if (alreadySelected) {
        for (const k of [...updated.keys()]) { if (k.startsWith(prefix)) updated.delete(k) }
      } else {
        allFiles.filter(f => filterFile(f.name)).forEach(f => updated.set(f.path, f.full_path))
      }
      return updated
    })
  }

  const isFolderSelected = (entry: FileEntry) =>
    Array.from(folderFiles.keys()).some(p => p.startsWith(entry.path + '/'))

  const selectAllFromCurrent = async () => {
    setLoadingAll(true)
    try {
      const allFiles = await browseArchiveAll(archiveId, path) as FileEntry[]
      const filtered = allFiles.filter(f => filterFile(f.name))
      setFolderFiles(prev => {
        const updated = new Map(prev)
        const prefix = path ? path + '/' : ''
        for (const k of [...updated.keys()]) { if (!prefix || k.startsWith(prefix)) updated.delete(k) }
        filtered.forEach(f => updated.set(f.path, f.full_path))
        return updated
      })
      setSelected(new Set())
    } finally { setLoadingAll(false) }
  }

  const visibleFiles = entries.filter(e => !e.is_dir && filterFile(e.name))
  const allVisibleSelected = visibleFiles.length > 0 && visibleFiles.every(e => selected.has(e.path))

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelected(s => { const n = new Set(s); visibleFiles.forEach(e => n.delete(e.path)); return n })
    } else {
      setSelected(s => { const n = new Set(s); visibleFiles.forEach(e => n.add(e.path)); return n })
    }
  }

  const totalCount = selected.size + folderFiles.size

  const handleAdd = async () => {
    setImporting(true)
    const directFiles = entries.filter(e => !e.is_dir && selected.has(e.path))
    const folderEntries = [...folderFiles.entries()].filter(([rel]) => !directFiles.find(e => e.path === rel))
    const total = directFiles.length + folderEntries.length
    setImportProgress({ done: 0, total })
    let done = 0
    for (const e of directFiles) {
      await createActe(archiveId, { file_path: e.full_path, filename: e.name })
      setImportProgress({ done: ++done, total })
    }
    for (const [, fullPath] of folderEntries) {
      const filename = fullPath.split(/[\\/]/).pop() || fullPath
      await createActe(archiveId, { file_path: fullPath, filename })
      setImportProgress({ done: ++done, total })
    }
    setImporting(false)
    setImportProgress(null)
    onAdded()
    onClose()
  }

  const visibleEntries = entries.filter(e => e.is_dir || filterFile(e.name))

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-navy-900 rounded-2xl shadow-2xl border border-navy-700 w-[600px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-navy-800">
          <div>
            <h3 className="font-semibold text-white">Importer des actes</h3>
            <nav className="flex items-center gap-1 text-xs text-slate-500 mt-1">
              <button onClick={() => load('')} className="hover:text-white">Racine</button>
              {parts.map((p, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span>/</span>
                  <button onClick={() => load(parts.slice(0, i + 1).join('/'))} className="hover:text-white">{p}</button>
                </span>
              ))}
            </nav>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-navy-800 bg-navy-800/30">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={imagesOnly} onChange={e => setImagesOnly(e.target.checked)} className="accent-amber-500 w-3.5 h-3.5" />
            <span className="text-xs text-slate-400">Images & PDF seulement</span>
          </label>
          <div className="flex-1" />
          {visibleFiles.length > 0 && (
            <button onClick={toggleSelectAllVisible} className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
              {allVisibleSelected ? 'Tout désélectionner' : 'Tout sélectionner ici'}
            </button>
          )}
          <button
            onClick={selectAllFromCurrent}
            disabled={loadingAll}
            className="flex items-center gap-1.5 text-xs bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
          >
            {loadingAll ? 'Chargement…' : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Tout ce dossier
              </>
            )}
          </button>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">Chargement…</div>
          ) : (
            <>
              {path && (
                <button onClick={() => load(parts.slice(0, -1).join('/'))} className="flex items-center gap-3 px-4 py-3 w-full hover:bg-navy-800 text-sm text-slate-400 border-b border-navy-800">
                  <span>↩</span> Dossier parent
                </button>
              )}
              {visibleEntries.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-sm">
                  {imagesOnly ? 'Aucune image dans ce dossier' : 'Dossier vide'}
                </div>
              )}
              {visibleEntries.map(e => {
                const alreadyAdded = !e.is_dir && existingPaths.has(e.full_path)
                const isChecked = e.is_dir ? isFolderSelected(e) : selected.has(e.path)
                return (
                  <div key={e.path}
                    className={`flex items-center gap-3 px-4 py-2.5 border-b border-navy-800/50 last:border-0 transition-colors ${alreadyAdded ? 'opacity-50' : 'hover:bg-navy-800'} ${isChecked ? 'bg-amber-500/10' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => e.is_dir ? toggleFolder(e) : toggleSel(e)}
                      disabled={alreadyAdded}
                      className="w-4 h-4 rounded accent-amber-500 flex-shrink-0 disabled:cursor-not-allowed"
                    />
                    <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => e.is_dir && load(e.path)}>
                      {e.is_dir
                        ? <span className="text-base flex-shrink-0">📁</span>
                        : isImg(e.name)
                          ? <FileThumbnail fullPath={e.full_path} />
                          : <span className="text-base flex-shrink-0">📄</span>
                      }
                      <span className={`text-sm flex-1 truncate ${e.is_dir ? 'font-medium text-white' : 'text-slate-300'}`}>{e.name}</span>
                      {alreadyAdded
                        ? <span className="text-[10px] text-amber-500 flex-shrink-0 font-medium">✓ Déjà importé</span>
                        : e.is_dir
                          ? <span className="text-xs text-amber-400/60 flex-shrink-0">Tout sélectionner →</span>
                          : <span className="text-xs text-slate-500 flex-shrink-0">{fmtSize(e.size)}</span>
                      }
                    </button>
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-navy-800 flex items-center justify-between">
          {importing && importProgress ? (
            <div className="flex-1 mr-4">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Import en cours…</span>
                <span>{importProgress.done}/{importProgress.total}</span>
              </div>
              <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 transition-all" style={{ width: `${(importProgress.done / importProgress.total) * 100}%` }} />
              </div>
            </div>
          ) : (
            <span className="text-sm text-slate-400">{totalCount} fichier{totalCount !== 1 ? 's' : ''} sélectionné{totalCount !== 1 ? 's' : ''}</span>
          )}
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-navy-700 text-sm text-slate-400 hover:text-white hover:border-navy-600 transition-colors">Annuler</button>
            <button onClick={handleAdd} disabled={totalCount === 0 || importing}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white text-sm font-medium transition-colors">
              {importing ? 'Import…' : `Importer${totalCount > 0 ? ` (${totalCount})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ActesPage() {
  const { archiveId } = useParams<{ archiveId: string }>()
  const navigate = useNavigate()
  const [actes, setActes] = useState<Acte[]>([])
  const [registres, setRegistres] = useState<Registre[]>([])
  const [stats, setStats] = useState<any>(null)
  const [filterType, setFilterType] = useState('')
  const [filterRegistre, setFilterRegistre] = useState('')
  const [q, setQ] = useState('')
  const [showBrowser, setShowBrowser] = useState(false)
  const [existingPaths, setExistingPaths] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid')

  const load = () => {
    if (!archiveId) return
    const filters: any = {}
    if (filterType) filters.type_acte = filterType
    if (filterRegistre === '_none') filters.no_registre = true
    else if (filterRegistre) filters.registre_id = filterRegistre
    if (q) filters.q = q
    Promise.all([
      getActes(archiveId, filters),
      getRegistres(archiveId),
      getActeStats(archiveId),
      getActes(archiveId, {}),
    ]).then(([a, r, st, all]: [Acte[], Registre[], any, Acte[]]) => {
      setActes(a); setRegistres(r); setStats(st)
      setExistingPaths(new Set(all.map((a: Acte) => a.file_path).filter(Boolean)))
    })
  }
  useEffect(() => { load() }, [archiveId, filterType, filterRegistre, q])

  const handleBrowserOpen = () => {
    // Refresh existing paths before opening
    if (archiveId) getActes(archiveId, {}).then((all: Acte[]) => {
      setExistingPaths(new Set(all.map(a => a.file_path).filter(Boolean)))
      setShowBrowser(true)
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-5 border-b border-navy-800">
        <div>
          <h1 className="text-lg font-bold text-white">Actes</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {stats ? `${stats.total} acte${stats.total !== 1 ? 's' : ''}` : 'Chargement…'}
          </p>
        </div>
        <div className="flex-1" />
        {/* Vue toggle */}
        <div className="flex items-center gap-0.5 bg-navy-800 rounded-xl p-1 border border-navy-700 mr-2">
          <button onClick={() => setViewMode('list')} title="Vue liste"
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
          <button onClick={() => setViewMode('grid')} title="Vue grille"
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          </button>
        </div>
        <button
          onClick={handleBrowserOpen}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Importer des actes
        </button>
      </div>

      {/* Type pills */}
      {stats?.byType?.length > 0 && (
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-navy-800 bg-navy-800/20 flex-wrap">
          {stats.byType.map((t: any) => (
            <button key={t.type_acte} onClick={() => setFilterType(f => f === t.type_acte ? '' : t.type_acte)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1.5 ${filterType === t.type_acte ? 'ring-1 ring-amber-400' : ''} ${TYPE_ACTE_COLORS[t.type_acte] || TYPE_ACTE_COLORS.autre}`}>
              {TYPE_ACTE_LABELS[t.type_acte] || t.type_acte}
              <span className="opacity-70 font-mono">{t.n}</span>
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 px-5 py-2.5 border-b border-navy-800 flex-wrap">
        <input type="text" placeholder="Nom, prénom, lieu, fichier…" value={q} onChange={e => setQ(e.target.value)}
          className="bg-navy-800 border border-navy-700 rounded-xl px-3 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 w-52" />
        {registres.length > 0 && (
          <select value={filterRegistre} onChange={e => setFilterRegistre(e.target.value)} className="bg-navy-800 border border-navy-700 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500">
            <option value="">Tous les registres</option>
            <option value="_none">Sans registre</option>
            {registres.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
          </select>
        )}
        {(filterType || filterRegistre || q) && (
          <button onClick={() => { setFilterType(''); setFilterRegistre(''); setQ('') }}
            className="text-xs text-slate-500 hover:text-white px-2 py-1.5 rounded-lg hover:bg-navy-700 transition-colors">
            Réinitialiser
          </button>
        )}
        <span className="text-xs text-slate-500 ml-auto">{actes.length} résultat{actes.length !== 1 ? 's' : ''}</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-5">
        {actes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" className="w-8 h-8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>
            </div>
            <p className="text-slate-400 text-sm">{stats?.total === 0 ? 'Aucun acte importé' : 'Aucun résultat pour ces filtres'}</p>
            {stats?.total === 0 && (
              <button onClick={handleBrowserOpen} className="mt-3 text-amber-400 hover:text-amber-300 text-sm">
                Importer des actes →
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-3 gap-3">
            {actes.map(a => {
              const ext = a.filename ? a.filename.slice(a.filename.lastIndexOf('.')).toLowerCase() : ''
              const isImage = !!(a.file_path && IMAGE_EXTS.has(ext))
              return (
                <div key={a.id}
                  className="bg-navy-800 rounded-xl border border-navy-700 hover:border-amber-600/50 cursor-pointer transition-all group overflow-hidden"
                  onClick={() => navigate(`/arch/${archiveId}/actes/${a.id}`)}>
                  {/* Thumbnail portrait */}
                  <div className="aspect-[3/4] bg-navy-900 relative overflow-hidden">
                    {isImage
                      ? <img src={fileUrl(a.file_path)} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <svg viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1" className="w-14 h-14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>
                        </div>
                    }
                    {/* Type badge */}
                    <div className="absolute top-2 left-2">
                      <TypeBadge type={a.type_acte} />
                    </div>
                    {/* Registre overlay */}
                    {a.registre_nom && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 pt-6 pb-1.5">
                        <span className="text-[10px] text-amber-300 truncate block">{a.registre_nom}</span>
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="px-3 py-2.5">
                    <p className="text-sm font-medium text-white truncate leading-snug">
                      {a.principals || <span className="text-slate-500 italic font-normal">{a.filename || 'Sans nom'}</span>}
                    </p>
                    {(a.date_acte || a.lieu_nom) && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {a.date_precision !== 'exacte' && a.date_acte ? `${a.date_precision} ` : ''}{a.date_acte}{a.date_acte && a.lieu_nom ? ' · ' : ''}{a.lieu_nom}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {actes.map(a => (
              <div key={a.id}
                className="bg-navy-800 rounded-xl border border-navy-700 hover:border-amber-700/40 px-4 py-3 cursor-pointer transition-colors group flex items-center gap-3"
                onClick={() => navigate(`/arch/${archiveId}/actes/${a.id}`)}>
                <ActeThumb acte={a} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <TypeBadge type={a.type_acte} />
                    {a.date_acte && (
                      <span className="text-xs text-slate-400">
                        {a.date_precision !== 'exacte' ? `${a.date_precision} ` : ''}{a.date_acte}
                      </span>
                    )}
                    {a.lieu_nom && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 flex-shrink-0"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
                        {a.lieu_nom}
                      </span>
                    )}
                    {a.registre_nom && (
                      <span className="text-xs text-amber-500/70 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5">
                        {a.registre_nom}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5">
                    {a.principals
                      ? <span className="text-sm font-medium text-white">{a.principals}</span>
                      : <span className="text-sm text-slate-500 italic truncate block">{a.filename || 'Sans nom'}</span>}
                  </div>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-slate-600 group-hover:text-slate-400 flex-shrink-0 transition-colors"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            ))}
          </div>
        )}
      </div>

      {showBrowser && archiveId && (
        <FolderBrowserModal
          archiveId={archiveId}
          existingPaths={existingPaths}
          onClose={() => setShowBrowser(false)}
          onAdded={load}
        />
      )}
    </div>
  )
}
