import { spawn } from 'node:child_process'

const detached = process.platform !== 'win32'
const api = spawn('npm', ['run', 'api'], { stdio: 'inherit', detached })
const web = spawn('npm', ['run', 'dev:web', '--', '--host', '0.0.0.0'], { stdio: 'inherit', detached })

function stop() {
  for (const child of [api, web]) {
    if (detached && child.pid) {
      try { process.kill(-child.pid, 'SIGTERM') } catch { child.kill('SIGTERM') }
    } else {
      child.kill('SIGTERM')
    }
  }
}

process.on('SIGINT', () => {
  stop()
  process.exit(130)
})
process.on('SIGTERM', () => {
  stop()
  process.exit(143)
})
api.on('close', (code) => {
  if (code !== 0) process.exit(code ?? 1)
})
web.on('close', (code) => {
  stop()
  process.exit(code ?? 0)
})
