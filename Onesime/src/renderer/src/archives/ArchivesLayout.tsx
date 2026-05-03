import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { getArchives } from '../api/client'
import type { Archive } from '../types'

function NavBtn({ icon, label, active, onClick, disabled }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button title={label} onClick={onClick} disabled={disabled}
      className={`relative group w-10 h-10 rounded-xl flex items-center justify-center transition-all ${active ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : disabled ? 'text-navy-500 cursor-not-allowed' : 'text-slate-400 hover:bg-navy-600 hover:text-white'}`}
    >
      {icon}
      <span className="absolute left-14 bg-navy-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl border border-navy-700">{label}</span>
    </button>
  )
}

function IconActes() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/><line x1="8" y1="9" x2="10" y2="9"/></svg>
}
function IconRegistres() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>
}
function IconBack() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><polyline points="15 18 9 12 15 6"/></svg>
}

export default function ArchivesLayout() {
  const [archives, setArchives] = useState<Archive[]>([])
  const [currentId, setCurrentId] = useState<string>(() => localStorage.getItem('onesime-archive') || '')
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    getArchives().then((list: Archive[]) => {
      setArchives(list)
      if (list.length > 0 && !list.find((a: Archive) => a.id === currentId)) {
        setCurrentId(list[0].id)
        localStorage.setItem('onesime-archive', list[0].id)
      }
    })
  }, [])

  useEffect(() => {
    const match = location.pathname.match(/\/arch\/([^/]+)/)
    if (match && match[1] !== currentId) {
      setCurrentId(match[1])
      localStorage.setItem('onesime-archive', match[1])
    }
  }, [location.pathname])

  const current = archives.find(a => a.id === currentId) ?? null
  const goTo = (sub: string) => { if (!currentId) return; navigate(`/arch/${currentId}/${sub}`) }
  const isOn = (pattern: string) => location.pathname.includes(pattern)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0f172a' }}>
      {/* Sidebar */}
      <aside className="w-16 flex-shrink-0 flex flex-col items-center py-5 gap-2 border-r border-amber-900/30" style={{ background: '#0c1423' }}>
        {/* Module badge */}
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-4 flex-shrink-0" title="Module Archives">
          <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8" className="w-5 h-5">
            <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21v-6h6v6"/>
          </svg>
        </div>

        <NavBtn icon={<IconActes />}    label="Actes"     active={isOn('/actes')}    onClick={() => goTo('actes')}    disabled={!currentId} />
        <NavBtn icon={<IconRegistres />} label="Registres" active={isOn('/registres')} onClick={() => goTo('registres')} disabled={!currentId} />

        {/* Archive selector */}
        {archives.length > 1 && (
          <div className="mt-2 px-1 w-full">
            <select
              value={currentId}
              onChange={e => { setCurrentId(e.target.value); localStorage.setItem('onesime-archive', e.target.value) }}
              className="w-full bg-navy-800 border border-navy-700 rounded text-[9px] text-slate-400 px-1 py-1 focus:outline-none"
              title="Changer d'archive"
            >
              {archives.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        )}

        <div className="flex-1" />

        {current && (
          <div className="px-1 mb-2 w-full text-center">
            <p className="text-[8px] text-amber-600/80 leading-tight truncate px-1">{current.name}</p>
          </div>
        )}

        {/* Back to Onésime */}
        <button
          title="Retour à Onésime"
          onClick={() => navigate('/')}
          className="relative group w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-navy-700 hover:text-white transition-all"
        >
          <IconBack />
          <span className="absolute left-14 bg-navy-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl border border-navy-700">Retour à Onésime</span>
        </button>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-hidden bg-navy-900">
        <Outlet />
      </main>
    </div>
  )
}
