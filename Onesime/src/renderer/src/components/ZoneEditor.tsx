import { useRef, useState, useCallback, useEffect } from 'react'
import type { Zone } from '../types'

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
type ZoneRect = { x: number; y: number; width: number; height: number }

type Interaction =
  | { mode: 'drawing'; sx: number; sy: number; x: number; y: number; w: number; h: number }
  | { mode: 'moving'; zoneId: string; startX: number; startY: number; origX: number; origY: number; width: number; height: number }
  | { mode: 'resizing'; zoneId: string; handle: Handle; startX: number; startY: number; orig: ZoneRect }
  | { mode: 'panning'; startX: number; startY: number; origPanX: number; origPanY: number }
  | null

interface Props {
  imageUrl: string
  zones: Zone[]
  onZoneCreated: (z: ZoneRect) => void
  onZoneSelected: (z: Zone) => void
  onZoneLabelChanged?: (zoneId: string, label: string) => void
  onZoneUpdated?: (zoneId: string, update: ZoneRect) => void
  onZoneDeleted?: (zoneId: string) => void
  selectedZoneId?: string
}

const HANDLE_CURSORS: Record<Handle, string> = {
  nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize',
  e: 'e-resize', se: 'se-resize', s: 's-resize',
  sw: 'sw-resize', w: 'w-resize',
}

const HANDLES: { id: Handle; style: React.CSSProperties }[] = [
  { id: 'nw', style: { top: -4, left: -4, cursor: 'nw-resize' } },
  { id: 'n',  style: { top: -4, left: 'calc(50% - 4px)', cursor: 'n-resize' } },
  { id: 'ne', style: { top: -4, right: -4, cursor: 'ne-resize' } },
  { id: 'e',  style: { top: 'calc(50% - 4px)', right: -4, cursor: 'e-resize' } },
  { id: 'se', style: { bottom: -4, right: -4, cursor: 'se-resize' } },
  { id: 's',  style: { bottom: -4, left: 'calc(50% - 4px)', cursor: 's-resize' } },
  { id: 'sw', style: { bottom: -4, left: -4, cursor: 'sw-resize' } },
  { id: 'w',  style: { top: 'calc(50% - 4px)', left: -4, cursor: 'w-resize' } },
]

function clampRect(r: ZoneRect): ZoneRect {
  const w = Math.max(0.02, r.width)
  const h = Math.max(0.02, r.height)
  const x = Math.max(0, Math.min(r.x, 1 - w))
  const y = Math.max(0, Math.min(r.y, 1 - h))
  return { x, y, width: w, height: h }
}

function applyResize(orig: ZoneRect, handle: Handle, dx: number, dy: number): ZoneRect {
  let { x, y, width, height } = orig
  if (handle.includes('n')) { y += dy; height -= dy }
  if (handle.includes('s')) { height += dy }
  if (handle.includes('w')) { x += dx; width -= dx }
  if (handle.includes('e')) { width += dx }
  return clampRect({ x, y, width, height })
}

