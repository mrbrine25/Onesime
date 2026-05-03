import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { search } from '../api/client'
import type { SearchResult } from '../types'

function IconFiche() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
}
function IconDoc() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
}
function IconPerson() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
}

const TYPE_CONFIG = {
  fiche:    { label: 'Fiches',    color: 'text-violet-400', bg: 'bg-violet-400/10', Icon: IconFiche },
  document: { label: 'Documents', color: 'text-blue-400',   bg: 'bg-blue-400/10',   Icon: IconDoc },
  person:   { label: 'Personnes', color: 'text-emerald-400', bg: 'bg-emerald-400/10', Icon: IconPerson },
}

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const q = params.get('q') || ''
  const archiveId = params.get('archive_id') || ''
  const [input, setInput] = useState(q)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { setInput(q) }, [q])

  useEffect(() => {
    if (!q) return
    setLoading(true)
    search(q, archiveId || undefined).then(setResults).finally(() => setLoading(false))
  }, [q, archiveId])

  const doSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    setParams({ q: input.trim(), ...(archiveId ? { archive_id: archiveId } : {}) })
  }

  const handleClick = (r: SearchResult) => {
    if (!archiveId) return
    if (r.type === 'fiche') navigate(`/archives/${archiveId}/fiches/${r.id}`)
    else if (r.type === 'document') navigate(`/archives/${archiveId}/documents/${r.id}`)
    else if (r.type === 'person') navigate(`/archives/${archiveId}/persons/${r.id}`)
  }

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    acc[r.type] = acc[r.type] || []
    acc[r.type].push(r)
    return acc
  }, {})

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Recherche</h1>

      <form onSubmit={doSearch} className="relative mb-8">
        <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          autoFocus
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Rechercher fiches, documents, personnes…"
          className="w-full bg-navy-600 border border-navy-500 rounded-2xl pl-12 pr-32 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-1.5 text-sm font-medium transition-colors"
        >
          Rechercher
        </button>
      </form>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && q && results.length === 0 && (
        <div className="text-center py-24">
          <svg viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5" className="w-12 h-12 mx-auto mb-3">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <p className="text-slate-400 font-medium">Aucun résultat pour "{q}"</p>
          <p className="text-slate-500 text-sm mt-1">Essayez avec un autre terme</p>
        </div>
      )}

      {!loading && !q && (
        <div className="text-center py-24">
          <svg viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5" className="w-12 h-12 mx-auto mb-3">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <p className="text-slate-500 text-sm">Entrez un terme pour lancer la recherche</p>
        </div>
      )}

      {Object.entries(grouped).map(([type, items]) => {
        const cfg = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG]
        if (!cfg) return null
        const { Icon } = cfg
        return (
          <div key={type} className="mb-6">
            <h2 className={`text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 ${cfg.color}`}>
              <Icon />
              {cfg.label} ({items.length})
            </h2>
            <div className="bg-navy-600 rounded-2xl border border-navy-500 overflow-hidden">
              {items.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleClick(r)}
                  className="flex items-center gap-4 px-5 py-3.5 w-full text-left hover:bg-navy-500 transition-colors border-b border-navy-700/50 last:border-0"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
                    <Icon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{r.label}</p>
                    {r.extra && <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{r.extra}</p>}
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" className="w-4 h-4 flex-shrink-0">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
