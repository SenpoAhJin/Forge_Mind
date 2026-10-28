# Testing ForgeMind on Cellular Data (Outside WiFi)

## The Problem

When testing with Expo Go on cellular data (outside your home/school WiFi), the app cannot reach your backend server because:

1. **Your backend is on your local network** (192.168.x.x)
2. **Cellular networks can't access local networks** (they're separate networks)
3. **Your home router doesn't expose the server to the internet** (no port forwarding)

## The Solution: Use ngrok (Recommended)

**ngrok** creates a secure tunnel from the internet to your local server. It's free, easy, and perfect for testing.

### Step-by-Step Setup

#### 1. Install ngrok

**Option A: Download from website**
- Go to: https://ngrok.com/download
- Download for Windows
- Extract `ngrok.exe` to a folder (e.g. `C:\ngrok\`)
- Add to PATH or run from that folder

**Option B: Install with Chocolatey** (if you have it)
```powershell
choco install ngrok
```

#### 2. Sign up (Optional but Recommended)

Free tier is fine:
- Go to: https://dashboard.ngrok.com/signup
- Sign up with email
- Get your auth token
- Run: `ngrok config add-authtoken YOUR_TOKEN`

#### 3. Start Your Backend

Make sure your backend is running on port 3000:

```powershell
cd "c:\Users\Alord\OneDrive\Documents\School\MOR\Concept\ACCEPTED COSPLAY CONTENTS\CosForge_System - Copy\forgemind-backend"
npm start
```

Verify it shows:
```
phone / LAN:  http://192.168.254.168:3000
this PC:      http://localhost:3000
```

#### 4. Start ngrok Tunnel

Open a **NEW PowerShell window** (keep backend running in the first):

```powershell
ngrok http 3000
```

You'll see output like:
```
Session Status                online
Account                       Your Name (Plan: Free)
Forwarding                    https://abc123.ngrok.io -> http://localhost:3000
```

**COPY** the `https://abc123.ngrok.io` URL (your URL will be different).

#### 5. Configure Mobile App

Edit `.env.local` in the mobile repo:

```bash
EXPO_PUBLIC_API_URL=https://abc123.ngrok.io
```

**IMPORTANT:** Replace `abc123` with YOUR actual ngrok subdomain.

#### 6. Restart Metro with Clear Cache

```powershell
cd "c:\Users\Alord\OneDrive\Documents\School\MOR\Concept\ACCEPTED COSPLAY CONTENTS\CosForge_System - Copy\forgemind-mobile"
npx expo start -c
```

The `-c` flag clears the cache (REQUIRED after changing environment variables).

#### 7. Scan QR Code from Phone

- Open Expo Go app on your phone
- Use cellular data (turn OFF WiFi)
- Scan the QR code from Metro
- App should now connect to your backend through ngrok tunnel

### Verify It Works

Check the Metro logs for:
```
[api] backend base URL: https://abc123.ngrok.io (source: EXPO_PUBLIC_API_URL; platform: ios)
[api] health ping https://abc123.ngrok.io/health -> reachable in 234 ms
```

If you see "unreachable", check:
1. Backend is still running
2. ngrok tunnel is still running
3. You used the correct ngrok URL in `.env.local`
4. You restarted Metro with `-c` flag

---

## Alternative: Start Flask AI with Separate Tunnel

If your app also needs the Flask AI service (port 8080):

**Terminal 1:** Backend
```powershell
cd forgemind-backend
npm start
```

**Terminal 2:** Flask
```powershell
cd forgemind-ai
python -m flask run --host=0.0.0.0 --port=8080
```

**Terminal 3:** Backend tunnel
```powershell
ngrok http 3000
```

**Terminal 4:** Flask tunnel
```powershell
ngrok http 8080
```

Then configure both URLs in backend's `.env`:
```
# In forgemind-backend/.env
FLASK_AI_URL=https://xyz789.ngrok.io
```

---

## Troubleshooting

### Problem: "ngrok not found"
- **Fix:** Add `ngrok.exe` folder to PATH or use full path: `C:\ngrok\ngrok.exe http 3000`

### Problem: "Session Expired" after 2 hours
- **Fix:** Free tier sessions expire after 2 hours. Just restart ngrok (you'll get a new URL).
- **Better Fix:** Sign up for free account (extends to 8 hours).

### Problem: Health ping still shows "unreachable"
- **Check 1:** Backend is running (visit http://localhost:3000/health in browser)
- **Check 2:** ngrok shows "200 OK" in its terminal when you hit the endpoint
- **Check 3:** You restarted Metro after changing .env.local
- **Check 4:** Phone has cellular data enabled (WiFi OFF)

### Problem: ngrok URL changes every restart
- **Fix:** Free tier gives random URLs. Paid plans ($8/month) give static domains.
- **Workaround:** Just update `.env.local` each time and restart Metro.

### Problem: CORS errors
- **Fix:** Your backend already handles CORS for private LAN hosts. ngrok.io is public, so add it to the allowlist:
  
  In `forgemind-backend/.env`:
  ```
  ALLOWED_ORIGINS=https://abc123.ngrok.io
  ```
  
  Restart backend.

---

## When You're Done Testing

1. **Stop ngrok** (Ctrl+C in its terminal)
2. **Remove the URL** from `.env.local`:
   ```bash
   # EXPO_PUBLIC_API_URL=
   ```
3. **Restart Metro** to go back to auto-detection for LAN testing

---

## Why This Works

```
[Your Phone (Cellular)] 
       ↓
[Internet] 
       ↓
[ngrok Cloud (ngrok.io)] 
       ↓
[ngrok Tunnel (on your PC)] 
       ↓
[Your Backend (localhost:3000)]
```

ngrok creates a secure HTTPS tunnel from the internet to your local server, so your phone on cellular can reach it through the public ngrok URL.

---

## Alternative Solution: Port Forwarding (Advanced)

If you don't want to use ngrok, you can configure your router to forward port 3000 to your PC. This is more complex and less secure:

1. Find your router admin page (usually 192.168.1.1 or 192.168.254.1)
2. Enable Port Forwarding
3. Forward external port 3000 → your PC's local IP (192.168.254.168) → port 3000
4. Find your public IP: `curl.exe ifconfig.me`
5. Use that IP in `.env.local`: `EXPO_PUBLIC_API_URL=http://YOUR_PUBLIC_IP:3000`

**Security Warning:** This exposes your backend to the entire internet. Use ngrok instead for testing.

---

**Ready to test?** Follow steps 1-7 above and you'll be testing on cellular data in under 5 minutes!
