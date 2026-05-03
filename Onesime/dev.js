// Wrapper to launch electron-vite dev with ELECTRON_RUN_AS_NODE removed.
// VSCode sets ELECTRON_RUN_AS_NODE=1 which prevents Electron from initializing
// as a browser process. This script removes it before spawning electron-vite.
const { spawn } = require('child_process')

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const ps = spawn('electron-vite', ['dev'], { stdio: 'inherit', env, shell: true })
ps.on('close', code => process.exit(code ?? 0))
