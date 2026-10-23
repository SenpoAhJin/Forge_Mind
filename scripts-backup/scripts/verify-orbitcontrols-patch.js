/*
 * Regression test for patches/three-stdlib+2.36.1.patch
 *
 * The patch guards OrbitControls' two-finger touch handling. Without it,
 * getSecondPointerPosition() can return undefined and handleTouchMoveDolly()
 * dereferences it (`position.x`), crashing the 3D preview during a pinch.
 *
 * Run with:  npm run verify:orbitcontrols
 *
 * It exercises the real library from node_modules against a minimal DOM stub
 * that reproduces browser behaviour OrbitControls depends on:
 *   - canvas events bubble to ownerDocument (it binds pointermove/pointerup
 *     there, not on the canvas);
 *   - releasePointerCapture() throws NotFoundError for a pointer that is gone;
 *   - an exception inside a listener is reported but does not stop dispatch.
 */
'use strict';

const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OC = require(path.join(ROOT, 'node_modules/three-stdlib/controls/OrbitControls.cjs'));
const OrbitControls = OC.OrbitControls || OC.default || OC;
const THREE = require(path.join(ROOT, 'node_modules/three'));

let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (detail ? '  [' + detail + ']' : ''));
  if (!ok) failures++;
}

// ---------------------------------------------------------------- DOM stub --
const uncaught = [];

function makeEl(tag) {
  const listeners = {};
  return {
    tagName: tag,
    clientHeight: 800,
    clientWidth: 400,
    style: {},
    ownerDocument: null,
    activePointers: new Set(),
    addEventListener(t, fn) {
      (listeners[t] = listeners[t] || []).push(fn);
    },
    removeEventListener(t, fn) {
      const a = listeners[t];
      if (a) listeners[t] = a.filter((f) => f !== fn);
    },
    dispatchEvent(evt) {
      const e = Object.assign({}, evt, { target: this, currentTarget: this });
      for (const fn of (listeners[evt.type] || []).slice()) {
        try {
          fn(e);
        } catch (err) {
          uncaught.push(err);
        }
      }
      if (this.ownerDocument && this.ownerDocument !== this) {
        this.ownerDocument.dispatchEvent(evt);
      }
      return true;
    },
    setPointerCapture() {},
    releasePointerCapture(id) {
      if (!this.activePointers.has(id)) {
        const err = new Error(
          "Failed to execute 'releasePointerCapture' on 'Element': No active pointers with the given id is found."
        );
        err.name = 'NotFoundError';
        throw err;
      }
    },
  };
}

function ev(type, id, x, y, pointerType) {
  return {
    type,
    pointerId: id,
    pointerType: pointerType || 'touch',
    pageX: x,
    pageY: y,
    clientX: x,
    clientY: y,
    button: 0,
    buttons: 1,
    preventDefault() {},
    stopPropagation() {},
  };
}

// Mirrors the props used by src/components/Preview3D.tsx
function build() {
  const doc = makeEl('document');
  const canvas = makeEl('canvas');
  doc.ownerDocument = doc;
  canvas.ownerDocument = doc;
  const cam = new THREE.PerspectiveCamera(50, 0.5, 0.1, 100);
  cam.position.set(0, 0.2, 4);
  const c = new OrbitControls(cam, canvas);
  c.enableDamping = false;
  c.minDistance = 2.0;
  c.maxDistance = 6.0;
  c.enablePan = true;
  c.enableRotate = true;
  c.enableZoom = true;
  return { c, doc, canvas, cam };
}

const dist = (cam) => cam.position.length();

console.log('three-stdlib OrbitControls touch guard\n');

// 1. the exact reported crash: a compatibility mouse pointerdown is added to
//    `pointers` without ever getting a cached position, then a two-finger
//    touch dolly selects it as the second pointer.
{
  const { doc, canvas } = build();
  const from = uncaught.length;
  doc.dispatchEvent(ev('pointerup', 99, 55, 55));
  canvas.activePointers.add(99);
  canvas.dispatchEvent(ev('pointerdown', 99, 50, 50, 'mouse'));
  canvas.dispatchEvent(ev('pointercancel', 2, 280, 400));
  canvas.activePointers.add(3);
  canvas.dispatchEvent(ev('pointerdown', 3, 200, 400));
  canvas.dispatchEvent(ev('pointermove', 3, 200, 400));
  canvas.dispatchEvent(ev('pointermove', 1, 120, 400));
  canvas.dispatchEvent(ev('pointermove', 2, 280, 400));
  const typeErrors = uncaught.slice(from).filter((e) => e instanceof TypeError);
  check('reported crash (dolly with missing second pointer) is inert', typeErrors.length === 0,
    typeErrors.length ? typeErrors[0].message : '0 TypeErrors');
}

