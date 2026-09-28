# Rotation Fix - Evidence-Based Decision

**Date:** Wednesday, September 16, 2026  
**Decision:** Reverted to OrbitControls based on user evidence

---

## Evidence from User

**User stated:** "its moving before adding the adjusting the body type"

**This means:**
- Rotation DID work originally with OrbitControls
- Rotation STOPPED working after CameraController was added
- OrbitControls DOES work on React Native (contrary to earlier assumption)

**Additional evidence:**
- Red banner shows touches: 123 (touch events captured)
- Console shows CameraController TypeScript error
- Model renders correctly, just doesn't rotate

---

## What Was Wrong

**False assumption:** OrbitControls doesn't work on React Native

**Actual problem:** 
- OrbitControls DOES work on React Native
- CameraController had implementation errors
- Replacing working code with broken code caused regression

---

## Action Taken

**Reverted to OrbitControls:**
- Removed CameraController import
- Restored OrbitControls with simple configuration
- No damping, no complex touch configuration
- Just basic rotate/zoom/pan enabled

---

## Next Test

### Please test now:

1. **Reload app** (shake device → Reload, or press `r` in terminal)
2. **Try dragging the model**
3. **Report:** Does it rotate now? (YES/NO)

### If it rotates:
✅ **Problem solved** - OrbitControls works, CameraController was unnecessary
- Focus shifts to bone scaling issue (only pelvis morphs)

### If it still doesn't rotate:
❌ **Something else changed** - Need to investigate what broke between "before" and "now"
- May need to check if other changes interfered with OrbitControls

---

## Lessons Learned

1. **User's memory matters** - "it was moving before" is critical evidence
2. **Don't assume library limitations** - OrbitControls CAN work on RN
3. **Simpler is better** - Basic OrbitControls > custom implementation
4. **Test changes incrementally** - Breaking change happened somewhere specific

---

**Status:** Awaiting user test after OrbitControls restoration
