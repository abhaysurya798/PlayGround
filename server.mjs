import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, resolve, sep } from 'node:path'

const root = resolve(process.argv[2] || process.env.SERVE_DIR || 'dist')
const port = Number(process.argv[3] || process.env.PORT || 3000)

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`Invalid port: ${process.argv[3] || process.env.PORT}`)
  process.exit(1)
}
if (!existsSync(join(root, 'index.html'))) {
  console.error(`No index.html found in ${root}`)
  process.exit(1)
}

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
}

function withinRoot(file) {
  return file === root || file.startsWith(root + sep)
}

function sendFile(req, res, file, status = 200) {
  let info
  try {
    info = statSync(file)
  } catch {
    return false
  }
  if (!info.isFile()) return false
  res.writeHead(status, {
    'Content-Type': mime[extname(file).toLowerCase()] || 'application/octet-stream',
    'Content-Length': info.size,
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff'
  })
  if (req.method === 'HEAD') {
    res.end()
    return true
  }
  const stream = createReadStream(file)
  stream.on('error', () => {
    if (!res.headersSent) res.writeHead(500)
    res.end('Read error')
  })
  stream.pipe(res)
  return true
}

const server = createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' })
    res.end('Method not allowed')
    return
  }

  let pathname
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  } catch {
    res.writeHead(400)
    res.end('Bad request')
    return
  }
  if (pathname.includes('\0')) {
    res.writeHead(400)
    res.end('Bad request')
    return
  }

  const target = resolve(root, '.' + pathname)
  if (!withinRoot(target)) {
    res.writeHead(404)
    res.end('Not found')
    return
  }

  try {
    const info = statSync(target)
    if (info.isDirectory()) {
      if (sendFile(req, res, join(target, 'index.html'))) return
    } else if (sendFile(req, res, target)) {
      return
    }
  } catch {
    // Fall through to the SPA entry point.
  }

  if (extname(pathname) === '' && sendFile(req, res, join(root, 'index.html'))) return

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('Not found')
})

server.on('error', (error) => {
  console.error(`Server error: ${error.message}`)
  process.exitCode = 1
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Serving ${root} at http://0.0.0.0:${port}`)
})

function shutdown(signal) {
  console.log(`Received ${signal}, shutting down`)
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 3000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