// 2. sibling fault: `pointers` shorter than two while still in a dolly state
{
  const { doc, canvas } = build();
  const from = uncaught.length;
  doc.dispatchEvent(ev('pointerup', 1, 110, 400));
  canvas.dispatchEvent(ev('pointercancel', 2, 280, 400));
  canvas.activePointers.add(3);
  canvas.dispatchEvent(ev('pointerdown', 3, 200, 400));
  canvas.dispatchEvent(ev('pointermove', 3, 200, 400));
  const typeErrors = uncaught.slice(from).filter((e) => e instanceof TypeError);
  check('sibling fault (pointers[1] undefined) is inert', typeErrors.length === 0,
    typeErrors.length ? typeErrors[0].message : '0 TypeErrors');
}

// 3-5. the guard must not break normal interaction
{
  const { c, doc, canvas, cam } = build();
  canvas.activePointers.add(1);
  canvas.dispatchEvent(ev('pointerdown', 1, 180, 400));
  canvas.activePointers.add(2);
  canvas.dispatchEvent(ev('pointerdown', 2, 220, 400));
  const before = dist(cam);
  canvas.dispatchEvent(ev('pointermove', 1, 100, 400));
  canvas.dispatchEvent(ev('pointermove', 2, 300, 400));
  canvas.dispatchEvent(ev('pointermove', 1, 60, 400));
  canvas.dispatchEvent(ev('pointermove', 2, 340, 400));
  c.update();
  check('pinch-out zooms in', dist(cam) < before, before.toFixed(3) + ' -> ' + dist(cam).toFixed(3));
}
{
  const { c, doc, canvas, cam } = build();
  canvas.activePointers.add(1);
  canvas.dispatchEvent(ev('pointerdown', 1, 60, 400));
  canvas.activePointers.add(2);
  canvas.dispatchEvent(ev('pointerdown', 2, 340, 400));
  const before = dist(cam);
  canvas.dispatchEvent(ev('pointermove', 1, 120, 400));
  canvas.dispatchEvent(ev('pointermove', 2, 280, 400));
  canvas.dispatchEvent(ev('pointermove', 1, 180, 400));
  canvas.dispatchEvent(ev('pointermove', 2, 220, 400));
  c.update();
  check('pinch-in zooms out', dist(cam) > before, before.toFixed(3) + ' -> ' + dist(cam).toFixed(3));
}
{
  const { c, doc, canvas, cam } = build();
  const p0 = cam.position.clone();
  canvas.activePointers.add(1);
  canvas.dispatchEvent(ev('pointerdown', 1, 200, 400));
  canvas.dispatchEvent(ev('pointermove', 1, 320, 400));
  c.update();
  check('one-finger drag rotates', p0.distanceTo(cam.position) > 0.01,
    'moved ' + p0.distanceTo(cam.position).toFixed(4));
}
{
  const { c, canvas, cam } = build();
  const before = dist(cam);
  canvas.dispatchEvent({ type: 'wheel', deltaY: -120, preventDefault() {}, stopPropagation() {} });
  c.update();
  check('wheel zoom works', dist(cam) < before, before.toFixed(3) + ' -> ' + dist(cam).toFixed(3));
}

// 6. after a degenerate frame, once fingers lift, dolly must work again --
//    the guard bails out of the bad frame, it does not disable the gesture.
{
  const { c, doc, canvas, cam } = build();
  doc.dispatchEvent(ev('pointerup', 99, 55, 55));
  canvas.activePointers.add(99);
  canvas.dispatchEvent(ev('pointerdown', 99, 50, 50, 'mouse'));
  canvas.dispatchEvent(ev('pointercancel', 2, 280, 400));
  canvas.activePointers.add(3);
  canvas.dispatchEvent(ev('pointerdown', 3, 200, 400));
  canvas.dispatchEvent(ev('pointermove', 3, 200, 400));
  canvas.dispatchEvent(ev('pointermove', 2, 280, 400));
  doc.dispatchEvent(ev('pointerup', 3, 200, 400));
  canvas.activePointers.delete(3);
  doc.dispatchEvent(ev('pointerup', 99, 50, 50));
  canvas.activePointers.delete(99);
  canvas.activePointers.add(4);
  canvas.dispatchEvent(ev('pointerdown', 4, 240, 400));
  canvas.activePointers.add(5);
  canvas.dispatchEvent(ev('pointerdown', 5, 260, 400));
  const before = dist(cam);
  canvas.dispatchEvent(ev('pointermove', 4, 200, 400));
  canvas.dispatchEvent(ev('pointermove', 5, 300, 400));
  c.update();
  check('pinch recovers after the bad frame', dist(cam) < before,
    before.toFixed(3) + ' -> ' + dist(cam).toFixed(3));
}

console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'));
process.exitCode = failures === 0 ? 0 : 1;
