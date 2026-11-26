import type {TreeSprite, TreeSprites} from './tree-assets';
import type {TreeData, TreeNode} from './types';

export interface Camera {scale: number; ox: number; oy: number}
export type Highlight = 'all' | 'search' | 'allocated' | 'unallocated' | 'notables' |
  'keystones' | 'masteries' | 'jewels' | 'starts';
type ConnectionState = 'Active' | 'Intermediate' | 'Normal';

const pixelsToTreeUnits = 2.6;
const noSprites: TreeSprites = () => undefined;
const isStart = (node: TreeNode) => node.classStartIndex !== undefined || node.isAscendancyStart;

function nodeRadius(node: TreeNode, scale: number) {
  if (node.classStartIndex !== undefined) return Math.max(5, 105 * pixelsToTreeUnits * scale);
  if (node.isAscendancyStart) return Math.max(5, 16 * pixelsToTreeUnits * scale);
  const width = node.isMastery ? 86 : node.isKeystone ? 83 : node.isJewelSocket ?
    76 : node.isNotable ? 58 : 39;
  return Math.max(width / 24, width * pixelsToTreeUnits * scale / 2);
}

export function fitCamera(canvas: HTMLCanvasElement, nodes: TreeNode[]): Camera {
  const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!nodes.length || !w || !h) return {scale: .08, ox: w / 2, oy: h / 2};
  const padding = nodes[0].ascendancyName ? 950 : 850;
  const scale = Math.min(w / (Math.max(...xs) - Math.min(...xs) + padding),
    h / (Math.max(...ys) - Math.min(...ys) + padding));
  return {
    scale,
    ox: w / 2 - (Math.max(...xs) + Math.min(...xs)) / 2 * scale,
    oy: h / 2 - (Math.max(...ys) + Math.min(...ys)) / 2 * scale,
  };
}

export function zoomCamera(camera: Camera, factor: number, x: number, y: number): Camera {
  const scale = Math.max(.006, Math.min(2, camera.scale * factor));
  return {
    scale,
    ox: x - (x - camera.ox) * scale / camera.scale,
    oy: y - (y - camera.oy) * scale / camera.scale,
  };
}

const hitCellSize = 384;
const hitGrids = new WeakMap<TreeNode[], Map<string, number[]>>();

function hitGrid(list: TreeNode[]) {
  let grid = hitGrids.get(list);
  if (grid) return grid;
  grid = new Map();
  list.forEach((node, index) => {
    const key = Math.floor(node.x / hitCellSize) + ',' + Math.floor(node.y / hitCellSize);
    const cell = grid.get(key);
    if (cell) cell.push(index);
    else grid.set(key, [index]);
  });
  hitGrids.set(list, grid);
  return grid;
}

export function hitNode(list: TreeNode[], x: number, y: number, {scale, ox, oy}: Camera) {
  let closest: TreeNode | undefined;
  let distance = Infinity;
  let nearestIndex = Infinity;
  // The class-start medallion has the largest hit area at every scale.
  const reach = Math.max(7, Math.max(5, 105 * pixelsToTreeUnits * scale) + 3);
  const left = Math.floor((x - ox - reach) / scale / hitCellSize);
  const right = Math.floor((x - ox + reach) / scale / hitCellSize);
  const top = Math.floor((y - oy - reach) / scale / hitCellSize);
  const bottom = Math.floor((y - oy + reach) / scale / hitCellSize);
  const grid = hitGrid(list);
  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      const cell = grid.get(col + ',' + row);
      if (!cell) continue;
      for (const index of cell) {
        const node = list[index];
        const dx = node.x * scale + ox - x, dy = node.y * scale + oy - y;
        const d = dx * dx + dy * dy;
        if (d > distance || (d === distance && index >= nearestIndex)) continue;
        const radius = Math.max(7, nodeRadius(node, scale) + 3);
        if (d <= radius * radius) {
          closest = node;
          distance = d;
          nearestIndex = index;
        }
      }
    }
  }
  return closest;
}

const clippedIcons = new WeakMap<TreeSprite, TreeSprite>();

