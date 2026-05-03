import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDocuments, getFiches, fileUrl } from '../api/client'
import type { Document, Fiche } from '../types'

type TimelineItem =
  | { kind: 'document'; item: Document; year: number | null }
  | { kind: 'fiche';    item: Fiche;    year: number | null }

type FilterType = 'all' | 'document' | 'fiche'

function extractYear(date: string): number | null {
  if (!date) return null
  const m = date.match(/\b(1[0-9]{3}|20[0-9]{2})\b/)
  return m ? parseInt(m[1]) : null
}

function groupByYear(items: TimelineItem[]): Map<number | null, TimelineItem[]> {
  const map = new Map<number | null, TimelineItem[]>()
  for (const item of items) {
    const key = item.year
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return map
}

function DocCard({ doc, archiveId }: { doc: Document; archiveId: string }) {
  const navigate = useNavigate()
  const isImage = doc.mime_type.startsWith('image/')
  return (
    <div
      className="flex items-start gap-3 bg-navy-800 hover:bg-navy-700 rounded-xl p-3 cursor-pointer transition-colors border border-navy-700 hover:border-navy-600"
      onClick={() => navigate(`/archives/${archiveId}/documents/${doc.id}`)}
    >
      <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-navy-900">
        {isImage ? (
          <img src={fileUrl(doc.file_path)} alt={doc.title || doc.filename} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-slate-500 text-[10px] font-bold uppercase">{doc.filename.split('.').pop()}</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{doc.title || doc.filename}</p>
        {doc.date && <p className="text-xs text-slate-400 mt-0.5">{doc.date}</p>}
        {doc.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{doc.description}</p>}
      </div>
      <span className="text-[10px] text-blue-400 flex-shrink-0 bg-blue-500/10 rounded-full px-2 py-0.5">doc</span>
    </div>
  )
}

function FicheCard({ fiche, archiveId }: { fiche: Fiche; archiveId: string }) {
  const navigate = useNavigate()
  return (
    <div
      className="flex items-start gap-3 bg-navy-800 hover:bg-navy-700 rounded-xl p-3 cursor-pointer transition-colors border border-navy-700 hover:border-navy-600"
      onClick={() => navigate(`/archives/${archiveId}/fiches/${fiche.id}`)}
    >
      <div className="w-14 h-14 rounded-lg flex-shrink-0 bg-navy-900 flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" className="w-7 h-7">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{fiche.title}</p>
        {fiche.date && <p className="text-xs text-slate-400 mt-0.5">{fiche.date}</p>}
        {fiche.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{fiche.description}</p>}
      </div>
      <span className="text-[10px] text-purple-400 flex-shrink-0 bg-purple-500/10 rounded-full px-2 py-0.5">fiche</span>
    </div>
  )
}

export default function TimelinePage() {
  const { archiveId } = useParams<{ archiveId: string }>()
  const [docs, setDocs]         = useState<Document[]>([])
  const [fiches, setFiches]     = useState<Fiche[]>([])
  const [filter, setFilter]     = useState<FilterType>('all')
  const [searchQ, setSearchQ]   = useState('')

  useEffect(() => {
    if (!archiveId) return
    getDocuments(archiveId).then(d => setDocs(d as Document[]))
    getFiches(archiveId).then(f => setFiches(f as Fiche[]))
  }, [archiveId])

  const allItems: TimelineItem[] = [
    ...(filter !== 'fiche' ? docs.map(d => ({ kind: 'document' as const, item: d, year: extractYear(d.date) })) : []),
    ...(filter !== 'document' ? fiches.map(f => ({ kind: 'fiche' as const, item: f, year: extractYear(f.date) })) : []),
  ].filter(item => {
    if (!searchQ) return true
    const label = item.kind === 'document'
      ? (item.item.title || (item.item as Document).filename)
      : (item.item as Fiche).title
    return label.toLowerCase().includes(searchQ.toLowerCase())
  })

  const dated   = allItems.filter(i => i.year !== null)
  const undated = allItems.filter(i => i.year === null)

  // Sort dated items by year ascending
  dated.sort((a, b) => a.year! - b.year!)

  const grouped = groupByYear(dated)
  const years = Array.from(grouped.keys()).sort((a, b) => a! - b!) as number[]

  const totalCount = allItems.length

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 p-5 border-b border-navy-800">
        <h1 className="text-lg font-bold text-white mr-2">Frise chronologique</h1>
        <div className="flex-1 relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher…"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            className="w-full bg-navy-800 border border-navy-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex bg-navy-800 rounded-xl p-0.5 flex-shrink-0">
          {(['all', 'document', 'fiche'] as FilterType[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-navy-600 text-white' : 'text-slate-500 hover:text-white'}`}
            >
              {f === 'all' ? 'Tout' : f === 'document' ? 'Documents' : 'Fiches'}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-6">
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-navy-600 flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="#4f7ef8" strokeWidth="1.5" className="w-8 h-8">
                <line x1="12" y1="2" x2="12" y2="22" />
                <circle cx="12" cy="8" r="2.5" fill="#4f7ef8" stroke="none" />
                <circle cx="12" cy="16" r="2.5" fill="#4f7ef8" stroke="none" />
              </svg>
            </div>
            <p className="text-slate-400 text-sm">{searchQ ? 'Aucun résultat' : 'Aucun élément avec une date'}</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {/* Dated items */}
            {years.map((year, yi) => {
              const items = grouped.get(year)!
              const isLeft = yi % 2 === 0
              return (
                <div key={year} className="flex gap-0 mb-8">
                  {/* Left column */}
                  <div className={`flex-1 ${isLeft ? '' : 'flex flex-col gap-2'}`}>
                    {isLeft && (
                      <div className="flex flex-col gap-2">
                        {items.map(ti =>
                          ti.kind === 'document'
                            ? <DocCard key={ti.item.id} doc={ti.item as Document} archiveId={archiveId!} />
                            : <FicheCard key={ti.item.id} fiche={ti.item as Fiche} archiveId={archiveId!} />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Center: year marker */}
                  <div className="flex flex-col items-center px-4 flex-shrink-0" style={{ width: 80 }}>
                    <div className="w-px flex-1 bg-navy-600" style={{ minHeight: 20 }} />
                    <div className="w-12 h-7 rounded-full bg-navy-700 border border-navy-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-[11px] font-bold text-slate-300">{year}</span>
                    </div>
                    <div className="w-px flex-1 bg-navy-600" />
                  </div>

                  {/* Right column */}
                  <div className="flex-1">
                    {!isLeft && (
                      <div className="flex flex-col gap-2">
                        {items.map(ti =>
                          ti.kind === 'document'
                            ? <DocCard key={ti.item.id} doc={ti.item as Document} archiveId={archiveId!} />
                            : <FicheCard key={ti.item.id} fiche={ti.item as Fiche} archiveId={archiveId!} />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Undated section */}
            {undated.length > 0 && (
              <div className="mt-10 pt-6 border-t border-navy-700">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-4 text-center">Date inconnue ({undated.length})</p>
                <div className="grid grid-cols-1 gap-2">
                  {undated.map(ti =>
                    ti.kind === 'document'
                      ? <DocCard key={ti.item.id} doc={ti.item as Document} archiveId={archiveId!} />
                      : <FicheCard key={ti.item.id} fiche={ti.item as Fiche} archiveId={archiveId!} />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-5 py-2 border-t border-navy-800 text-xs text-slate-500">
        {totalCount} élément{totalCount !== 1 ? 's' : ''}
        {undated.length > 0 && ` · ${undated.length} sans date`}
      </div>
    </div>
  )
}
