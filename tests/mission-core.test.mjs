import test from 'node:test';
import assert from 'node:assert/strict';
import { clamp, getKeyframeVal, lerp, smoothstep } from '../mission-core.mjs';

test('clamp mantiene el progreso dentro del rango', () => {
  assert.equal(clamp(-4, 0, 100), 0);
  assert.equal(clamp(42, 0, 100), 42);
  assert.equal(clamp(140, 0, 100), 100);
});

test('lerp y smoothstep interpolan sin overshoot', () => {
  assert.equal(lerp(0, 10, 0.5), 5);
  assert.equal(smoothstep(0), 0);
  assert.equal(smoothstep(1), 1);
  assert.ok(smoothstep(0.5) > 0 && smoothstep(0.5) < 1);
});

test('getKeyframeVal respeta límites e interpola objetos', () => {
  const keyframes = [
    [0, { x: 0, y: 10, z: 0 }],
    [10, { x: 100, y: 20, z: -50 }],
  ];

  assert.deepEqual(getKeyframeVal(-5, keyframes), keyframes[0][1]);
  assert.deepEqual(getKeyframeVal(20, keyframes), keyframes[1][1]);

  const middle = getKeyframeVal(5, keyframes);
  assert.ok(middle.x > 0 && middle.x < 100);
  assert.ok(middle.y > 10 && middle.y < 20);
  assert.ok(middle.z < 0 && middle.z > -50);
});
