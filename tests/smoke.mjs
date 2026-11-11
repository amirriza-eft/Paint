import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

const chrome = spawn('google-chrome', [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--window-size=1440,960',
  '--user-data-dir=/tmp/paint-chrome-profile',
  '--remote-debugging-port=9333',
  'http://127.0.0.1:5173',
], { stdio: 'ignore' })

let socket
try {
  let target
  for (let i = 0; i < 40; i += 1) {
    try {
      const list = await fetch('http://127.0.0.1:9333/json').then((response) => response.json())
      target = list.find((item) => item.type === 'page')
      if (target) break
    } catch {
      await delay(250)
    }
  }
  if (!target) throw new Error('Chrome did not expose a page')

  socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve)
    socket.addEventListener('error', reject)
  })

  let seq = 0
  const pending = new Map()
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (!message.id || !pending.has(message.id)) return
    const { resolve, reject } = pending.get(message.id)
    pending.delete(message.id)
    if (message.error) reject(new Error(JSON.stringify(message.error)))
    else resolve(message.result)
  })

  function send(method, params = {}) {
    const id = ++seq
    socket.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
  }

  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || JSON.stringify(result.exceptionDetails))
    }
    return result.result?.value
  }

  for (let i = 0; i < 50; i += 1) {
    const ready = await evaluate('document.querySelector(\'[data-ready="true"]\') != null')
    if (ready) break
    await delay(200)
    if (i === 49) throw new Error('Paint did not become ready')
  }

  const report = await evaluate(`(async () => {
    const errors = []
    const check = (cond, message) => { if (!cond) errors.push(message) }
    window.__errors = []
    window.addEventListener('error', (event) => window.__errors.push(String(event.message)))
    const canvas = () => document.querySelector('[data-canvas="base"]')
    const pixel = (x, y) => {
      const data = canvas().getContext('2d').getImageData(x, y, 1, 1).data
      return [data[0], data[1], data[2], data[3]]
    }
    const near = (color, expected, tol = 30) => color.every((value, index) => Math.abs(value - expected[index]) <= tol)
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
    async function waitBusy() {
      for (let i = 0; i < 80; i += 1) {
        if (document.querySelector('.workspace')?.dataset.busy !== 'true') return
        await frame()
      }
    }
    function pointer(type, x, y, button = 0) {
      const stack = document.querySelector('.canvas-stack')
      const rect = canvas().getBoundingClientRect()
      stack.dispatchEvent(new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + x * (rect.width / canvas().width),
        clientY: rect.top + y * (rect.height / canvas().height),
        button,
        buttons: type === 'pointerup' ? 0 : (button === 2 ? 2 : 1),
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
      }))
    }
    async function stroke(x0, y0, x1, y1) {
      pointer('pointerdown', x0, y0)
      pointer('pointermove', (x0 + x1) / 2, (y0 + y1) / 2)
      pointer('pointermove', x1, y1)
      pointer('pointerup', x1, y1)
      await frame()
    }
    async function clickSelector(selector) {
      const el = document.querySelector(selector)
      if (!el) throw new Error('Missing ' + selector)
      el.click()
      await frame()
    }
    function anyInk(x, y, radius = 8) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const px = x + dx
          const py = y + dy
          if (px < 0 || py < 0 || px >= canvas().width || py >= canvas().height) continue
          const color = pixel(px, py)
          if (color[3] > 20 && (color[0] < 245 || color[1] < 245 || color[2] < 245)) return true
        }
      }
      return false
    }
    function key(name, extra = {}) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...extra }))
    }

    check(document.title === 'Paint', 'title')
    check(document.querySelector('.ribbon') != null, 'ribbon')
    check(document.querySelector('.status-bar') != null, 'status')
    check(near(pixel(4, 4), [255, 255, 255, 255], 0), 'blank canvas ' + pixel(4, 4))

    await clickSelector('[data-tool="pencil"]')
    await stroke(20, 40, 120, 40)
    check(pixel(60, 40)[0] < 80, 'pencil ' + pixel(60, 40))
    await clickSelector('[data-action="undo"]')
    check(near(pixel(60, 40), [255, 255, 255, 255], 2), 'undo ' + pixel(60, 40))
    await clickSelector('[data-action="redo"]')
    check(pixel(60, 40)[0] < 80, 'redo ' + pixel(60, 40))
    key('z', { ctrlKey: true })
    await frame()
    check(near(pixel(60, 40), [255, 255, 255, 255], 2), 'ctrl+z ' + pixel(60, 40))

    document.querySelector('[data-color="#ED1C24"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, buttons: 1 }))
    document.querySelector('[data-color="#00A2E8"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 2, buttons: 2 }))
    await frame()
    await clickSelector('[data-tool="pencil"]')
    await stroke(20, 80, 140, 80)
    const red = pixel(70, 80)
    check(red[0] > 180 && red[1] < 90 && red[2] < 90, 'primary red ' + red)
    const secondary = getComputedStyle(document.querySelector('.well.secondary')).backgroundColor
    check(secondary.includes('162') || secondary.includes('00a2e8'), 'secondary ' + secondary)

    await clickSelector('[data-tool="eraser"]')
    await stroke(70, 80, 72, 80)
    check(pixel(70, 80)[3] < 16, 'eraser ' + pixel(70, 80))
    key('z', { ctrlKey: true })
    await frame()

    await clickSelector('[data-tool="fill"]')
    pointer('pointerdown', 10, 10)
    pointer('pointerup', 10, 10)
    await waitBusy()
    await frame()
    const filled = pixel(10, 12)
    check(filled[0] > 180 && filled[1] < 90, 'fill ' + filled)
    key('z', { ctrlKey: true })
    await frame()
    await waitBusy()
    check(pixel(10, 12)[0] > 240, 'fill undo ' + pixel(10, 12))

    await clickSelector('[aria-label="Fill"]')
    const shapes = [
      ['line', 30, 160, 110, 160],
      ['rect', 140, 150, 210, 210],
      ['roundRect', 230, 150, 300, 210],
      ['ellipse', 320, 150, 400, 220],
      ['triangle', 420, 150, 490, 220],
      ['rightTriangle', 510, 150, 580, 220],
      ['diamond', 30, 250, 100, 320],
      ['pentagon', 120, 250, 190, 320],
      ['hexagon', 210, 250, 280, 320],
      ['arrow', 300, 280, 390, 280],
      ['callout', 410, 240, 500, 330],
      ['star', 520, 240, 600, 330],
    ]
    for (const [shape, x0, y0, x1, y1] of shapes) {
      await clickSelector('[data-shape="' + shape + '"]')
      await stroke(x0, y0, x1, y1)
      check(anyInk((x0 + x1) / 2, (y0 + y1) / 2, 18), shape + ' did not draw')
    }

    await clickSelector('[data-shape="curve"]')
    await stroke(30, 360, 140, 360)
    pointer('pointerdown', 80, 330)
    pointer('pointermove', 80, 330)
    pointer('pointerup', 80, 330)
    await frame()
    key('Enter')
    await frame()
    check(anyInk(80, 350, 16), 'curve')

    await clickSelector('[data-shape="polygon"]')
    for (const [x, y] of [[160, 350], [230, 350], [195, 410]]) {
      pointer('pointerdown', x, y)
      pointer('pointerup', x, y)
      await frame()
    }
    key('Enter')
    await frame()
    check(anyInk(195, 370, 12), 'polygon')

    const brushes = ['round', 'calligraphy', 'airbrush', 'oil', 'crayon', 'marker', 'watercolor']
    let brushX = 40
    for (const brush of brushes) {
      document.querySelector('[data-tool="brush"]').click()
      await frame()
      const item = document.querySelector('[data-brush="' + brush + '"]')
      if (!item) errors.push('missing brush ' + brush)
      else item.click()
      await frame()
      await stroke(brushX, 460, brushX + 50, 470)
      check(anyInk(brushX + 20, 465, 14), brush)
      brushX += 70
    }

    await clickSelector('[data-tool="picker"]')
    pointer('pointerdown', 175, 180)
    pointer('pointerup', 175, 180)
    await frame()
    const picked = getComputedStyle(document.querySelector('.well.primary')).backgroundColor
    check(picked.includes('237') || picked.includes('ed1c24'), 'picker ' + picked)

    await clickSelector('[data-tool="select"]')
    await stroke(140, 150, 210, 210)
    check(document.querySelector('[data-action="crop"]').disabled === false, 'selection enables crop')
    pointer('pointerdown', 175, 180)
    pointer('pointermove', 255, 180)
    pointer('pointerup', 255, 180)
    await frame()
    pointer('pointerdown', 10, 500)
    pointer('pointerup', 10, 500)
    await frame()
    check(pixel(175, 180)[3] < 20, 'moved selection cleared origin ' + pixel(175, 180))
    check(anyInk(255, 180, 16), 'moved selection')

    await clickSelector('[data-tool="select"]')
    await stroke(230, 150, 300, 210)
    await clickSelector('[data-action="copy"]')
    key('v', { ctrlKey: true })
    await sleep(120)
    await frame()
    pointer('pointerdown', 700, 520)
    pointer('pointerup', 700, 520)
    await frame()
    check(anyInk(40, 40, 24), 'paste')

    await clickSelector('[data-tool="select"]')
    await stroke(520, 240, 600, 330)
    await clickSelector('[data-action="crop"]')
    await frame()
    check(canvas().width < 200 && canvas().height < 200, 'crop size ' + canvas().width + 'x' + canvas().height)

    key('z', { ctrlKey: true })
    await frame()
    await clickSelector('[data-tool="pencil"]')
    await stroke(8, 8, 8, 8)
    await clickSelector('[data-action="rotate"]')
    await frame()
    document.querySelector('.menu button').click()
    await frame()
    const beforeTurn = canvas().width + 'x' + canvas().height
    check(beforeTurn === '600x800' || beforeTurn === '800x600', 'rotate ' + beforeTurn)

    document.querySelector('[data-action="resize"]').click()
    await frame()
    const numbers = [...document.querySelectorAll('.dialog input[type="number"]')]
    numbers[0].value = '640'
    numbers[0].dispatchEvent(new Event('input', { bubbles: true }))
    numbers[1].value = '480'
    numbers[1].dispatchEvent(new Event('input', { bubbles: true }))
    document.querySelector('.dialog button[type="submit"]').click()
    await frame()
    check(canvas().width === 640 && canvas().height === 480, 'resize ' + canvas().width + 'x' + canvas().height)

    await clickSelector('[data-zoom="in"]')
    await frame()
    check(document.querySelector('[data-zoom="reset"]').textContent.includes('150'), 'zoom in ' + document.querySelector('[data-zoom="reset"]').textContent)
    const slider = document.querySelector('[data-zoom="slider"]')
    slider.value = '100'
    slider.dispatchEvent(new Event('input', { bubbles: true }))
    await frame()

    await clickSelector('[data-tool="text"]')
    pointer('pointerdown', 40, 80)
    pointer('pointerup', 40, 80)
    await frame()
    const editor = document.querySelector('.text-editor')
    check(editor != null, 'text editor')
    if (editor) {
      editor.value = 'Hello'
      editor.dispatchEvent(new Event('input', { bubbles: true }))
      await clickSelector('[data-tool="pencil"]')
      await frame()
      check(anyInk(48, 88, 18), 'text pixels')
    }

    await clickSelector('[data-tool="magnifier"]')
    pointer('pointerdown', 50, 50)
    await frame()
    const zoomed = document.querySelector('[data-zoom="reset"]').textContent
    check(zoomed !== '100%', 'magnifier ' + zoomed)
    await clickSelector('[data-zoom="reset"]')
    await frame()

    key('n', { ctrlKey: true })
    await frame()
    const unsaved = document.querySelector('.dialog')
    check(unsaved && unsaved.textContent.includes('save changes'), 'unsaved prompt')
    ;[...document.querySelectorAll('.dialog button')].find((button) => button.textContent.includes("Don't"))?.click()
    await frame()
    const widthInput = document.querySelector('.dialog input[type="number"]')
    const heightInput = document.querySelectorAll('.dialog input[type="number"]')[1]
    widthInput.value = '300'
    widthInput.dispatchEvent(new Event('input', { bubbles: true }))
    heightInput.value = '180'
    heightInput.dispatchEvent(new Event('input', { bubbles: true }))
    document.querySelector('.dialog button[type="submit"]').click()
    await frame()
    check(canvas().width === 300 && canvas().height === 180, 'new canvas ' + canvas().width)
    check(near(pixel(4, 4), [255, 255, 255, 255], 0), 'new canvas white')

    const sample = document.createElement('canvas')
    sample.width = 16
    sample.height = 16
    sample.getContext('2d').fillStyle = '#00ff00'
    sample.getContext('2d').fillRect(0, 0, 16, 16)
    const blob = await new Promise((resolve) => sample.toBlob(resolve, 'image/png'))
    const file = new File([blob], 'sample.png', { type: 'image/png' })
    const transfer = new DataTransfer()
    transfer.items.add(file)
    document.querySelector('.workspace').dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }))
    await sleep(200)
    await frame()
    check(canvas().width === 16 && canvas().height === 16, 'drop opened png ' + canvas().width + 'x' + canvas().height)
    check(pixel(4, 4)[1] > 200 && pixel(4, 4)[0] < 40, 'dropped green ' + pixel(4, 4))

    document.querySelector('[data-menu="file"]').click()
    await frame()
    document.querySelector('[data-action="properties"]').click()
    await frame()
    check(document.querySelector('.dialog h2')?.textContent.includes('properties'), 'properties')
    ;[...document.querySelectorAll('.dialog button')].find((button) => button.textContent === 'Close')?.click()
    await frame()

    document.querySelector('[data-menu="file"]').click()
    await frame()
    document.querySelector('[data-action="save-as"]').click()
    await frame()
    check(document.querySelector('.dialog h2')?.textContent.includes('Save'), 'save dialog')
    ;[...document.querySelectorAll('.dialog button')].find((button) => button.textContent === 'Cancel')?.click()
    await frame()

    const edit = document.querySelector('.text-button')
    edit.click()
    await frame()
    const hex = document.querySelector('.color-dialog input[maxlength="7"]')
    hex.value = '#123456'
    hex.dispatchEvent(new Event('input', { bubbles: true }))
    hex.dispatchEvent(new Event('change', { bubbles: true }))
    await frame()
    document.querySelector('.color-dialog button[type="submit"]').click()
    await frame()
    const primary = getComputedStyle(document.querySelector('.well.primary')).backgroundColor
    check(primary.includes('18') && primary.includes('52') && primary.includes('86'), 'edit colors ' + primary)

    key('a', { ctrlKey: true })
    await frame()
    check(document.querySelector('[data-action="crop"]').disabled === false, 'select all')
    key('Escape')
    await frame()
    check(document.querySelector('[data-action="crop"]').disabled === true, 'escape clears selection')
    check(window.__errors.length === 0, 'page errors ' + window.__errors.join(' | '))
    return errors
  })()`)

  if (!Array.isArray(report)) throw new Error('Smoke test returned ' + JSON.stringify(report))
  if (report.length) {
    console.error(report.join('\n'))
    process.exitCode = 1
  } else {
    console.log('Smoke test passed')
  }
} finally {
  socket?.close()
  chrome.kill('SIGKILL')
}
