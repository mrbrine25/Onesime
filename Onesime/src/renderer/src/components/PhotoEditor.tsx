import { useState, useEffect, useRef } from 'react'
import { fileUrl, updateDocument, getThumbnail } from '../api/client'
import type { AlbumDocument, Document } from '../types'

// ─── In-renderer thumbnail cache ─────────────────────────────────────────────
const thumbCache = new Map<string, string>()

function useThumbnail(filePath: string, maxPx: number) {
  const key = filePath + '@' + maxPx
  const [url, setUrl] = useState<string | null>(() => thumbCache.get(key) ?? null)
  useEffect(() => {
    if (thumbCache.has(key)) { setUrl(thumbCache.get(key)!); return }
    let cancelled = false
    getThumbnail(filePath, maxPx).then(dataUrl => {
      if (cancelled) return
      thumbCache.set(key, dataUrl)
      setUrl(dataUrl)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [key])
  return url
}

// ─── Canvas preview of the final result ───────────────────────────────────────

function useTransformCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  src: string,
  rotation: number,
  crop: { x: number; y: number; w: number; h: number },
  brightness: number,
  contrast: number,
  flipH: boolean,
  flipV: boolean,
  fitMode: 'contain' | 'cover' = 'contain',
  extraDeps: unknown[] = []
) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const img = new Image()
    img.onload = () => {
      const ctx = canvas.getContext('2d')!
      const cw = canvas.width, ch = canvas.height
      ctx.clearRect(0, 0, cw, ch)
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, cw, ch)
      const sx = crop.x * img.naturalWidth
      const sy = crop.y * img.naturalHeight
      const sw = crop.w * img.naturalWidth
      const sh = crop.h * img.naturalHeight
      const scaleX = cw / sw, scaleY = ch / sh
      const scale = fitMode === 'contain' ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY)
      const dw = sw * scale, dh = sh * scale
      ctx.filter = `brightness(${(100 + brightness) / 100}) contrast(${(100 + contrast) / 100})`
      ctx.save()
      ctx.translate(cw / 2, ch / 2)
      if (flipH) ctx.scale(-1, 1)
      if (flipV) ctx.scale(1, -1)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.drawImage(img, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh)
      ctx.restore()
      ctx.filter = 'none'
    }
    img.src = src
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, rotation, crop.x, crop.y, crop.w, crop.h, brightness, contrast, flipH, flipV, ...extraDeps])
}

// ─── Displayed photo in album (canvas when transformed) ───────────────────────

