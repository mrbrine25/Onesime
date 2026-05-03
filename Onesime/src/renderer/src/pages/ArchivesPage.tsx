import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getArchives, createArchive, deleteArchive, selectFolder, exportArchive, importArchive } from '../api/client'
import type { Archive } from '../types'

// ─── Result modal ─────────────────────────────────────────────────────────────

function ResultModal({ title, message, counts, onClose }: {
  title: string; message: string; counts?: Record<string, number>; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-navy-900 rounded-2xl shadow-2xl border border-navy-700 w-[400px] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" className="w-5 h-5">
              <path d="M20 7 9 18l-5-5"/>
            </svg>
          </div>
          <h3 className="font-semibold text-white">{title}</h3>
        </div>
        <p className="text-sm text-slate-400 mb-4">{message}</p>
        {counts && (
          <div className="bg-navy-800 rounded-xl p-3 grid grid-cols-2 gap-2 mb-4">
            {Object.entries(counts).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-slate-500 capitalize">{k}</span>
                <span className="text-white font-semibold">{v}</span>
              </div>
            ))}
          </div>
        )}
        <button onClick={onClose} className="w-full bg-navy-700 hover:bg-navy-600 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">
          Fermer
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ArchivesPage() {
  const [archives, setArchives] = useState<Archive[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', root_path: '', description: '' })
  const [working, setWorking] = useState<string | null>(null)
  const [result, setResult] = useState<{ title: string; message: string; counts?: Record<string, number> } | null>(null)
  const navigate = useNavigate()

  const load = () => getArchives().then(setArchives)
  useEffect(() => { load() }, [])

  const handlePickFolder = async () => {
    const folder = await selectFolder()
    if (folder) setForm(f => ({ ...f, root_path: folder }))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await createArchive(form)
    setShowModal(false)
    setForm({ name: '', root_path: '', description: '' })
    load()
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer l'archive "${name}" ? Cette action est irréversible.`)) return
    await deleteArchive(id)
    load()
  }

  const handleExport = async (archiveId: string, archiveName: string) => {
    setWorking(archiveId)
    try {
      const res = await exportArchive(archiveId)
      if (res.ok) {
        setResult({
          title: 'Export réussi',
          message: `Les données de "${archiveName}" ont été exportées. Copiez ce fichier sur l'autre PC et importez-le dans une archive pointant vers le même dossier.`,
          counts: res.counts,
        })
      }
    } catch (e) {
      alert('Erreur lors de l\'export : ' + String(e))
    } finally {
      setWorking(null)
    }
  }

  const handleImport = async (archiveId: string, archiveName: string) => {
    setWorking(archiveId)
    try {
      const res = await importArchive(archiveId)
      if (res.ok) {
        setResult({
          title: 'Import réussi',
          message: `Les données ont été importées dans "${archiveName}". Assurez-vous que le dossier racine pointe vers le même dossier source que sur l'autre PC.`,
          counts: res.counts,
        })
      }
    } catch (e) {
      alert('Erreur lors de l\'import : ' + String(e))
    } finally {
      setWorking(null)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Archives</h1>
          <p className="text-sm text-slate-400 mt-0.5">Chaque archive pointe vers un dossier sur votre disque</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nouvelle archive
        </button>
      </div>

      {archives.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-16 h-16 rounded-2xl bg-navy-600 flex items-center justify-center mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.5" className="w-8 h-8">
              <rect x="2" y="4" width="20" height="5" rx="1" /><path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" /><path d="M10 13h4" />
            </svg>
          </div>
          <p className="text-white font-medium text-lg">Aucune archive</p>
          <p className="text-slate-400 text-sm mt-1 max-w-sm">Créez une archive pointant vers un dossier existant sur votre disque</p>
          <button onClick={() => setShowModal(true)} className="mt-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-6 py-3 text-sm font-semibold transition-colors">
            Créer ma première archive
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {archives.map(a => (
            <div key={a.id} className="group bg-navy-600 rounded-2xl border border-navy-500 hover:border-navy-400 p-5 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.8" className="w-5 h-5">
                    <rect x="2" y="4" width="20" height="5" rx="1" /><path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" /><path d="M10 13h4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{a.name}</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">{a.root_path}</p>
                  {a.description && <p className="text-sm text-slate-400 mt-2">{a.description}</p>}
                </div>
                <button
                  onClick={() => handleDelete(a.id, a.name)}
                  className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all flex-shrink-0"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4">
                {[
                  { label: 'Explorateur', path: 'browser', color: 'text-blue-400' },
                  { label: 'Fiches',      path: 'fiches',  color: 'text-violet-400' },
                  { label: 'Albums',      path: 'albums',  color: 'text-amber-400' },
                ].map(btn => (
                  <button
                    key={btn.path}
                    onClick={() => navigate(`/archives/${a.id}/${btn.path}`)}
                    className={`py-2 rounded-xl bg-navy-700 hover:bg-navy-500 text-xs font-medium transition-colors ${btn.color}`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {/* Export / Import */}
              <div className="flex gap-2 mt-2 pt-2 border-t border-navy-700">
                <button
                  onClick={() => handleExport(a.id, a.name)}
                  disabled={working === a.id}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-navy-700 hover:bg-navy-500 text-xs font-medium text-slate-300 hover:text-white transition-colors disabled:opacity-50"
                  title="Exporter les données vers un fichier .onesime"
                >
                  {working === a.id ? (
                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  )}
                  Exporter
                </button>
                <button
                  onClick={() => handleImport(a.id, a.name)}
                  disabled={working === a.id}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-navy-700 hover:bg-navy-500 text-xs font-medium text-slate-300 hover:text-white transition-colors disabled:opacity-50"
                  title="Importer des données depuis un fichier .onesime"
                >
                  {working === a.id ? (
                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 5 17 10" />
                      <line x1="12" y1="5" x2="12" y2="15" />
                    </svg>
                  )}
                  Importer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info box about export/import */}
      {archives.length > 0 && (
        <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.8" className="w-5 h-5 flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div className="text-xs text-slate-400">
            <p className="text-blue-300 font-medium mb-1">Utiliser sur un autre PC</p>
            <p>Sur ce PC : <strong className="text-white">Exporter</strong> → enregistre un fichier <code className="text-amber-300">.onesime</code> contenant toutes vos fiches, vignettes, albums et tags.</p>
            <p className="mt-1">Sur l'autre PC : créez une archive pointant vers <strong className="text-white">le même dossier source</strong>, puis <strong className="text-white">Importer</strong> → sélectionnez le fichier.</p>
          </div>
        </div>
      )}

      {/* New archive modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="bg-navy-900 rounded-2xl shadow-2xl border border-navy-700 w-[480px]">
            <div className="flex items-center justify-between p-5 border-b border-navy-800">
              <h3 className="font-semibold text-white">Nouvelle archive</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Nom *</label>
                <input
                  required autoFocus
                  className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Famille Dupont — XIXe siècle"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Dossier racine *</label>
                <div className="flex gap-2">
                  <input
                    required
                    className="flex-1 bg-navy-800 border border-navy-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    value={form.root_path}
                    onChange={e => setForm(f => ({ ...f, root_path: e.target.value }))}
                    placeholder="C:\Documents\Archives"
                  />
                  <button
                    type="button"
                    onClick={handlePickFolder}
                    className="px-3 py-2 bg-navy-700 hover:bg-navy-600 rounded-xl text-slate-300 hover:text-white transition-colors text-sm"
                  >
                    Choisir
                  </button>
                </div>
                <p className="text-xs text-slate-600 mt-1.5">Aucun fichier ne sera copié — Onésime lit depuis ce dossier</p>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Description</label>
                <textarea
                  className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
                  rows={2}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-navy-700 text-sm text-slate-400 hover:text-white transition-colors">Annuler</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {result && (
        <ResultModal
          title={result.title}
          message={result.message}
          counts={result.counts}
          onClose={() => { setResult(null); load() }}
        />
      )}
    </div>
  )
}
