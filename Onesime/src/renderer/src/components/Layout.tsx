import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { getArchives } from '../api/client'
import type { Archive } from '../types'
import OnesimeLogo from './OnesimeLogo'

// ─── SVG Icons ───────────────────────────────────────────────────────────────

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}
function IconExplorer() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}
function IconFiches() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <circle cx="8" cy="10" r="2" />
      <path d="M6 15c0-1.7 1-2.5 2-2.5s2 .8 2 2.5" />
      <line x1="13" y1="9" x2="21" y2="9" /><line x1="13" y1="13" x2="18" y2="13" />
    </svg>
  )
}
function IconAlbums() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15 16 10 5 21" />
    </svg>
  )
}
function IconArchives() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <rect x="2" y="4" width="20" height="5" rx="1" />
      <path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
      <path d="M10 13h4" />
    </svg>
  )
}
function IconPersons() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  )
}
function IconAbout() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  )
}
function IconTags() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}
function IconTimeline() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <line x1="12" y1="2" x2="12" y2="22" />
      <path d="M12 6l-4 3M12 6l4 3" />
      <path d="M12 12l-4 3M12 12l4 3" />
      <circle cx="12" cy="6" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="18" r="1.5" fill="currentColor" />
    </svg>
  )
}

// ─── Sidebar Button ───────────────────────────────────────────────────────────

interface NavBtnProps {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
  disabled?: boolean
}

function NavBtn({ icon, label, active, onClick, disabled }: NavBtnProps) {
  return (
    <button
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`
        relative group w-10 h-10 rounded-xl flex items-center justify-center transition-all
        ${active
          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
          : disabled
            ? 'text-navy-500 cursor-not-allowed'
            : 'text-slate-400 hover:bg-navy-600 hover:text-white'
        }
      `}
    >
      {icon}
      {/* Tooltip */}
      <span className="absolute left-14 bg-navy-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl border border-navy-700">
        {label}
      </span>
    </button>
  )
}

// ─── Layout ──────────────────────────────────────────────────────────────────

export type LayoutContext = {
  archives: Archive[]
  currentArchive: Archive | null
  setCurrentArchive: (a: Archive) => void
}

export default function Layout() {
  const [archives, setArchives] = useState<Archive[]>([])
  const [currentId, setCurrentId] = useState<string>(
    () => localStorage.getItem('onesime-archive') || ''
  )
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    getArchives().then(list => {
      setArchives(list)
      if (list.length > 0) {
        const saved = list.find(a => a.id === currentId)
        if (!saved) {
          setCurrentId(list[0].id)
          localStorage.setItem('onesime-archive', list[0].id)
        }
      }
    })
  }, [])

  // Keep currentId in sync if we navigate to an archive-specific URL
  useEffect(() => {
    const match = location.pathname.match(/\/archives\/([^/]+)/)
    if (match && match[1] !== currentId) {
      setCurrentId(match[1])
      localStorage.setItem('onesime-archive', match[1])
    }
  }, [location.pathname])

  const current = archives.find(a => a.id === currentId) ?? null

  const setCurrentArchive = (a: Archive) => {
    setCurrentId(a.id)
    localStorage.setItem('onesime-archive', a.id)
  }

  const goTo = (sub: string) => {
    if (!currentId) { navigate('/'); return }
    navigate(`/archives/${currentId}/${sub}`)
  }

  const isOn = (pattern: string) => location.pathname.includes(pattern)
  const noArchive = !currentId

  return (
    <div className="flex h-screen bg-navy-700 overflow-hidden">
      {/* ── Thin sidebar ── */}
      <aside className="w-16 flex-shrink-0 bg-navy-900 flex flex-col items-center py-5 gap-2 border-r border-navy-800">
        {/* Logo */}
        <div
          className="w-10 h-10 cursor-pointer mb-5 select-none flex-shrink-0"
          onClick={() => navigate('/')}
          title="Onésime"
        >
          <OnesimeLogo />
        </div>

        <NavBtn icon={<IconHome />}     label="Accueil"     active={location.pathname === '/'} onClick={() => navigate('/')} />
        <NavBtn icon={<IconExplorer />} label="Explorateur" active={isOn('/browser')}  onClick={() => goTo('browser')}  disabled={noArchive} />
        <NavBtn icon={<IconFiches />}   label="Fiches"      active={isOn('/fiches')}   onClick={() => goTo('fiches')}   disabled={noArchive} />
        <NavBtn icon={<IconAlbums />}   label="Albums"      active={isOn('/albums')}   onClick={() => goTo('albums')}   disabled={noArchive} />
        <NavBtn icon={<IconPersons />}  label="Personnes"   active={isOn('/persons')}  onClick={() => goTo('persons')}  disabled={noArchive} />
        <NavBtn icon={<IconSearch />}   label="Recherche"   active={isOn('/search')}   onClick={() => navigate(currentId ? `/search?archive_id=${currentId}` : '/search')} />
        <NavBtn icon={<IconTimeline />} label="Frise chronologique" active={isOn('/timeline')} onClick={() => goTo('timeline')} disabled={noArchive} />
        <NavBtn icon={<IconTags />}     label="Tags"        active={location.pathname === '/tags'} onClick={() => navigate('/tags')} />

        <div className="flex-1" />

        {archives.length === 0 && (
          <div className="px-1 mb-3 flex flex-col items-center gap-1">
            <div className="w-8 h-px bg-navy-700" />
            <p className="text-[9px] text-navy-500 text-center leading-tight mt-1 px-1">
              Aucune<br/>archive
            </p>
            <button
              onClick={() => navigate('/archives')}
              className="mt-1 text-[9px] text-amber-400 hover:text-amber-300 transition-colors text-center leading-tight"
              title="Créer une archive"
            >
              + Créer
            </button>
          </div>
        )}

        <NavBtn icon={<IconArchives />} label="Archives & Export/Import" active={isOn('/archives') && !isOn('/browser') && !isOn('/fiches') && !isOn('/albums')} onClick={() => navigate('/archives')} />
        {/* Switch to archives module */}
        <button
          title="Module Archives — traitement d'actes"
          onClick={() => navigate(currentId ? `/arch/${currentId}/actes` : '/arch')}
          className="relative group w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/15 hover:bg-amber-500/30 text-amber-400 hover:text-amber-300 transition-all border border-amber-500/20"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>
          <span className="absolute left-14 bg-amber-900 text-amber-100 text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl border border-amber-700">Module Archives</span>
        </button>
        <NavBtn icon={<IconAbout />}    label="À propos"    active={location.pathname === '/about'} onClick={() => navigate('/about')} />
      </aside>

      {/* ── Content ── */}
      <main className="flex-1 overflow-y-auto bg-navy-700">
        <Outlet context={{ archives, currentArchive: current, setCurrentArchive }} />
      </main>
    </div>
  )
}
