function colorClose(data, offset, target, tolerance) {
  return Math.abs(data[offset] - target[0]) <= tolerance
    && Math.abs(data[offset + 1] - target[1]) <= tolerance
    && Math.abs(data[offset + 2] - target[2]) <= tolerance
    && Math.abs(data[offset + 3] - target[3]) <= tolerance
}

export function createFloodFill(imageData, startX, startY, fill, tolerance = 0) {
  const { width, height, data } = imageData
  const visited = new Uint8Array(width * height)
  const stack = []
  let done = true
  let painted = false
  let processed = 0
  const cap = width * height

  const x0 = Math.floor(startX)
  const y0 = Math.floor(startY)
  if (x0 < 0 || y0 < 0 || x0 >= width || y0 >= height) {
    return { step() {}, get done() { return true }, get painted() { return false } }
  }

  const origin = (y0 * width + x0) * 4
  const target = [data[origin], data[origin + 1], data[origin + 2], data[origin + 3]]
  if (colorClose(fill, 0, target, tolerance) && fill.length === 4) {
    return { step() {}, get done() { return true }, get painted() { return false } }
  }
  if (
    Math.abs(fill[0] - target[0]) <= tolerance
    && Math.abs(fill[1] - target[1]) <= tolerance
    && Math.abs(fill[2] - target[2]) <= tolerance
    && Math.abs(fill[3] - target[3]) <= tolerance
  ) {
    return { step() {}, get done() { return true }, get painted() { return false } }
  }

  done = false
  stack.push(x0, y0)

  function matches(x, y) {
    const index = y * width + x
    if (visited[index]) return false
    return colorClose(data, index * 4, target, tolerance)
  }

  function step(budget) {
    let used = 0
    while (stack.length && used < budget && processed <= cap) {
      const y = stack.pop()
      let x = stack.pop()
      while (x > 0 && matches(x - 1, y)) x -= 1
      let above = false
      let below = false
      while (x < width && matches(x, y)) {
        const index = y * width + x
        visited[index] = 1
        const offset = index * 4
        data[offset] = fill[0]
        data[offset + 1] = fill[1]
        data[offset + 2] = fill[2]
        data[offset + 3] = fill[3]
        painted = true
        processed += 1
        used += 1
        if (y > 0) {
          const ok = matches(x, y - 1)
          if (!above && ok) {
            stack.push(x, y - 1)
            above = true
          } else if (above && !ok) above = false
        }
        if (y + 1 < height) {
          const ok = matches(x, y + 1)
          if (!below && ok) {
            stack.push(x, y + 1)
            below = true
          } else if (below && !ok) below = false
        }
        x += 1
      }
    }
    if (!stack.length || processed > cap) done = true
    return done
  }

  return {
    step,
    get done() { return done },
    get painted() { return painted },
  }
}

export function floodFill(imageData, x, y, fill, tolerance = 0) {
  const job = createFloodFill(imageData, x, y, fill, tolerance)
  let guard = 0
  while (!job.done && guard < 10000) {
    job.step(250000)
    guard += 1
  }
  return job.painted
}