export default function ZoneEditor({ imageUrl, zones, onZoneCreated, onZoneSelected, onZoneLabelChanged, onZoneUpdated, onZoneDeleted, selectedZoneId }: Props) {
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [interaction, setInteraction] = useState<Interaction>(null)
  const [draft, setDraft] = useState<{ zoneId: string; rect: ZoneRect } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [renamingZoneId, setRenamingZoneId] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const [showZoomHint, setShowZoomHint] = useState(false)
  const zoomHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (zoomHintTimer.current) clearTimeout(zoomHintTimer.current) }, [])

  // Image-relative coordinates — getBoundingClientRect() accounts for CSS transforms
  const rel = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    const r = imgRef.current!.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    }
  }, [])

  const resetView = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }) }, [])

  const applyZoom = useCallback((newZoom: number, cx: number, cy: number, currentZoom: number, currentPan: { x: number; y: number }) => {
    const ix = (cx - currentPan.x) / currentZoom
    const iy = (cy - currentPan.y) / currentZoom
    setZoom(newZoom)
    setPan({ x: cx - newZoom * ix, y: cy - newZoom * iy })
  }, [])

  const zoomIn = useCallback(() => {
    if (!containerRef.current) return
    const cr = containerRef.current.getBoundingClientRect()
    applyZoom(Math.min(6, zoom + 0.5), cr.width / 2, cr.height / 2, zoom, pan)
  }, [zoom, pan, applyZoom])

  const zoomOut = useCallback(() => {
    if (!containerRef.current) return
    const cr = containerRef.current.getBoundingClientRect()
    applyZoom(Math.max(0.25, zoom - 0.5), cr.width / 2, cr.height / 2, zoom, pan)
  }, [zoom, pan, applyZoom])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey) {
      setShowZoomHint(true)
      if (zoomHintTimer.current) clearTimeout(zoomHintTimer.current)
      zoomHintTimer.current = setTimeout(() => setShowZoomHint(false), 1800)
      return
    }
    e.preventDefault()
    const container = containerRef.current!
    const cr = container.getBoundingClientRect()
    const mx = e.clientX - cr.left
    const my = e.clientY - cr.top
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
    applyZoom(Math.max(0.25, Math.min(6, zoom * factor)), mx, my, zoom, pan)
  }, [zoom, pan, applyZoom])

  const getCursor = () => {
    if (!interaction) return 'crosshair'
    if (interaction.mode === 'panning') return 'grabbing'
    if (interaction.mode === 'drawing') return 'crosshair'
    if (interaction.mode === 'moving') return 'move'
    if (interaction.mode === 'resizing') return HANDLE_CURSORS[interaction.handle]
    return 'crosshair'
  }

  const onContainerDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-zone]')) return
    e.preventDefault()
    // Middle-click or Alt+left-drag → pan
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setInteraction({ mode: 'panning', startX: e.clientX, startY: e.clientY, origPanX: pan.x, origPanY: pan.y })
      return
    }
    if (e.button !== 0) return
    const p = rel(e)
    setInteraction({ mode: 'drawing', sx: p.x, sy: p.y, x: p.x, y: p.y, w: 0, h: 0 })
  }

  const onZoneBodyDown = (e: React.MouseEvent, zone: Zone) => {
    if ((e.target as HTMLElement).closest('[data-handle]')) return
    e.stopPropagation()
    e.preventDefault()
    const p = rel(e)
    setInteraction({ mode: 'moving', zoneId: zone.id, startX: p.x, startY: p.y, origX: zone.x, origY: zone.y, width: zone.width, height: zone.height })
    setDraft({ zoneId: zone.id, rect: { x: zone.x, y: zone.y, width: zone.width, height: zone.height } })
  }

  const onHandleDown = (e: React.MouseEvent, zone: Zone, handle: Handle) => {
    e.stopPropagation()
    e.preventDefault()
    const p = rel(e)
    setInteraction({ mode: 'resizing', zoneId: zone.id, handle, startX: p.x, startY: p.y, orig: { x: zone.x, y: zone.y, width: zone.width, height: zone.height } })
    setDraft({ zoneId: zone.id, rect: { x: zone.x, y: zone.y, width: zone.width, height: zone.height } })
  }

  const onMove = (e: React.MouseEvent) => {
    if (!interaction) return

    if (interaction.mode === 'panning') {
      const dx = e.clientX - interaction.startX
      const dy = e.clientY - interaction.startY
      setPan({ x: interaction.origPanX + dx, y: interaction.origPanY + dy })
      return
    }

    const p = rel(e)

    if (interaction.mode === 'drawing') {
      setInteraction(d => !d || d.mode !== 'drawing' ? d : {
        ...d,
        x: Math.min(p.x, d.sx),
        y: Math.min(p.y, d.sy),
        w: Math.abs(p.x - d.sx),
        h: Math.abs(p.y - d.sy),
      })
      return
    }

    if (interaction.mode === 'moving') {
      const dx = p.x - interaction.startX
      const dy = p.y - interaction.startY
      const rect = clampRect({ x: interaction.origX + dx, y: interaction.origY + dy, width: interaction.width, height: interaction.height })
      setDraft({ zoneId: interaction.zoneId, rect })
      return
    }

    if (interaction.mode === 'resizing') {
      const dx = p.x - interaction.startX
      const dy = p.y - interaction.startY
      const rect = applyResize(interaction.orig, interaction.handle, dx, dy)
      setDraft({ zoneId: interaction.zoneId, rect })
    }
  }

  const onUp = () => {
    if (!interaction) return

    if (interaction.mode === 'drawing') {
      if (interaction.w > 0.02 && interaction.h > 0.02) {
        onZoneCreated({ x: interaction.x, y: interaction.y, width: interaction.w, height: interaction.h })
      }
      setInteraction(null)
      return
    }

    if (interaction.mode === 'panning') {
      setInteraction(null)
      return
    }

    if ((interaction.mode === 'moving' || interaction.mode === 'resizing') && draft) {
      onZoneUpdated?.(draft.zoneId, draft.rect)
    }

    setInteraction(null)
    setDraft(null)
  }

  const drawingPreview = interaction?.mode === 'drawing' && interaction.w > 0.005 ? interaction : null

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-xs text-slate-500 flex items-center gap-3 flex-1 flex-wrap">
          <span className="flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            Glisser pour créer
          </span>
          <span className="text-slate-600">Ctrl+Molette = zoom · Alt+glisser = déplacer vue</span>
        </p>
        {/* Zoom controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={zoomOut}
            className="w-6 h-6 flex items-center justify-center bg-navy-700 hover:bg-navy-600 text-slate-300 rounded text-base font-bold leading-none transition-colors select-none"
            title="Dézoomer (−)"
          >−</button>
          <button
            onClick={resetView}
            className="px-2 h-6 flex items-center justify-center bg-navy-700 hover:bg-navy-600 text-slate-400 rounded text-[10px] font-mono transition-colors select-none"
            title="Réinitialiser la vue"
          >{Math.round(zoom * 100)}%</button>
          <button
            onClick={zoomIn}
            className="w-6 h-6 flex items-center justify-center bg-navy-700 hover:bg-navy-600 text-slate-300 rounded text-base font-bold leading-none transition-colors select-none"
            title="Zoomer (+)"
          >+</button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative select-none rounded-xl overflow-hidden border border-navy-700 bg-navy-900"
        style={{ cursor: getCursor() }}
        onMouseDown={onContainerDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        onWheel={handleWheel}
      >
        {/* Zoom hint overlay */}
        {showZoomHint && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <div className="bg-black/70 text-white text-sm font-medium px-4 py-2 rounded-xl shadow-xl border border-white/10 backdrop-blur-sm">
              Maintenez <kbd className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-mono">Ctrl</kbd> pour zoomer
            </div>
          </div>
        )}
        {/* Zoomable viewport — transform doesn't affect layout, container height = unzoomed image height */}
        <div style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          position: 'relative',
          width: '100%',
        }}>
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Document"
            className="w-full h-auto block"
            draggable={false}
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          />

          {/* Zones */}
          {zones.map(z => {
            const rect = (draft?.zoneId === z.id) ? draft.rect : { x: z.x, y: z.y, width: z.width, height: z.height }
            const isSelected = z.id === selectedZoneId
            const isDragging = draft?.zoneId === z.id

            return (
              <div
                key={z.id}
                data-zone="true"
                onMouseDown={e => onZoneBodyDown(e, { ...z, ...rect })}
                onClick={e => {
                  e.stopPropagation()
                  if (isDragging) return
                  if (e.detail === 2) {
                    onZoneSelected(z)
                    setRenamingZoneId(z.id)
                    setRenameVal(z.label || '')
                  } else {
                    if (renamingZoneId) setRenamingZoneId(null)
                    onZoneSelected(z)
                  }
                }}
                className={`absolute border-2 transition-colors ${
                  isSelected
                    ? 'border-yellow-400 bg-yellow-300/20'
                    : 'border-blue-400 bg-blue-500/10 hover:bg-blue-500/25'
                }`}
                style={{
                  left: `${rect.x * 100}%`,
                  top: `${rect.y * 100}%`,
                  width: `${rect.width * 100}%`,
                  height: `${rect.height * 100}%`,
                  cursor: isSelected ? 'move' : 'pointer',
                  opacity: isDragging ? 0.85 : 1,
                }}
              >
                {(() => {
                  const badgePos = rect.y < 0.06 ? 'top-0.5 left-0' : '-top-5 left-0'
                  if (renamingZoneId === z.id) return (
                    <input
                      autoFocus
                      value={renameVal}
                      onChange={e => setRenameVal(e.target.value)}
                      onBlur={() => { onZoneLabelChanged?.(z.id, renameVal); setRenamingZoneId(null) }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                        if (e.key === 'Escape') setRenamingZoneId(null)
                        e.stopPropagation()
                      }}
                      onMouseDown={e => e.stopPropagation()}
                      onClick={e => e.stopPropagation()}
                      className={`absolute ${badgePos} text-[11px] bg-blue-800 text-white px-1.5 py-0.5 rounded border border-yellow-400 focus:outline-none whitespace-nowrap shadow z-30 min-w-[80px]`}
                      placeholder="Nom…"
                    />
                  )
                  const label = (z.persons?.length ?? 0) > 0
                    ? z.persons!.map(p => `${p.first_name} ${p.last_name}`).join(', ')
                    : z.label
                  return (
                    <div className={`absolute ${badgePos} flex items-center gap-0.5 z-10`}>
                      {label && (
                        <span className="text-[11px] bg-blue-600 text-white px-1.5 py-0.5 rounded-l whitespace-nowrap shadow">
                          {label}
                        </span>
                      )}
                      {(isSelected || !label) && onZoneDeleted && (
                        <button
                          data-zone="true"
                          onMouseDown={e => e.stopPropagation()}
                          onClick={e => { e.stopPropagation(); onZoneDeleted(z.id) }}
                          className={`text-[10px] bg-red-600 hover:bg-red-500 text-white px-1 py-0.5 shadow transition-colors ${label ? 'rounded-r' : 'rounded'}`}
                          title="Supprimer la vignette"
                        >✕</button>
                      )}
                    </div>
                  )
                })()}

                {/* Resize handles — only on selected zone */}
                {isSelected && HANDLES.map(h => (
                  <div
                    key={h.id}
                    data-handle="true"
                    onMouseDown={e => onHandleDown(e, { ...z, ...rect }, h.id)}
                    className="absolute w-2.5 h-2.5 bg-white border-2 border-yellow-500 rounded-sm z-20"
                    style={{ ...h.style, position: 'absolute' }}
                  />
                ))}
              </div>
            )
          })}

          {/* Drawing preview */}
          {drawingPreview && (
            <div
              className="absolute border-2 border-dashed border-green-400 bg-green-300/10 pointer-events-none"
              style={{ left: `${drawingPreview.x * 100}%`, top: `${drawingPreview.y * 100}%`, width: `${drawingPreview.w * 100}%`, height: `${drawingPreview.h * 100}%` }}
            />
          )}

          {/* Empty hint */}
          {!interaction && zones.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/40 backdrop-blur-sm rounded-xl px-4 py-2.5 text-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" className="w-8 h-8 mx-auto mb-1">
                  <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2" />
                  <line x1="12" y1="7" x2="12" y2="17" /><line x1="7" y1="12" x2="17" y2="12" />
                </svg>
                <p className="text-slate-400 text-xs">Cliquez-glissez pour créer une vignette</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