function circularIcon(sprite: TreeSprite) {
  const cached = clippedIcons.get(sprite);
  if (cached) return cached;
  const image = document.createElement('canvas');
  // Rasterize the mask above atlas resolution so its edge stays smooth when zoomed.
  const w = sprite.w * 2, h = sprite.h * 2;
  image.width = w;
  image.height = h;
  const ctx = image.getContext('2d')!;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
  ctx.clip();
  blit(ctx, sprite, 0, 0, w, h);
  const result = {image, x: 0, y: 0, w, h};
  clippedIcons.set(sprite, result);
  return result;
}

function blit(ctx: CanvasRenderingContext2D, sprite: TreeSprite, x: number, y: number,
  width: number, height: number) {
  const {image, x: sx, y: sy, w, h} = sprite;
  ctx.drawImage(image, sx, sy, w, h, x, y, width, height);
}

function centered(ctx: CanvasRenderingContext2D, sprite: TreeSprite | undefined,
  x: number, y: number, scale: number, width = sprite ? sprite.w * scale : 0) {
  if (!sprite) return false;
  const height = width * sprite.h / sprite.w;
  blit(ctx, sprite, x - width / 2, y - height / 2, width, height);
  return true;
}

function ascendancyAtlas(sprite: TreeSprites, name: string) {
  if (sprite('ascendancy', 'Classes' + name)) return 'ascendancy';
  const bloodline = name[0].toLowerCase() + name.slice(1) + 'Bloodline';
  return sprite(bloodline, 'Classes' + name) ? bloodline : 'azmeriBloodline';
}

const completeGroups = new WeakMap<TreeSprite, TreeSprite>();

function completeGroup(sprite: TreeSprite) {
  const cached = completeGroups.get(sprite);
  if (cached) return cached;
  const {w, h} = sprite, image = document.createElement('canvas');
  image.width = w;
  image.height = h * 2;
  const ctx = image.getContext('2d')!;
  blit(ctx, sprite, 0, 0, w, h);
  ctx.translate(w, h * 2);
  ctx.rotate(Math.PI);
  blit(ctx, sprite, 0, 0, w, h);
  const result = {image, x: 0, y: 0, w, h: h * 2};
  completeGroups.set(sprite, result);
  return result;
}

function makeConnection(data: TreeData, a: TreeNode, b: TreeNode) {
  const orbit = a.group === b.group && a.orbit === b.orbit ? a.orbit : undefined;
  const radius = orbit ? data.constants.orbitRadii[orbit] : 0;
  const {x: cx, y: cy} = data.groups[a.group];
  const dx = b.x - a.x, dy = b.y - a.y;
  const start = radius ? Math.atan2(a.y - cy, a.x - cx) : Math.atan2(dy, dx);
  const end = radius ? Math.atan2(b.y - cy, b.x - cx) : start;
  const sweep = Math.atan2(Math.sin(end - start), Math.cos(end - start));
  return {a, b, orbit, radius, cx, cy, dx, dy, start, end, sweep, distance: Math.hypot(dx, dy),
    left: radius ? cx - radius : Math.min(a.x, b.x),
    right: radius ? cx + radius : Math.max(a.x, b.x),
    top: radius ? cy - radius : Math.min(a.y, b.y),
    bottom: radius ? cy + radius : Math.max(a.y, b.y)};
}

type Connection = ReturnType<typeof makeConnection>;
const layouts = new WeakMap<TreeNode[], {
  ids: Set<string>;
  groups: Set<string>;
  connections: Connection[];
}>();

function treeLayout(data: TreeData, list: TreeNode[], nodes: Map<string, TreeNode>) {
  const cached = layouts.get(list);
  if (cached) return cached;
  const ids = new Set(list.map(node => node.id));
  const groups = new Set(list.map(node => node.group));
  const connections = [];
  for (const node of list) {
    if (node.isMastery) continue;
    for (const id of node.links) {
      if (id <= node.id || !ids.has(id)) continue;
      const other = nodes.get(id)!;
      // Mastery availability is represented by the cluster art.
      if (!other.isMastery) connections.push(makeConnection(data, node, other));
    }
  }
  const layout = {ids, groups, connections};
  layouts.set(list, layout);
  return layout;
}

