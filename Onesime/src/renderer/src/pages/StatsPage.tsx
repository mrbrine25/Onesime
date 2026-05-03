import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getArchiveStats, getArchiveNotes, setArchiveNotes,
  getArchiveDuplicates, backupArchive, deleteDocument,
} from '../api/client'

interface Stats {
  docCount: number; ficheCount: number; personCount: number
  zoneCount: number; faceCount: number; albumCount: number
  transcribedCount: number; withLocation: number; withDate: number
  byMime: { mime_type: string; n: number }[]
  recentDocs: { name: string; updated_at: string }[]
}

interface DupDoc { id: string; filename: string; file_path: string }

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  return (
    <div className="bg-navy-800 rounded-2xl p-4 border border-navy-700">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value.toLocaleString('fr')}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

function mimeLabel(mime: string): string {
  if (mime.startsWith('image/')) return 'Image'
  if (mime === 'application/pdf') return 'PDF'
  if (mime.startsWith('video/')) return 'Vidéo'
  if (mime.startsWith('audio/')) return 'Audio'
  if (mime.includes('word') || mime.includes('document')) return 'Word'
  if (!mime) return 'Inconnu'
  return mime.split('/')[1]?.toUpperCase() || mime
}

export default function StatsPage() {
  const { archiveId } = useParams<{ archiveId: string }>()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [notes, setNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)
  const [dups, setDups] = useState<DupDoc[][]>([])
  const [dupsOpen, setDupsOpen] = useState(false)
  const [backing, setBacking] = useState(false)
  const [backupMsg, setBackupMsg] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = async () => {
    if (!archiveId) return
    const [s, n, d] = await Promise.all([
      getArchiveStats(archiveId),
      getArchiveNotes(archiveId),
      getArchiveDuplicates(archiveId),
    ])
    setStats(s as Stats)
    setNotes(n as string)
    setDups(d as DupDoc[][])
  }

  useEffect(() => { load() }, [archiveId])

  const handleNotesChange = (val: string) => {
    setNotes(val)
    setNotesSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await setArchiveNotes(archiveId!, val)
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    }, 800)
  }

  const handleBackup = async () => {
    setBacking(true)
    setBackupMsg(null)
    try {
      const res = await backupArchive() as { ok: boolean; path?: string; count?: number }
      if (res.ok) setBackupMsg(`Sauvegarde créée : ${res.path}`)
      else setBackupMsg('Erreur lors de la sauvegarde')
    } finally {
      setBacking(false)
    }
  }

  const handleDeleteDup = async (docId: string) => {
    if (!confirm('Supprimer ce document ? Cette action est irréversible.')) return
    await deleteDocument(docId)
    load()
  }

  if (!stats) return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Chargement…</div>

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Statistiques & Notes</h1>
          <p className="text-sm text-slate-400 mt-0.5">Vue d'ensemble de cette archive</p>
        </div>
        <button
          onClick={handleBackup}
          disabled={backing}
          className="flex items-center gap-2 bg-navy-700 hover:bg-navy-600 border border-navy-600 text-slate-300 hover:text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {backing ? (
            <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          )}
          Sauvegarder la base
        </button>
      </div>

      {backupMsg && (
        <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-sm text-green-300">
          {backupMsg}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Documents" value={stats.docCount} color="text-blue-400" />
        <StatCard label="Fiches" value={stats.ficheCount} color="text-violet-400" />
        <StatCard label="Personnes" value={stats.personCount} color="text-emerald-400" />
        <StatCard label="Vignettes" value={stats.zoneCount} color="text-amber-400" />
        <StatCard label="Visages indexés" value={stats.faceCount} color="text-pink-400" />
        <StatCard label="Albums" value={stats.albumCount} color="text-cyan-400" />
        <StatCard label="Transcrits" value={stats.transcribedCount} sub={`sur ${stats.docCount}`} color="text-slate-300" />
        <StatCard label="Avec lieu" value={stats.withLocation} sub={`sur ${stats.docCount}`} color="text-slate-300" />
        <StatCard label="Avec date" value={stats.withDate} sub={`sur ${stats.docCount}`} color="text-slate-300" />
      </div>

      {/* Types de fichiers */}
      {stats.byMime.length > 0 && (
        <div className="bg-navy-800 rounded-2xl p-5 border border-navy-700 mb-6">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Types de fichiers</h2>
          <div className="flex flex-col gap-2">
            {stats.byMime.map(m => {
              const pct = stats.docCount > 0 ? Math.round(m.n / stats.docCount * 100) : 0
              return (
                <div key={m.mime_type} className="flex items-center gap-3">
                  <span className="text-sm text-slate-300 w-20 flex-shrink-0">{mimeLabel(m.mime_type)}</span>
                  <div className="flex-1 bg-navy-700 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-slate-500 w-16 text-right flex-shrink-0">{m.n} ({pct}%)</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Doublons */}
      <div className="bg-navy-800 rounded-2xl border border-navy-700 mb-6 overflow-hidden">
        <button
          className="w-full flex items-center justify-between p-5 hover:bg-navy-700/50 transition-colors"
          onClick={() => setDupsOpen(o => !o)}
        >
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Doublons potentiels</h2>
            {dups.length > 0 && (
              <span className="bg-amber-500/20 text-amber-300 text-xs font-semibold px-2 py-0.5 rounded-full">
                {dups.length} groupe{dups.length > 1 ? 's' : ''}
              </span>
            )}
            {dups.length === 0 && (
              <span className="bg-green-500/20 text-green-300 text-xs px-2 py-0.5 rounded-full">Aucun</span>
            )}
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-4 h-4 text-slate-500 transition-transform ${dupsOpen ? 'rotate-180' : ''}`}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {dupsOpen && dups.length > 0 && (
          <div className="border-t border-navy-700 divide-y divide-navy-700">
            {dups.map((group, gi) => (
              <div key={gi} className="p-4">
                <p className="text-xs font-semibold text-amber-300 mb-2">{group[0].filename}</p>
                <div className="flex flex-col gap-1.5">
                  {group.map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 bg-navy-700/50 rounded-xl px-3 py-2">
                      <p className="flex-1 text-xs text-slate-400 font-mono truncate">{doc.file_path}</p>
                      <button
                        onClick={() => navigate(`/archives/${archiveId}/documents/${doc.id}`)}
                        className="text-blue-400 hover:text-blue-300 text-xs flex-shrink-0"
                      >Ouvrir</button>
                      <button
                        onClick={() => handleDeleteDup(doc.id)}
                        className="text-red-500 hover:text-red-400 text-xs flex-shrink-0"
                      >Supprimer</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {dupsOpen && dups.length === 0 && (
          <div className="border-t border-navy-700 py-8 text-center text-slate-500 text-sm">
            Aucun doublon détecté
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="bg-navy-800 rounded-2xl p-5 border border-navy-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Notes d'archive</h2>
          {notesSaved && <span className="text-xs text-green-400">Enregistré ✓</span>}
        </div>
        <textarea
          value={notes}
          onChange={e => handleNotesChange(e.target.value)}
          rows={8}
          placeholder="Notes générales sur cette archive : sources, avertissements, pistes de recherche…"
          className="w-full bg-navy-700 border border-navy-600 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
        />
        <p className="text-xs text-slate-600 mt-2">Sauvegarde automatique à chaque modification</p>
      </div>

      {/* Recent docs */}
      {stats.recentDocs.length > 0 && (
        <div className="mt-6 bg-navy-800 rounded-2xl p-5 border border-navy-700">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Documents récemment modifiés</h2>
          <div className="flex flex-col gap-2">
            {stats.recentDocs.map((d, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-slate-300 truncate">{d.name}</span>
                <span className="text-xs text-slate-600 flex-shrink-0 ml-4">{new Date(d.updated_at).toLocaleDateString('fr')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
