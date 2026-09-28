# 3D Preview crash on touch pinch/zoom — root cause and fix

**Status:** fixed and committed
**Affects:** every screen that shows the 3D body preview
**Fixed in:** `three-stdlib@2.36.1` via `patches/three-stdlib+2.36.1.patch`

---

## The reported crash

```
Uncaught Error: Cannot read property 'x' of undefined
  at handleTouchMoveDolly (node_modules/three-stdlib/controls/OrbitControls.cjs:596:40)
  const dx = event.pageX - position.x   <-- position is undefined here
Call stack: handleTouchMoveDolly -> handleTouchMoveDollyPan -> onTouchMove
            -> onPointerMove -> canvas.dispatchEvent -> handleTouch
            -> PanResponder.onPanResponderMove
```

---

## Root cause

`OrbitControls` keeps two parallel structures:

| Structure | Populated by | Purpose |
|---|---|---|
| `pointers` | `addPointer()`, called from `onPointerDown` for **every** pointer | which fingers are down |
| `pointerPositions` | `trackPointer()`, called only from `onTouchStart` / `onTouchMove` | cached page coords per finger |

**These two can get out of step, and the two-finger pinch code assumes they never will.**

`getSecondPointerPosition()` did no validation at all:

```js
function getSecondPointerPosition(event) {
  const pointer = event.pointerId === pointers[0].pointerId ? pointers[1] : pointers[0];
  return pointerPositions[pointer.pointerId];   // may be undefined
}
```

And `handleTouchMoveDolly()` was the **only** two-finger handler that used it without a guard —
the rotate and pan handlers both had a `pointers.length == 1` fallback, dolly did not:

| Handler | Guard before touching the second pointer? |
|---|---|
| `handleTouchMoveRotate` | yes — `if (pointers.length == 1) {…}` |
| `handleTouchMovePan` | yes — `if (pointers.length == 1) {…}` |
| `handleTouchMoveDolly` | **no** |

So a desync always crashed in the dolly path — which is why the stack always says
`handleTouchMoveDolly`, and why the gesture is always a pinch/zoom.

### How the two structures desync

`addPointer` is reached for **any** pointerdown, including a **compatibility mouse**
pointerdown (`pointerType === 'mouse'`). The mouse path calls `onMouseDown`, not
`onTouchStart`, so `trackPointer` never runs and that pointer ends up in `pointers`
**with no entry in `pointerPositions`**.

When a two-finger touch dolly is then active, `getSecondPointerPosition` can select that
position-less mouse pointer and return `undefined`:

```
down2 -> can2 -> down3 -> mv3 -> mmove -> up3 -> can1     (crash at :844, pointers[1])
mup -> mdown -> can2 -> down3 -> mv3 -> mv1b -> mv2b       (crash at :596, position.x)
```

Compat mouse events are emitted by Chrome/Android WebViews and hybrid devices, which is
also why this is reachable from Chrome DevTools mobile emulation.

The second signature (`:844`, `Cannot read property 'pointerId' of undefined`) is the same
defect: `pointers` holding fewer than two entries while the gesture is still in a dolly state.

### The stated theory was incomplete

The initial working theory was "one finger lifts mid-pinch, so the second touch is gone".
Testing showed a **clean** mid-pinch lift does **not** crash: `onPointerUp` removes the
pointer *and* resets `state = STATE.NONE` in the same call, so the next move falls through
to `state = NONE`. `pointercancel` is also handled (it is bound to `onPointerUp` at
`OrbitControls.cjs:305`). The crash needs the desync described above, not a clean lift.

---

## Why this could not be fixed upstream or in app code

| Option | Verdict |
|---|---|
| **Guard in our own touch handler** | **Not possible.** `src/` contains no `PanResponder` and no `dispatchEvent`; the `PanResponder` in the stack is React Native's internal responder system, and the events reach OrbitControls through expo-gl. There is no seam of ours between the touch and OrbitControls' internals. |
| **Upgrade `three-stdlib`** | **Not possible.** `2.36.1` is the newest published version and already satisfies drei's `^2.35.6`. |
| **Patch the vendored file only** | Rejected — lost on every `npm install`. |
| **`patch-package`** | **Chosen.** Patch is committed, re-applied by `postinstall`, reviewable in a diff, and removable when upstream fixes it. |

The identical unguarded code also exists in `three@0.170` itself
(`_handleTouchMoveDolly` / `_getSecondPointerPosition` in
`three/examples/jsm/controls/OrbitControls.js`), but drei uses `three-stdlib`, so
`three-stdlib` is the only place a patch has any effect.

---

## The fix

`getSecondPointerPosition()` now returns `null` instead of `undefined` when there is no
usable second pointer, and all three call sites bail out on `null`:

```js
function getSecondPointerPosition(event) {
  if (pointers.length < 2) return null;
  const pointer = event.pointerId === pointers[0].pointerId ? pointers[1] : pointers[0];
  if (pointer === void 0) return null;
  const position = pointerPositions[pointer.pointerId];
  return position === void 0 ? null : position;
}
```

```js
function handleTouchMoveDolly(event) {
  const position = getSecondPointerPosition(event);
  if (position === null) return;      // <-- added
  const dx = event.pageX - position.x;
  …
}
```

Bailing out of a single frame is the right behaviour: the gesture state is rebuilt on the
next `pointerdown`, and dolly starts from a fresh `dollyStart`, so nothing drifts.

The patch is applied to **both** build outputs — `OrbitControls.cjs` **and** `OrbitControls.js`.
This matters: `three-stdlib`'s `exports` map sends `import` to the ESM `.js`, which is what
Metro/Expo actually bundles. Patching only the `.cjs` would have left the device unfixed.

---

## How to verify

```bash
npm run verify:orbitcontrols
```

Drives the real patched library through the two crash sequences and the normal gestures.

---

## Which screens this covers

There is exactly **one** `OrbitControls` in the codebase — `src/components/Preview3D.tsx:159`.
Both entry points render that same shared scene, so the patch covers all of them:

| Screen | Path to the single OrbitControls |
|---|---|
| 3D Preview Test | `ProfileScreen` → `ProfileStackNavigator` (`Preview3DTest`) → `Preview3DTestScreen` → `Preview3D` |
| Project Dashboard 3D preview | `ProjectDashboardScreen:384` → `ThreeDPreview:46` → `Preview3D` |

No other screen uses `OrbitControls`; a repo-wide search for it returns only `Preview3D.tsx`.

---

## Removing the patch later

When a `three-stdlib` release fixes this upstream:

1. bump `three-stdlib`, then delete `patches/three-stdlib+<version>.patch`
2. re-run `npm run verify:orbitcontrols` — the crash checks must still pass against
   unpatched code
3. drop the `postinstall` script if no other patches remain

Consider filing it upstream: `npx patch-package three-stdlib --create-issue`
