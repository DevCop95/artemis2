export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

export function smoothstep(amount) {
  const t = clamp(amount, 0, 1);
  return t * t * (3 - 2 * t);
}

export function getKeyframeVal(progress, keyframes) {
  if (!keyframes?.length) return undefined;
  if (progress <= keyframes[0][0]) return keyframes[0][1];

  let index = keyframes.length - 1;
  for (let i = keyframes.length - 1; i >= 0; i--) {
    if (progress >= keyframes[i][0]) {
      index = i;
      break;
    }
  }

  const first = keyframes[index];
  const second = keyframes[index + 1];
  if (!second) return first[1];

  const amount = smoothstep((progress - first[0]) / (second[0] - first[0]));
  const start = first[1];
  const end = second[1];

  if (typeof start === 'object' && start !== null) {
    return {
      x: lerp(start.x, end.x, amount),
      y: lerp(start.y, end.y, amount),
      z: lerp(start.z, end.z, amount),
      lx: start.lx !== undefined ? lerp(start.lx, end.lx, amount) : undefined,
      ly: start.ly !== undefined ? lerp(start.ly, end.ly, amount) : undefined,
      lz: start.lz !== undefined ? lerp(start.lz, end.lz, amount) : undefined,
    };
  }

  return lerp(start, end, amount);
}
