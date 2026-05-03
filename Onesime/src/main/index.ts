import { app, BrowserWindow, protocol, net, shell, nativeImage } from 'electron'
import { join, resolve } from 'path'
import { existsSync } from 'fs'
import { initDB } from './db'
import { registerIPC, startHtrService, stopHtrService } from './ipc'

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function getIcon() {
  const iconPath = resolve(__dirname, '../../build/icon.png')
  if (existsSync(iconPath)) return nativeImage.createFromPath(iconPath)
  return undefined
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'Onésime',
    icon: getIcon(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
    },
  })

  win.on('ready-to-show', () => win.show())

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  app.setAppUserModelId('fr.onesime.app')

  // Protocol to serve local files securely (images, PDFs…)
  protocol.handle('localfile', (request) => {
    const filePath = decodeURIComponent(request.url.replace('localfile:///', ''))
    return net.fetch(`file:///${filePath}`)
  })

  // Initialize SQLite database in user data folder
  const dbPath = join(app.getPath('userData'), 'onesime.db')
  await initDB(dbPath)

  registerIPC()
  startHtrService()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => stopHtrService())

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
