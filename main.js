const { spawn } = require('child_process')
const fs = require('fs')
const http = require('http')

const NODEPATH = '/usr/bin/node'
const EXTENSION = '.cgi.js'
const ENCODING = 'utf8'
const EXECTIMEOUT = 10
const PORT = process.env.PORT || 8989
const BASEDIR = process.env.BASEDIR || '.'

const startProcess = (path, arg, res) => {
  const cwd = (BASEDIR + '/' + path).replace(/\/[^/]+$/, '/')
  let output = ''
  const proc = spawn(
    NODEPATH,
    [path.split('/').pop(), arg],
    { cwd }
  )
  // child output on stderr (before any other output) will
  //  be parsed as headers (Header-Name: Value) if possible
  proc.stderr.setEncoding(ENCODING)
  proc.stderr.on('data', (data) => {
    let header
    if (!output && (header = /^([A-Za-z-]+): ([^\n]+)\n?$/.exec(data))) {
      return res.setHeader(header[1], header[2])
    }
    output += data
  })
  proc.stdout.setEncoding(ENCODING)
  proc.stdout.on('data', (data) => {
    output += data
  })
  const timeout = setTimeout(() => {
    proc.kill('SIGINT')
  }, 1000 * EXECTIMEOUT)
  proc.on('close', (code) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    if (code) {
      res.writeHead(200)
    }
    res.end(output)
  })
  return proc
}

const server = http.createServer((req, res) => {
  try {
    const url = new URL('http://0.0.0.0' + req.url)
    let path = url.pathname.substr(1)
    if (path.endsWith('/')) {
      path += 'index' + EXTENSION
    } else if (!path.endsWith(EXTENSION)) {
      path += EXTENSION
    }
    if (!fs.existsSync(path)) {
      throw new Error('404: not found')
    }
    const proc = startProcess(path, url.search ? url.search.substr(1) : '', res)

    if (req.method === 'POST') {
      proc.stdin.setEncoding(ENCODING)
      let body = ''
      req.on('data', (data) => {
        proc.stdin.write(data)
      })
      req.on('end', () => {
        proc.stdin.end()
      })
    } else if (req.method !== 'GET') {
      throw new Error('405: method not allowed')
    }
  } catch (e) {
    let msg = e.message, code = 500
    if (/^\d{3}:/.test(msg)) {
      code = +msg.substr(0, 3)
      msg = msg.substr(4).trim()
    }
    res.writeHead(code, {
      'Content-Type': 'text/plain'
    })
    return res.end(msg)
  }
})

server.listen(PORT)