function drawConnection(ctx: CanvasRenderingContext2D, sprite: TreeSprites,
  edge: Connection, camera: Camera, state: ConnectionState, w: number, h: number, alpha: number) {
  const {scale, ox, oy} = camera;
  const unit = scale * pixelsToTreeUnits;
  const margin = 7 * unit + 1;
  if (!edge.distance || edge.right * scale + ox < -margin || edge.left * scale + ox > w + margin ||
    edge.bottom * scale + oy < -margin || edge.top * scale + oy > h + margin) return;

  if (ctx.globalAlpha !== alpha) ctx.globalAlpha = alpha;
  const x = edge.a.x * scale + ox, y = edge.a.y * scale + oy;
  const radius = edge.radius * scale;
  const {orbit, start, end, sweep} = edge;

  const line = !radius && unit >= .11 && sprite('line', 'LineConnector' + state);
  if (line) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(start);
    const height = line.h * unit;
    blit(ctx, line, 0, -height / 2, edge.distance * scale, height);
    ctx.restore();
    return;
  }

  const cx = edge.cx * scale + ox, cy = edge.cy * scale + oy;
  const arc = radius && unit >= .11 && sprite('line', 'Orbit' + orbit + state);
  if (arc) {
    // Orbit sprites are quarter-turns with the pivot at the bottom right.
    const inset = state === 'Active' ? 7 : 2;
    const width = arc.w * radius / (arc.w - inset);
    const first = sweep < 0 ? end : start;
    for (let offset = 0; offset < Math.abs(sweep); offset += Math.PI / 2) {
      const angle = Math.min(Math.PI / 2, Math.abs(sweep) - offset);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(first + offset - Math.PI);
      ctx.beginPath();
      // Smaller ornaments share the same atlas rectangle inside this quarter arc.
      ctx.arc(0, 0, radius + 8 * unit, Math.PI, Math.PI + angle);
      ctx.arc(0, 0, Math.max(0, radius - 8 * unit), Math.PI + angle, Math.PI, true);
      ctx.closePath();
      ctx.clip();
      blit(ctx, arc, -width, -width, width, width);
      ctx.restore();
    }
    return;
  }

  // At overview scale, an opaque subpixel stroke preserves the fine metal branches.
  ctx.beginPath();
  if (radius) ctx.arc(cx, cy, radius, start, start + sweep, sweep < 0);
  else {
    ctx.moveTo(x, y);
    ctx.lineTo(x + edge.dx * scale, y + edge.dy * scale);
  }
  ctx.lineWidth = Math.max(state === 'Active' ? 1 : .6, unit * 3);
  ctx.strokeStyle = state === 'Active' ? '#f4d091' : state === 'Intermediate' ? '#9d7c4c' : '#695d49';
  ctx.stroke();
}

function drawNode(ctx: CanvasRenderingContext2D, sprite: TreeSprites, node: TreeNode,
  x: number, y: number, unit: number, radius: number, allocated: boolean, connected: boolean,
  hasEffect: boolean, className: string | undefined) {
  const width = radius * 2;
  if (node.classStartIndex !== undefined) {
    const art = allocated && sprite('startNode', 'center' + className?.toLowerCase());
    return centered(ctx, art || sprite('startNode', 'PSStartNodeBackgroundInactive'), x, y,
      unit, art ? width * art.w / 202 : width);
  }
  const state = allocated ? 'Allocated' : connected ? 'CanAllocate' : 'Unallocated';
  if (node.isAscendancyStart && node.ascendancyName) {
    return centered(ctx, sprite(ascendancyAtlas(sprite, node.ascendancyName), 'AscendancyMiddle'),
      x, y, unit, width);
  }
  if (node.isMastery) {
    const selected = (allocated ? sprite('masteryActiveSelected', node.activeIcon) : undefined);
    const icon = selected ?? sprite(connected || allocated ? 'masteryConnected' : 'masteryInactive',
      node.inactiveIcon) ?? sprite('mastery', node.icon);
    if (hasEffect) centered(ctx, sprite('masteryActiveSelected', 'PassiveMasteryConnectedButton'),
      x, y, unit, width);
    return centered(ctx, icon, x, y, unit, width);
  }
  if (node.isJewelSocket) {
    const size = node.expansionJewel?.size;
    const cluster = size === undefined ? undefined : ['Small', 'Medium', 'Large'][size];
    const frame = !allocated && cluster
      ? 'JewelSocketClusterAlt' + (connected ? 'CanAllocate' : 'Normal') + '1' + cluster
      : cluster ? 'JewelSocketAltActive' : 'JewelFrame' + state;
    return centered(ctx, sprite('frame', frame), x, y, unit, width);
  }

  const kind = node.isKeystone ? 'keystone' : node.isNotable ? 'notable' : 'normal';
  const icon = sprite(kind + (allocated ? 'Active' : 'Inactive'), node.icon);
  const frame = node.isKeystone ? 'KeystoneFrame' + state : node.isNotable ? 'NotableFrame' + state :
    allocated ? 'PSSkillFrameActive' : connected ? 'PSSkillFrameHighlighted' : 'PSSkillFrame';
  const asc = node.ascendancyName;
  const ascFrame = asc && sprite(ascendancyAtlas(sprite, asc),
    'AscendancyFrame' + (node.isNotable ? 'Large' : 'Small') +
    (state === 'Unallocated' ? 'Normal' : state));
  const overlay = ascFrame || sprite('frame', frame);
  if (icon) {
    const ratio = node.isKeystone ? .63 : node.isNotable ? .64 : .67;
    centered(ctx, circularIcon(icon), x, y, unit, width * ratio);
  }
  return centered(ctx, overlay, x, y, unit, width) || !!icon;
}

