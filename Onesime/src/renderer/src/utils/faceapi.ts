import * as faceapi from '@vladmandic/face-api'

let loaded = false
let loading = false
const listeners: Array<() => void> = []

function getModelUrl(): string {
  // file:// in production, http://localhost in dev
  if (window.location.protocol === 'file:') {
    return new URL('./models', window.location.href).href
  }
  return `${window.location.origin}/models`
}

export async function loadFaceModels(): Promise<void> {
  if (loaded) return
  if (loading) {
    return new Promise(resolve => listeners.push(resolve))
  }
  loading = true
  const MODEL_URL = getModelUrl()
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ])
  loaded = true
  loading = false
  listeners.forEach(fn => fn())
  listeners.length = 0
}

export interface FaceDetection {
  box: { x: number; y: number; w: number; h: number }  // normalized 0–1
  descriptor: Float32Array
}

export async function detectAllFacesInImage(imgSrc: string): Promise<FaceDetection[]> {
  await loadFaceModels()
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = async () => {
      const detections = await faceapi
        .detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.25 }))
        .withFaceLandmarks()
        .withFaceDescriptors()
      resolve(detections.map(d => ({
        box: {
          x: d.detection.box.x / img.naturalWidth,
          y: d.detection.box.y / img.naturalHeight,
          w: d.detection.box.width / img.naturalWidth,
          h: d.detection.box.height / img.naturalHeight,
        },
        descriptor: d.descriptor,
      })))
    }
    img.onerror = () => resolve([])
    img.src = imgSrc
  })
}

export async function computeFaceDescriptor(
  imgSrc: string,
  zone: { x: number; y: number; width: number; height: number }
): Promise<Float32Array | null> {
  await loadFaceModels()
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = async () => {
      const zw = Math.round(img.naturalWidth * zone.width)
      const zh = Math.round(img.naturalHeight * zone.height)
      const scale = Math.max(1, 160 / Math.min(zw, zh))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(zw * scale)
      canvas.height = Math.round(zh * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, Math.round(img.naturalWidth * zone.x), Math.round(img.naturalHeight * zone.y), zw, zh, 0, 0, canvas.width, canvas.height)
      const detection = await faceapi
        .detectSingleFace(canvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 }))
        .withFaceLandmarks()
        .withFaceDescriptor()
      resolve(detection?.descriptor ?? null)
    }
    img.onerror = () => resolve(null)
    img.src = imgSrc
  })
}

// Calcule le descripteur en forçant sur la zone (sans détection auto)
// Utilisé quand computeFaceDescriptor retourne null
export async function forceFaceDescriptor(
  imgSrc: string,
  zone: { x: number; y: number; width: number; height: number }
): Promise<Float32Array | null> {
  await loadFaceModels()
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = async () => {
      const canvas = document.createElement('canvas')
      canvas.width = 160
      canvas.height = 160
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(
        img,
        Math.round(img.naturalWidth * zone.x), Math.round(img.naturalHeight * zone.y),
        Math.round(img.naturalWidth * zone.width), Math.round(img.naturalHeight * zone.height),
        0, 0, 160, 160
      )
      try {
        const descriptor = await faceapi.nets.faceRecognitionNet.computeFaceDescriptor(canvas) as Float32Array
        resolve(descriptor)
      } catch { resolve(null) }
    }
    img.onerror = () => resolve(null)
    img.src = imgSrc
  })
}

export function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0))
}

export function similarityPercent(distance: number): number {
  return Math.round(Math.max(0, (1 - distance / 0.65)) * 100)
}

export function descriptorToJson(d: Float32Array): string {
  return JSON.stringify(Array.from(d))
}

export function jsonToDescriptor(s: string): number[] {
  return JSON.parse(s)
}
