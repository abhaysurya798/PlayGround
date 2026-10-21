import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const captureUrl = process.env.CAPTURE_URL || process.argv[2]
const captureDir = process.env.CAPTURE_DIR || process.argv[3]

if (!captureUrl || !captureDir) {
  console.error('Set CAPTURE_URL and CAPTURE_DIR.')
  process.exit(1)
}

const runtimeDir = process.env.PLAYWRIGHT_RUNTIME || join(homedir(), '.local/share/omgithub-playwright')
const configFile = join(runtimeDir, process.platform === 'darwin' ? 'metal.json' : 'linux.json')

function mark(label, startedAt) {
  console.log(`[timing] ${label}: ${((performance.now() - startedAt) / 1000).toFixed(2)}s`)
}

function transient(message, cause) {
  const error = new Error(message)
  error.transient = true
  if (cause) error.cause = cause
  return error
}

function loadChromium() {
  const roots = [
    process.env.PLAYWRIGHT_RUNTIME,
    runtimeDir,
    join(process.cwd(), 'node_modules'),
    join(homedir(), 'node_modules')
  ].filter(Boolean)

  for (const root of roots) {
    try {
      const require = createRequire(join(root, 'package.json'))
      const playwright = require('playwright')
      if (playwright?.chromium) return playwright.chromium
    } catch {
      // Try the next candidate location.
    }
  }
  try {
    const require = createRequire(import.meta.url)
    const playwright = require('playwright')
    if (playwright?.chromium) return playwright.chromium
  } catch {
    // Fall through to the explicit error below.
  }
  throw transient('Playwright is not available in the configured runtime.')
}

function loadConfig() {
  let config = {}
  try {
    config = JSON.parse(readFileSync(configFile, 'utf8'))
  } catch {
    config = {}
  }
  if (process.platform === 'linux' && !process.env.DISPLAY) {
    try {
      const display = readFileSync(join(runtimeDir, 'display'), 'utf8').trim()
      if (display) process.env.DISPLAY = display.startsWith(':') ? display : `:${display}`
    } catch {
      // Headless launch does not need a display.
    }
  }
  return config
}

async function main() {
  mkdirSync(captureDir, { recursive: true })

  const chromium = loadChromium()
  const config = loadConfig()
  const launchOptions = {
    ...(config.browser?.launchOptions || {}),
    timeout: 30000
  }
  if (launchOptions.headless === undefined) launchOptions.headless = true

  let browser
  const launchStarted = performance.now()
  try {
    browser = await chromium.launch(launchOptions)
  } catch (firstError) {
    try {
      browser = await chromium.launch({ ...launchOptions, headless: true })
    } catch (secondError) {
      throw transient(`Browser launch failed: ${secondError.message}`, secondError)
    }
  }
  mark('browser launch', launchStarted)

  try {
    const views = [
      ['desktop', { width: 1440, height: 900 }, 1],
      ['mobile', { width: 390, height: 844 }, 2]
    ]

    for (const [name, viewport, scale] of views) {
      const viewStarted = performance.now()
      let context
      try {
        context = await browser.newContext({
          viewport,
          deviceScaleFactor: scale,
          isMobile: name === 'mobile',
          hasTouch: name === 'mobile'
        })
      } catch (error) {
        throw transient(`Could not create ${name} browser context: ${error.message}`, error)
      }

      try {
        const page = await context.newPage()
        page.setDefaultTimeout(20000)
        const pageErrors = []
        page.on('pageerror', (error) => pageErrors.push(error.message))

        let response
        try {
          response = await page.goto(captureUrl, { waitUntil: 'load', timeout: 45000 })
        } catch (error) {
          throw transient(`Navigation failed for ${captureUrl}: ${error.message}`, error)
        }

        if (!response) throw transient(`No response while loading ${captureUrl}`)
        const status = response.status()
        if (status >= 400) {
          if (status >= 500 || [408, 425, 429].includes(status)) {
            throw transient(`HTTP ${status} while loading ${captureUrl}`)
          }
          throw new Error(`HTTP ${status} while loading ${captureUrl}`)
        }

        try {
          await page.waitForSelector('body', { state: 'visible', timeout: 20000 })
          await page.waitForFunction(() => document.readyState === 'complete', null, { timeout: 20000 })
          await page.waitForSelector('body[data-ready="true"]', { timeout: 8000 }).catch(() => {})
          await page.waitForFunction(() => !document.fonts || document.fonts.status === 'loaded', null, { timeout: 10000 }).catch(() => {})
          await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {})
          await page.waitForTimeout(700)
        } catch (error) {
          throw new Error(`Page did not finish rendering: ${error.message}`)
        }

        const snapshot = await page.evaluate(() => ({
          elements: document.querySelectorAll('body *').length,
          text: (document.body.innerText || '').trim().length,
          title: document.title
        }))
        if (snapshot.elements < 3 || snapshot.text < 10) {
          throw new Error(`Rendered page appears empty for ${name} view.`)
        }
        if (pageErrors.length) {
          console.error(`Page errors during ${name} capture: ${pageErrors.join(' | ')}`)
        }

        const screenshot = join(captureDir, `final-${name}.png`)
        try {
          await page.screenshot({ path: screenshot, type: 'png', animations: 'disabled', timeout: 30000 })
        } catch (error) {
          throw transient(`Screenshot failed for ${name}: ${error.message}`, error)
        }

        if (!existsSync(screenshot)) throw new Error(`Screenshot was not written: ${screenshot}`)
        const bytes = statSync(screenshot).size
        if (bytes < 2000) throw new Error(`Screenshot ${name} appears blank (${bytes} bytes).`)

        console.log(`Captured ${name}: ${snapshot.title || 'untitled'} (${bytes} bytes, HTTP ${status})`)
      } finally {
        await context.close().catch((error) => {
          console.error(`Could not close ${name} context: ${error.message}`)
        })
      }
      mark(`${name} capture`, viewStarted)
    }
  } finally {
    if (browser) {
      const closeStarted = performance.now()
      await browser.close().catch((error) => {
        console.error(`Could not close browser: ${error.message}`)
        if (!process.exitCode) process.exitCode = 75
      })
      mark('browser close', closeStarted)
    }
  }
}

try {
  await main()
} catch (error) {
  console.error(error.message || error)
  if (error.cause) console.error(error.cause.message || error.cause)
  process.exitCode = error.transient ? 75 : 1
}
