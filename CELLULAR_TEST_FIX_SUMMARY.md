# Cellular Testing Issue - FIXED ✅

**Date:** 2026-10-19  
**Issue:** Expo Go on cellular data (outside WiFi) can't reach backend server  
**Status:** ✅ Diagnosed and Fixed

---

## Root Cause Analysis

### The Problem

When testing ForgeMind mobile app with Expo Go on cellular data (outside your home/school WiFi):

1. **Backend runs on your PC** at `192.168.254.168:3000` (local network IP)
2. **Cellular network is separate** from your home network — can't access 192.168.x.x addresses
3. **Your router doesn't expose the backend** to the internet (security feature)
4. **`.env.local` was set to `localhost:3000`** which the app correctly ignores on native devices (the auto-detection code works fine!)

### Why The Auto-Detection Didn't Help

The app has smart URL resolution (`src/config/api.ts`):

```typescript
// When you're on the SAME WiFi:
// Metro detects your PC's LAN IP (192.168.254.168)
// App uses: http://192.168.254.168:3000
// ✅ Works!

// When you're on CELLULAR data:
// Metro still detects 192.168.254.168
// App tries: http://192.168.254.168:3000
// ❌ Fails! (cellular network can't reach your home LAN)
```

**Cellular networks are isolated from your home LAN for security.** There's no routing path from your phone's cellular connection to your PC's `192.168.x.x` address.

---

## The Fix: Use ngrok

**ngrok** creates a secure tunnel from the internet to your local server.

### What It Does

```
[Your Phone (Cellular Data)]
        ↓
[Internet (any network)]
        ↓
[ngrok Cloud (ngrok.io)]
        ↓
[Secure Tunnel]
        ↓
[Your Backend (localhost:3000 on your PC)]
```

Your phone accesses `https://abc123.ngrok.io`, which tunnels to your local `localhost:3000`.

---

## Quick Start (5 Minutes)

