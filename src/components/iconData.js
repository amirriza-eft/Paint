const S = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function stroke(d, extra = {}) {
  return { tag: 'path', attrs: { d, ...S, ...extra } }
}

export const iconData = {
  app: [
    { tag: 'rect', attrs: { x: 2, y: 2, width: 20, height: 20, rx: 2, fill: '#f4f4f4', stroke: '#b5b5b5' } },
    { tag: 'path', attrs: { d: 'M6 16.5 14.2 7.4l3.2 2.8L9.2 19H6v-2.5z', fill: '#2c2c2c' } },
    { tag: 'path', attrs: { d: 'M14.2 7.4 16 5.6a1.9 1.9 0 0 1 2.7 2.7l-1.8 1.8', fill: '#d4544a' } },
    { tag: 'circle', attrs: { cx: 7.2, cy: 7.2, r: 1.7, fill: '#ed1c24' } },
    { tag: 'circle', attrs: { cx: 11, cy: 6.2, r: 1.3, fill: '#fff200' } },
    { tag: 'circle', attrs: { cx: 6.2, cy: 10.4, r: 1.3, fill: '#00a2e8' } },
  ],
  undo: [stroke('M8 8H4v4'), stroke('M4.5 8.5A8 8 0 1 1 6 17')],
  redo: [stroke('M16 8h4v4'), stroke('M19.5 8.5A8 8 0 1 0 18 17')],
  save: [
    stroke('M5 4h11l3 3v13H5V4z'),
    { tag: 'path', attrs: { d: 'M8 4v5h7V4', ...S } },
    { tag: 'path', attrs: { d: 'M8 14h8v6H8z', ...S } },
  ],
  minimize: [{ tag: 'path', attrs: { d: 'M5 12h14', ...S } }],
  maximize: [{ tag: 'rect', attrs: { x: 5, y: 5, width: 14, height: 14, ...S } }],
  restore: [
    { tag: 'rect', attrs: { x: 7, y: 7, width: 11, height: 11, ...S } },
    { tag: 'path', attrs: { d: 'M6 16V6h10', ...S } },
  ],
  close: [stroke('M6 6l12 12'), stroke('M18 6 6 18')],
  paste: [
    { tag: 'rect', attrs: { x: 7, y: 5, width: 12, height: 15, rx: 1, ...S } },
    { tag: 'path', attrs: { d: 'M10 5.5V4h6v1.5', ...S } },
    { tag: 'path', attrs: { d: 'M10 11h6M10 14h6M10 17h4', ...S } },
  ],
  cut: [
    stroke('M8 8a2.2 2.2 0 1 0 0-4 2.2 2.2 0 0 0 0 4z'),
    stroke('M8 20a2.2 2.2 0 1 0 0-4 2.2 2.2 0 0 0 0 4z'),
    stroke('M9.4 7.2 20 18'),
    stroke('M9.4 16.8 20 6'),
  ],
  copy: [
    { tag: 'rect', attrs: { x: 8, y: 7, width: 11, height: 13, rx: 1, ...S } },
    { tag: 'path', attrs: { d: 'M5 16V4h11', ...S } },
  ],
  'select-all': [
    { tag: 'rect', attrs: { x: 4, y: 4, width: 16, height: 16, strokeDasharray: '2.2 1.6', ...S } },
  ],
  select: [
    { tag: 'rect', attrs: { x: 5, y: 6, width: 13, height: 12, strokeDasharray: '2.4 1.6', ...S } },
    { tag: 'path', attrs: { d: 'M8 6V4h2M14 6V4h2M8 20v-2h2M14 20v-2h2M5 9H3v2M5 15H3v2M21 9h-2v2M21 15h-2v2', stroke: 'currentColor', strokeWidth: 1.4 } },
  ],
  crop: [
    stroke('M7 3v14h14'),
    stroke('M3 7h14v14'),
  ],
  resize: [
    stroke('M4 9V4h5'),
    stroke('M15 4h5v5'),
    stroke('M20 15v5h-5'),
    stroke('M9 20H4v-5'),
  ],
  rotate: [stroke('M20 12a8 8 0 1 1-2.2-5.5'), stroke('M20 4v4h-4')],
  'flip-h': [stroke('M4 7h7l-2-2'), stroke('M4 7l2 2'), stroke('M20 17h-7l2 2'), stroke('M20 17l-2-2'), { tag: 'path', attrs: { d: 'M12 4v16', stroke: 'currentColor', strokeWidth: 1.4, strokeDasharray: '1.5 1.5' } }],
  'flip-v': [stroke('M7 4v7l-2-2'), stroke('M7 4l2 2'), stroke('M17 20v-7l2 2'), stroke('M17 20l-2-2'), { tag: 'path', attrs: { d: 'M4 12h16', stroke: 'currentColor', strokeWidth: 1.4, strokeDasharray: '1.5 1.5' } }],
  pencil: [
    { tag: 'path', attrs: { d: 'M4 20 14.8 8.4 18 11.5 7.2 20H4z', fill: 'currentColor' } },
    { tag: 'path', attrs: { d: 'M14.8 8.4 16.7 6.5a1.7 1.7 0 0 1 2.4 2.4L17.2 10.8', fill: 'currentColor' } },
  ],
  fill: [
    { tag: 'path', attrs: { d: 'M8 14.5 14.5 8a2 2 0 0 1 2.8 2.8L10.8 17.3a2.2 2.2 0 0 1-3.1 0 2.2 2.2 0 0 1 .3-2.8z', ...S } },
    { tag: 'path', attrs: { d: 'M7 18c.4 1.4 1.6 2.4 3 2.4 1.8 0 2.6-1.5 3.2-2.6', ...S } },
  ],
  text: [
    { tag: 'path', attrs: { d: 'M5 6h14M12 6v13', ...S, strokeWidth: 2 } },
  ],
  eraser: [
    { tag: 'path', attrs: { d: 'M4 15.5 12.2 7.2a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L9.5 20H4v-4.5z', ...S } },
    { tag: 'path', attrs: { d: 'M8 14.5 12 18.5', ...S } },
  ],
  picker: [
    stroke('M10 14.5 4.5 20'),
    { tag: 'path', attrs: { d: 'M13.2 5.2 18.8 10.8 11.2 18.4l-5.6-5.6z', ...S } },
    { tag: 'path', attrs: { d: 'M15.2 7.2 12 10.4', ...S } },
  ],
  magnifier: [
    { tag: 'circle', attrs: { cx: 10.5, cy: 10.5, r: 5.5, ...S } },
    stroke('M14.8 14.8 20 20'),
  ],
  brush: [
    { tag: 'path', attrs: { d: 'M14 4c2 2 2.5 4 1 6l-6.5 6.5a2.2 2.2 0 0 1-3.2-3L12 7c.4-1.6 1.2-2.6 2-3z', ...S } },
    { tag: 'path', attrs: { d: 'M5 19c1.2.4 2.2-.2 2.6-1', ...S } },
  ],
  line: [stroke('M5 19 19 5')],
  curve: [stroke('M4 16c4-10 12-10 16 0')],
  rect: [{ tag: 'rect', attrs: { x: 4, y: 6, width: 16, height: 12, ...S } }],
  roundRect: [{ tag: 'rect', attrs: { x: 4, y: 6, width: 16, height: 12, rx: 3, ...S } }],
  ellipse: [{ tag: 'ellipse', attrs: { cx: 12, cy: 12, rx: 8, ry: 6, ...S } }],
  polygon: [stroke('M12 4 20 10 17 20H7L4 10z')],
  triangle: [stroke('M12 4 21 20H3z')],
  rightTriangle: [stroke('M5 5v14h14z')],
  diamond: [stroke('M12 3 21 12 12 21 3 12z')],
  pentagon: [stroke('M12 3.5 20.5 9.2 17.2 20H6.8L3.5 9.2z')],
  hexagon: [stroke('M8 4h8l4 8-4 8H8L4 12z')],
  arrow: [stroke('M4 12h12'), stroke('M12 6l6 6-6 6')],
  callout: [
    { tag: 'path', attrs: { d: 'M5 5h14v9H10l-3 4v-4H5z', ...S } },
  ],
  star: [stroke('M12 3.2 14.7 9l6.1.6-4.6 4 1.4 6-5.6-3.4L6.4 19.6 7.8 13.6 3.2 9.6 9.3 9z')],
  outline: [{ tag: 'rect', attrs: { x: 4, y: 4, width: 16, height: 16, ...S } }],
  'fill-mode': [{ tag: 'rect', attrs: { x: 4, y: 4, width: 16, height: 16, fill: 'currentColor', stroke: 'currentColor' } }],
  both: [
    { tag: 'rect', attrs: { x: 4, y: 4, width: 16, height: 16, fill: 'currentColor', opacity: 0.28, stroke: 'currentColor', strokeWidth: 1.7 } },
  ],
  swap: [stroke('M7 8h11l-3-3'), stroke('M17 16H6l3 3')],
  new: [
    { tag: 'rect', attrs: { x: 5, y: 4, width: 14, height: 16, ...S } },
    stroke('M12 8v8M8 12h8'),
  ],
  open: [
    stroke('M3 8V6h6l2 2h10v10H3z'),
  ],
  print: [
    { tag: 'path', attrs: { d: 'M7 9V4h10v5', ...S } },
    { tag: 'path', attrs: { d: 'M6 14H4V9h16v5h-2', ...S } },
    { tag: 'rect', attrs: { x: 7, y: 13, width: 10, height: 7, ...S } },
  ],
  properties: [
    { tag: 'circle', attrs: { cx: 12, cy: 12, r: 8, ...S } },
    { tag: 'path', attrs: { d: 'M12 11v5', ...S } },
    { tag: 'circle', attrs: { cx: 12, cy: 8, r: 0.8, fill: 'currentColor' } },
  ],
  exit: [stroke('M10 5H5v14h5'), stroke('M10 12h9'), stroke('M16 8l4 4-4 4')],
  'zoom-in': [
    { tag: 'circle', attrs: { cx: 10, cy: 10, r: 5.5, ...S } },
    stroke('M14.5 14.5 20 20'),
    stroke('M10 7.5v5M7.5 10h5'),
  ],
  'zoom-out': [
    { tag: 'circle', attrs: { cx: 10, cy: 10, r: 5.5, ...S } },
    stroke('M14.5 14.5 20 20'),
    stroke('M7.5 10h5'),
  ],
}