interface TreeDrawing {
  data: TreeData;
  list: TreeNode[];
  nodes: Map<string, TreeNode>;
  selected: Set<string>;
  revision: number;
  masteries: Record<string, string>;
  current?: TreeNode;
  pinned: boolean;
  query: string;
  camera: Camera;
  highlight: Highlight;
  sprite?: TreeSprites;
}

type PixelRect = {x: number; y: number; w: number; h: number};

interface SceneCache {
  surface: HTMLCanvasElement;
  key: readonly unknown[];
  camera: Camera;
  presented?: {x: number; y: number; scale: number; damage?: PixelRect};
}

const scenes = new WeakMap<HTMLCanvasElement, SceneCache>();
const patterns = new WeakMap<CanvasRenderingContext2D,
  {image: CanvasImageSource; pattern: CanvasPattern}>();

export function drawTree(canvas: HTMLCanvasElement, drawing: TreeDrawing, zoomPreview = false) {
  const ctx = canvas.getContext('2d', {alpha: false});
  const dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
  if (!ctx || !w || !h) return;
  const width = Math.round(w * dpr), height = Math.round(h * dpr);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;

  const {camera, current, highlight, list, pinned, revision, selected, sprite} = drawing;
  const key = [w, h, width, height, list, selected, revision, sprite,
    highlight, highlight === 'search' ? drawing.query : ''];
  const ratioX = width / w, ratioY = height / h;
  const padding = Math.round(192 * dpr);
  const inspected = current && list.includes(current) ? current : undefined;
  const needsDetail = inspected && (highlight !== 'all' || (isStart(inspected) && camera.scale < .08));
  let cache = scenes.get(canvas);

  function sourceRect(origin: Camera) {
    const factor = camera.scale / origin.scale;
    return {
      x: padding + (origin.ox - camera.ox / factor) * ratioX,
      y: padding + (origin.oy - camera.oy / factor) * ratioY,
      w: width / factor,
      h: height / factor,
      factor,
    };
  }

  let source = sourceRect(cache?.camera ?? camera);
  const inside = source.x >= -.001 && source.y >= -.001 &&
    source.x + source.w <= width + padding * 2 + .001 &&
    source.y + source.h <= height + padding * 2 + .001;
  const aligned = Math.abs(source.x - Math.round(source.x)) < .001 &&
    Math.abs(source.y - Math.round(source.y)) < .001;
  const preview = zoomPreview && !needsDetail && source.factor >= .67 && source.factor <= 1.5;
  if (!cache || !cache.key.every((value, index) => value === key[index]) || !inside ||
    (!(source.factor === 1 && aligned) && !preview)) {
    const surface = cache?.surface ?? document.createElement('canvas');
    const bufferWidth = width + padding * 2, bufferHeight = height + padding * 2;
    if (surface.width !== bufferWidth) surface.width = bufferWidth;
    if (surface.height !== bufferHeight) surface.height = bufferHeight;
    const scene = surface.getContext('2d', {alpha: false})!;
    scene.setTransform(ratioX, 0, 0, ratioY, 0, 0);
    drawScene(scene, bufferWidth / ratioX, bufferHeight / ratioY, {
      ...drawing,
      camera: {...camera, ox: camera.ox + padding / ratioX, oy: camera.oy + padding / ratioY},
    }, undefined);
    cache = {surface, key, camera: {...camera}};
    scenes.set(canvas, cache);
    source = sourceRect(camera);
  }

  // Copy only the previous inspection area when the backing scene and camera are unchanged.
  const {surface, presented} = cache;
  if (source.factor === 1 && (aligned || !preview)) {
    source.x = Math.round(source.x);
    source.y = Math.round(source.y);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (!presented || presented.x !== source.x || presented.y !== source.y ||
    presented.scale !== source.factor) {
    ctx.drawImage(surface, source.x, source.y, source.w, source.h, 0, 0, width, height);
  } else if (presented.damage) {
    const {x, y, w, h} = presented.damage;
    ctx.drawImage(surface, source.x + x / source.factor, source.y + y / source.factor,
      w / source.factor, h / source.factor, x, y, w, h);
  }

  cache.presented = {x: source.x, y: source.y, scale: source.factor};
  if (!inspected) return;
  const x = inspected.x * camera.scale + camera.ox, y = inspected.y * camera.scale + camera.oy;
  const radius = nodeRadius(inspected, camera.scale);
  ctx.setTransform(ratioX, 0, 0, ratioY, 0, 0);
  const label = isStart(inspected) ? startLabel(drawing.data, inspected) : '';
  ctx.font = '600 12px Segoe UI';
  const rx = Math.max(radius * 1.2 + 8, label ? ctx.measureText(label).width / 2 + 6 : 0);
  const ry = radius + (label ? 25 : 8);
  const left = Math.max(0, Math.floor((x - rx) * ratioX));
  const right = Math.min(width, Math.ceil((x + rx) * ratioX));
  const top = Math.max(0, Math.floor((y - ry) * ratioY));
  const bottom = Math.min(height, Math.ceil((y + ry) * ratioY));
  if (left >= right || top >= bottom) return;
  const damage = {x: left, y: top, w: right - left, h: bottom - top};
  cache.presented.damage = damage;

  if (needsDetail) {
    // Filtered inspection changes the node itself. Replay just its affected area in layer order.
    ctx.save();
    ctx.beginPath();
    ctx.rect(left / ratioX, top / ratioY, damage.w / ratioX, damage.h / ratioY);
    ctx.clip();
    ctx.translate(left / ratioX, top / ratioY);
    drawScene(ctx, damage.w / ratioX, damage.h / ratioY, {
      ...drawing,
      camera: {...camera, ox: camera.ox - left / ratioX, oy: camera.oy - top / ratioY},
    }, inspected);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(x, y, radius + (pinned ? 4 : 2), 0, Math.PI * 2);
  ctx.strokeStyle = pinned
    ? getComputedStyle(canvas).getPropertyValue('--tree-selection').trim() || '#ffda9d'
    : '#f5e7c9';
  ctx.lineWidth = pinned ? 2.5 : 1.4;
  ctx.stroke();
}

function startLabel(data: TreeData, node: TreeNode) {
  return node.classStartIndex === undefined ? node.name :
    data.classes[node.classStartIndex]?.name ?? node.name;
}
function drawScene(ctx: CanvasRenderingContext2D, w: number, h: number, {
  data, list, nodes, selected, masteries, query, camera, highlight, sprite = noSprites,
}: TreeDrawing, current: TreeNode | undefined) {
  const {scale, ox, oy} = camera;
  const unit = scale * pixelsToTreeUnits;
  const background = sprite('background', 'Background2');
  let pattern = patterns.get(ctx);
  if (background && pattern?.image !== background.image) {
    const created = ctx.createPattern(background.image, 'repeat');
    if (created) {
      pattern = {image: background.image, pattern: created};
      patterns.set(ctx, pattern);
    }
  }
  ctx.fillStyle = '#0b1015';
  ctx.fillRect(0, 0, w, h);
  if (background && pattern) {
    const tileScale = Math.max(.9, unit);
    pattern.pattern.setTransform({a: tileScale, d: tileScale, e: ox, f: oy});
    ctx.fillStyle = pattern.pattern;
    ctx.fillRect(0, 0, w, h);
  }

  const {ids, groups, connections} = treeLayout(data, list, nodes);
  const notableGroups = new Set(list.filter(node => node.isNotable && selected.has(node.id))
    .map(node => node.group));
  for (const id of groups) {
    const group = data.groups[id];
    const art = sprite('groupBackground', group.background?.image);
    if (!art) continue;
    const x = group.x * scale + ox, y = group.y * scale + oy;
    const rx = art.w * unit / 2, ry = art.h * unit * (group.background?.isHalfImage ? 1 : .5);
    if (x + rx >= 0 && x - rx <= w && y + ry >= 0 && y - ry <= h) {
      centered(ctx, group.background?.isHalfImage ? completeGroup(art) : art, x, y, unit);
    }
  }

  for (const node of list) {
    const x = node.x * scale + ox, y = node.y * scale + oy;
    if (node.isAscendancyStart && node.ascendancyName) {
      const atlas = ascendancyAtlas(sprite, node.ascendancyName);
      centered(ctx, sprite(atlas, 'Classes' + node.ascendancyName) ?? sprite(atlas, 'ClassesAlternate'),
        x, y, unit);
    }
    if (node.isMastery && selected.has(node.id) && masteries[node.id]) {
      centered(ctx, sprite('masteryActiveEffect', node.activeEffectImage), x, y, unit);
    }
  }

  const q = query.trim().toLowerCase();
  const matches = (node: TreeNode) => {
    switch (highlight) {
      case 'search': return !!q && node.search.includes(q);
      case 'allocated': return selected.has(node.id);
      case 'unallocated': return !selected.has(node.id);
      case 'notables': return !!node.isNotable;
      case 'keystones': return !!node.isKeystone;
      case 'masteries': return !!node.isMastery;
      case 'jewels': return !!node.isJewelSocket;
      case 'starts': return !!isStart(node);
      default: return true;
    }
  };
  for (const edge of connections) {
    const on = selected.has(edge.a.id), otherOn = selected.has(edge.b.id);
    const alpha = highlight === 'all' ? 1 : matches(edge.a) || matches(edge.b) ? .76 : .18;
    drawConnection(ctx, sprite, edge, camera,
      on && otherOn ? 'Active' : on || otherOn ? 'Intermediate' : 'Normal', w, h, alpha);
  }

  for (const node of list) {
    const x = node.x * scale + ox, y = node.y * scale + oy, radius = nodeRadius(node, scale);
    const label = isStart(node) && (scale >= .08 || node === current);
    // Sprite edges and inspection labels can overhang their nominal hit area.
    const extent = Math.max(radius * 1.2 + 8, label ? 90 : 0);
    if (x + extent < 0 || x - extent > w ||
      y + radius + (label ? 25 : 8) < 0 || y - radius - 8 > h) continue;
    const match = matches(node), on = selected.has(node.id), inspected = node.id === current?.id;
    ctx.globalAlpha = match || inspected ? 1 : .22;
    let connected = !!node.isMastery && notableGroups.has(node.group);
    if (!on && !node.isMastery) {
      for (const id of node.links) {
        if (selected.has(id) && ids.has(id) && !nodes.get(id)?.isMastery) {
          connected = true;
          break;
        }
      }
    }
    if (!drawNode(ctx, sprite, node, x, y, unit, radius, on, connected, !!masteries[node.id],
      node.classStartIndex === undefined ? undefined : data.classes[node.classStartIndex]?.name)) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = on ? '#c69b54' : '#242a30';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#8e7b60';
      ctx.stroke();
    }
    if (label) {
      ctx.textAlign = 'center';
      ctx.font = '600 12px Segoe UI';
      ctx.fillStyle = '#f1dfbf';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.fillText(startLabel(data, node), x, y + radius + 14);
      ctx.shadowBlur = 0;
    }
    if (highlight !== 'all' && match && !inspected) {
      ctx.beginPath();
      ctx.arc(x, y, radius + 1, 0, Math.PI * 2);
      ctx.strokeStyle = '#efb35f';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}