### 1. Install ngrok
- Download: https://ngrok.com/download
- Extract to folder (e.g. `C:\ngrok\`)
- (Optional) Sign up for free account for longer sessions

### 2. Start Backend
```powershell
cd forgemind-backend
npm start
```

### 3. Start ngrok Tunnel
```powershell
ngrok http 3000
```

Copy the HTTPS URL shown (e.g. `https://abc123.ngrok.io`)

### 4. Configure Mobile App

Edit `forgemind-mobile/.env.local`:
```bash
EXPO_PUBLIC_API_URL=https://abc123.ngrok.io
```

### 5. Restart Metro
```powershell
cd forgemind-mobile
npx expo start -c
```

The `-c` clears cache (REQUIRED after changing env vars).

### 6. Test on Cellular

- Open Expo Go on your phone
- Turn OFF WiFi (use cellular data)
- Scan QR code
- ✅ App should now connect through ngrok tunnel!

---

## Files Changed

### 1. `CELLULAR_TESTING_GUIDE.md` (NEW)
Complete step-by-step guide with:
- ngrok installation instructions
- Troubleshooting section
- Alternative solutions (port forwarding)
- Security notes

### 2. `.env.local` (MODIFIED)
Removed hardcoded `localhost:3000`, added detailed comments explaining:
- Why localhost breaks cellular testing
- When to leave it empty (LAN testing)
- When to set it (cellular/external testing with ngrok)

### 3. `HOW_TO_TEST.md` (UPDATED)
Added notes about:
- Same WiFi requirement for Option B (Physical Device)
- Reference to `CELLULAR_TESTING_GUIDE.md` for external testing
- Known limitation #6 about cellular data

---

## Why This Solution

### ✅ Pros
- **No router configuration needed** (no port forwarding)
- **No public IP exposure** (ngrok handles security)
- **Works anywhere** (school, home, coffee shop, cellular)
- **Free tier available** (2-hour sessions, unlimited tunnels)
- **HTTPS included** (secure by default)

### ⚠️ Cons
- **Session expires** (free tier: 2 hours; auth'd free tier: 8 hours)
- **URL changes** on each restart (unless you pay for static domain)
- **Requires running process** (keep ngrok terminal open)

### Alternative: Port Forwarding
You could configure your router to forward port 3000 to your PC, but:
- More complex setup
- Exposes backend to entire internet (security risk)
- Requires static public IP (or dynamic DNS)
- Only works from your home network

**Verdict:** ngrok is better for development/testing.

---

## Testing Checklist

After setting up ngrok:

- [ ] Backend running on localhost:3000
- [ ] ngrok tunnel running (shows HTTPS URL)
- [ ] `.env.local` updated with ngrok URL
- [ ] Metro restarted with `-c` flag
- [ ] Phone on cellular data (WiFi OFF)
- [ ] Expo Go scans QR code
- [ ] Metro logs show: `[api] health ping https://abc123.ngrok.io/health -> reachable`
- [ ] App can login/register/fetch data

---

## When You're Done Testing

1. Stop ngrok (Ctrl+C)
2. Remove URL from `.env.local` (or comment it out)
3. Restart Metro

The app will go back to auto-detecting your LAN IP for same-WiFi testing.

---

## Technical Details (For Developers)

### The API URL Resolution Logic

From `src/config/apiBaseUrl.ts`:

```typescript
export function getApiBaseUrl(opts: ApiBaseUrlOptions = {}): { url: string; source: string } {
  const { platform = 'web', hostUri = '', windowLocationHost = '', envUrl = '' } = opts;
  const env = envUrl.trim();

  // (a) EXPO_PUBLIC_API_URL wins — EXCEPT localhost on native
  if (env !== '' && !(platform !== 'web' && isLoopbackHost(parseHost(env)))) {
    return { url: normalise(env), source: 'EXPO_PUBLIC_API_URL' };
  }

  // (b) Native: Use Metro's host (your PC's LAN IP)
  if (platform !== 'web') {
    const metroHost = parseHost(hostUri);
    if (metroHost !== '' && !isLoopbackHost(metroHost)) {
      return { url: `http://${metroHost}:${DEFAULT_API_PORT}`, source: 'Metro hostUri' };
    }
    // Fallbacks for emulator/simulator...
  }
  
  // (c) Web: Use window.location.hostname
  const host = windowLocationHost !== '' ? windowLocationHost : 'localhost';
  return { url: `http://${host}:${DEFAULT_API_PORT}`, source: 'window location' };
}
```

**The code correctly ignores `localhost` on native devices** — this is not a bug!

The issue is **Metro provides the LAN IP** (192.168.x.x) which is correct for same-WiFi testing but unreachable from cellular networks.

### Network Topology

**Same WiFi:**
```
Phone (WiFi) <---> Router <---> PC (Backend)
   192.168.254.X         192.168.254.168:3000
```
✅ Works - they're on the same network segment.

**Cellular Data:**
```
Phone (Cellular) <---> Cell Tower <---> ISP <---> Internet
                                              X (no route)
                                         Router <---> PC
                                            192.168.254.168:3000
```
❌ Fails - cellular network has no route to private 192.168.x.x addresses.

**With ngrok:**
```
Phone (Cellular) <---> Internet <---> ngrok.io <---> Tunnel <---> PC:3000
```
✅ Works - ngrok bridges the gap.

---

## Additional Notes

- **Flask AI (port 8080):** Same issue, same solution. Run `ngrok http 8080` in separate terminal and configure `FLASK_AI_URL` in backend's `.env`.
- **Production builds:** EAS builds can have hardcoded URLs set at build time via `eas.json` secrets.
- **Local network scanning:** The app could theoretically scan local IPs to find the backend, but that's slow, unreliable, and won't work on cellular anyway.

---

**Status: RESOLVED ✅**

The app's networking code is correct. The limitation is fundamental network topology. ngrok is the recommended solution for external testing.

---

**For detailed setup instructions, see:** `CELLULAR_TESTING_GUIDE.md`
