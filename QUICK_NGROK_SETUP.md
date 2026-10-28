# Quick ngrok Setup (30 Seconds)

**Problem:** Expo Go on cellular data can't reach your backend  
**Solution:** ngrok tunnel

---

## 5 Commands

```powershell
# Terminal 1: Start backend
cd forgemind-backend
npm start

# Terminal 2: Start ngrok (get the https:// URL)
ngrok http 3000

# Edit .env.local with YOUR ngrok URL:
# EXPO_PUBLIC_API_URL=https://YOUR_URL_HERE.ngrok.io

# Terminal 3: Restart Metro with clear cache
cd forgemind-mobile
npx expo start -c

# Scan QR code from phone (WiFi OFF, use cellular)
```

---

## First Time Setup

1. **Download ngrok:** https://ngrok.com/download
2. **Extract to folder** (e.g. C:\ngrok\)
3. **Done!** (free tier works fine)

Optional: Sign up for longer sessions (8 hours vs 2 hours)

---

## Verify It Works

Check Metro logs for:
```
[api] backend base URL: https://abc123.ngrok.io (source: EXPO_PUBLIC_API_URL)
[api] health ping https://abc123.ngrok.io/health -> reachable in 234 ms
```

If "unreachable":
1. Check backend still running
2. Check ngrok still running
3. Check you copied the correct URL (with https://)
4. Check you restarted Metro with `-c` flag

---

## When Done Testing

```powershell
# Stop ngrok (Ctrl+C)
# Remove from .env.local:
# EXPO_PUBLIC_API_URL=

# Restart Metro
npx expo start -c
```

---

**Full details:** See `CELLULAR_TESTING_GUIDE.md`  
**Technical explanation:** See `CELLULAR_TEST_FIX_SUMMARY.md`