export function TransformedPhoto({ doc, containerClass, fitMode = 'cover' }: { doc: AlbumDocument; containerClass?: string; fitMode?: 'cover' | 'contain' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const crop = { x: doc.album_crop_x ?? 0, y: doc.album_crop_y ?? 0, w: doc.album_crop_w ?? 1, h: doc.album_crop_h ?? 1 }
  const rotation = doc.album_rotation ?? 0
  const brightness = doc.album_brightness ?? 0
  const contrast = doc.album_contrast ?? 0
  const flipH = !!(doc.album_flip_h)
  const flipV = !!(doc.album_flip_v)
  const isImage = doc.mime_type.startsWith('image/')
  const hasTransform = isImage && (
    rotation !== 0 || crop.x !== 0 || crop.y !== 0 || crop.w !== 1 || crop.h !== 1 ||
    brightness !== 0 || contrast !== 0 || flipH || flipV
  )
  const src = fileUrl(doc.file_path)

  useTransformCanvas(canvasRef, hasTransform ? src : '', rotation, crop, brightness, contrast, flipH, flipV, fitMode)

  if (!isImage) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-slate-100 ${containerClass ?? ''}`}>
        <span className="text-slate-400 text-xs font-bold uppercase">{doc.filename.split('.').pop()}</span>
      </div>
    )
  }
  if (hasTransform) {
    return <canvas ref={canvasRef} width={300} height={240} className={`w-full h-full ${containerClass ?? ''}`} style={{ objectFit: fitMode }} />
  }
  return <img src={src} alt={doc.title || doc.filename} loading="lazy" className={`w-full h-full ${containerClass ?? ''}`} style={{ objectFit: fitMode }} draggable={false} />
}

// ─── Crop overlay ─────────────────────────────────────────────────────────────

type CropRect = { x: number; y: number; w: number; h: number }

function CropOverlay({ onCropChange, currentCrop }: {
  onCropChange: (c: CropRect) => void
  currentCrop: CropRect
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [drawing, setDrawing] = useState<{ sx: number; sy: number; x: number; y: number; w: number; h: number } | null>(null)

  const rel = (e: React.MouseEvent) => {
    const r = containerRef.current!.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    }
  }

  const onDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const p = rel(e)
    setDrawing({ sx: p.x, sy: p.y, x: p.x, y: p.y, w: 0, h: 0 })
  }
  const onMove = (e: React.MouseEvent) => {
    if (!drawing) return
    const p = rel(e)
    setDrawing(d => !d ? null : ({ ...d, x: Math.min(p.x, d.sx), y: Math.min(p.y, d.sy), w: Math.abs(p.x - d.sx), h: Math.abs(p.y - d.sy) }))
  }
  const onUp = () => {
    if (drawing && drawing.w > 0.02 && drawing.h > 0.02) {
      onCropChange({ x: drawing.x, y: drawing.y, w: drawing.w, h: drawing.h })
    }
    setDrawing(null)
  }

  const active = drawing ?? (currentCrop.w < 1 || currentCrop.h < 1 ? currentCrop : null)

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 cursor-crosshair select-none"
      onMouseDown={onDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={onUp}
    >
      {active && (
        <>
          <div className="absolute inset-0 bg-black/50 pointer-events-none" />
          <div
            className="absolute border-2 border-white pointer-events-none"
            style={{ left: `${active.x * 100}%`, top: `${active.y * 100}%`, width: `${active.w * 100}%`, height: `${active.h * 100}%`, boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }}
          />
        </>
      )}
      {!active && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-white/60 text-xs bg-black/40 px-3 py-1.5 rounded-lg">Glissez pour rogner</p>
        </div>
      )}
    </div>
  )
}

// ─── Slider row ───────────────────────────────────────────────────────────────

function SliderRow({ label, value, min, max, onChange, onReset }: {
  label: string; value: number; min: number; max: number
  onChange: (v: number) => void; onReset: () => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-slate-400 uppercase tracking-wider">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white font-mono w-10 text-right">{value > 0 ? '+' : ''}{value}</span>
          {value !== 0 && <button onClick={onReset} className="text-[10px] text-slate-500 hover:text-red-400 transition-colors">↺</button>}
        </div>
      </div>
      <input
        type="range" min={min} max={max} step={1} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-blue-500"
      />
    </div>
  )
}

// ─── Main PhotoEditor modal ───────────────────────────────────────────────────

interface Props {
  doc: AlbumDocument
  albumId: string
  onSave: (data: {
    rotation: number; crop_x: number; crop_y: number; crop_w: number; crop_h: number
    brightness: number; contrast: number; flip_h: number; flip_v: number
  }) => void
  onClose: () => void
}

export default function PhotoEditor({ doc, onSave, onClose }: Props) {
  const [rotation, setRotation]     = useState(doc.album_rotation ?? 0)
  const [crop, setCrop]             = useState<CropRect>({
    x: doc.album_crop_x ?? 0, y: doc.album_crop_y ?? 0,
    w: doc.album_crop_w ?? 1, h: doc.album_crop_h ?? 1,
  })
  const [brightness, setBrightness] = useState(doc.album_brightness ?? 0)
  const [contrast, setContrast]     = useState(doc.album_contrast ?? 0)
  const [flipH, setFlipH]           = useState(!!(doc.album_flip_h))
  const [flipV, setFlipV]           = useState(!!(doc.album_flip_v))
  const [previewSize, setPreviewSize] = useState({ w: 280, h: 200 })
  const previewCanvasRef            = useRef<HTMLCanvasElement>(null)
  const src                         = fileUrl(doc.file_path)

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const maxW = 280, maxH = 280
      const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight)
      setPreviewSize({ w: Math.round(img.naturalWidth * scale), h: Math.round(img.naturalHeight * scale) })
    }
    img.src = src
  }, [src])

  useTransformCanvas(previewCanvasRef, src, rotation, crop, brightness, contrast, flipH, flipV, 'contain', [previewSize.w, previewSize.h])

  const handleSave = () => {
    onSave({
      rotation, crop_x: crop.x, crop_y: crop.y, crop_w: crop.w, crop_h: crop.h,
      brightness, contrast, flip_h: flipH ? 1 : 0, flip_v: flipV ? 1 : 0,
    })
  }

  const resetAll = () => {
    setRotation(0)
    setCrop({ x: 0, y: 0, w: 1, h: 1 })
    setBrightness(0)
    setContrast(0)
    setFlipH(false)
    setFlipV(false)
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-navy-900 rounded-2xl shadow-2xl border border-navy-700 w-[800px] max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-navy-800 flex-shrink-0">
          <h3 className="font-semibold text-white">Éditeur de photo</h3>
          <div className="flex items-center gap-3">
            <button onClick={resetAll} className="text-xs text-slate-500 hover:text-orange-400 transition-colors">Tout réinitialiser</button>
            <button onClick={onClose} className="text-slate-500 hover:text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left: crop editor */}
          <div className="flex-1 flex flex-col p-4 gap-3 border-r border-navy-800">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rognage</p>
              <button onClick={() => setCrop({ x: 0, y: 0, w: 1, h: 1 })} className="text-xs text-slate-500 hover:text-red-400 transition-colors">Réinitialiser</button>
            </div>
            <div className="relative flex-1 rounded-xl overflow-hidden bg-navy-800" style={{ minHeight: 220 }}>
              <img src={src} alt="" draggable={false} className="w-full h-full object-contain pointer-events-none select-none block" />
              <CropOverlay onCropChange={setCrop} currentCrop={crop} />
            </div>
            <p className="text-[10px] text-slate-600">Glissez sur l'image pour définir la zone à conserver</p>
          </div>

          {/* Right: controls + preview */}
          <div className="w-[300px] flex-shrink-0 flex flex-col p-4 gap-4 overflow-y-auto min-h-0">
            {/* Preview */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Aperçu</p>
              <div className="rounded-xl overflow-hidden bg-navy-800 flex items-center justify-center" style={{ height: previewSize.h }}>
                <canvas ref={previewCanvasRef} width={previewSize.w} height={previewSize.h} style={{ width: previewSize.w, height: previewSize.h }} />
              </div>
            </div>

            {/* Rotation */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rotation</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white font-mono">{rotation.toFixed(1)}°</span>
                  {rotation !== 0 && <button onClick={() => setRotation(0)} className="text-[10px] text-slate-500 hover:text-red-400">↺</button>}
                </div>
              </div>
              <input type="range" min={-180} max={180} step={0.5} value={rotation} onChange={e => setRotation(Number(e.target.value))} className="w-full accent-blue-500" />
              <div className="flex gap-1 mt-2">
                {[-90, -45, -15, 15, 45, 90].map(deg => (
                  <button key={deg} onClick={() => setRotation(r => Math.max(-180, Math.min(180, r + deg)))}
                    className="flex-1 text-[10px] bg-navy-700 hover:bg-navy-600 text-slate-300 rounded-lg py-1 transition-colors font-mono">
                    {deg > 0 ? '+' : ''}{deg}°
                  </button>
                ))}
              </div>
            </div>

            {/* Flip */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Miroir</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setFlipH(v => !v)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors border ${flipH ? 'bg-blue-600 border-blue-500 text-white' : 'bg-navy-700 border-navy-600 text-slate-300 hover:bg-navy-600'}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <path d="M12 3v18M4 7l4 5-4 5M20 7l-4 5 4 5" />
                  </svg>
                  Horizontal
                </button>
                <button
                  onClick={() => setFlipV(v => !v)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors border ${flipV ? 'bg-blue-600 border-blue-500 text-white' : 'bg-navy-700 border-navy-600 text-slate-300 hover:bg-navy-600'}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <path d="M3 12h18M7 4l5 4 5-4M7 20l5-4 5 4" />
                  </svg>
                  Vertical
                </button>
              </div>
            </div>

            {/* Brightness & Contrast */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Réglages</p>
              <SliderRow label="Luminosité" value={brightness} min={-100} max={100} onChange={setBrightness} onReset={() => setBrightness(0)} />
              <SliderRow label="Contraste" value={contrast} min={-100} max={100} onChange={setContrast} onReset={() => setContrast(0)} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-navy-800 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-navy-700 text-sm text-slate-400 hover:text-white transition-colors">Annuler</button>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors">
            Enregistrer les modifications
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers: adapt a plain Document to the editor ────────────────────────────

function docToAlbumDoc(doc: Document): AlbumDocument {
  return {
    ...doc,
    album_caption: '',
    album_position: 0,
    album_rotation: doc.rotation ?? 0,
    album_crop_x:   doc.crop_x   ?? 0,
    album_crop_y:   doc.crop_y   ?? 0,
    album_crop_w:   doc.crop_w   ?? 1,
    album_crop_h:   doc.crop_h   ?? 1,
    album_brightness: doc.brightness ?? 0,
    album_contrast:   doc.contrast   ?? 0,
    album_flip_h:     doc.flip_h     ?? 0,
    album_flip_v:     doc.flip_v     ?? 0,
  }
}

// ─── DocPhoto: display a Document with its own transforms ────────────────────

function DocThumbnail({ filePath, maxPx, className }: { filePath: string; maxPx: number; className?: string }) {
  const url = useThumbnail(filePath, maxPx)
  if (!url) return <div className={`bg-slate-200 animate-pulse ${className ?? ''}`} />
  return <img src={url} className={`w-full h-full object-cover ${className ?? ''}`} draggable={false} />
}

export function DocPhoto({ doc, className, thumbnailSize }: { doc: Document; className?: string; thumbnailSize?: number }) {
  const albumDoc = docToAlbumDoc(doc)
  const hasTransform = !!(albumDoc.album_rotation || albumDoc.album_crop_w !== 1 || albumDoc.album_crop_h !== 1 ||
    albumDoc.album_brightness || albumDoc.album_contrast || albumDoc.album_flip_h || albumDoc.album_flip_v)
  if (thumbnailSize && !hasTransform && doc.mime_type.startsWith('image/')) {
    return <DocThumbnail filePath={doc.file_path} maxPx={thumbnailSize} className={className} />
  }
  return <TransformedPhoto doc={albumDoc} containerClass={className} />
}

// ─── DocPhotoEditor: edit transforms on a plain Document ─────────────────────

export function DocPhotoEditor({ doc, onSave, onClose }: {
  doc: Document
  onSave: (updated: Document) => void
  onClose: () => void
}) {
  const handleSave = async (data: {
    rotation: number; crop_x: number; crop_y: number; crop_w: number; crop_h: number
    brightness: number; contrast: number; flip_h: number; flip_v: number
  }) => {
    await updateDocument(doc.id, data)
    onSave({ ...doc, rotation: data.rotation, crop_x: data.crop_x, crop_y: data.crop_y, crop_w: data.crop_w, crop_h: data.crop_h, brightness: data.brightness, contrast: data.contrast, flip_h: data.flip_h, flip_v: data.flip_v })
  }

  return <PhotoEditor doc={docToAlbumDoc(doc)} albumId="" onSave={handleSave} onClose={onClose} />
}
