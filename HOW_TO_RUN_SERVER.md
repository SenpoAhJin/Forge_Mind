# How to Run the ForgeMind Development Server

## Quick Start

### 1. Open Terminal in Project Directory
```bash
cd forgemind-mobile
```

### 2. Start the Development Server
```bash
npm start
```

That's it! The Expo development server will start and display a QR code.

---

## Full Setup Guide

### Prerequisites

Before running the server, ensure you have:

1. **Node.js** installed (v16 or higher)
   - Check: `node --version`
   - Download: https://nodejs.org/

2. **npm** (comes with Node.js)
   - Check: `npm --version`

3. **Expo Go** app on your mobile device
   - iOS: https://apps.apple.com/app/expo-go/id982107779
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent

### First Time Setup

If this is your first time running the project:

```bash
# Navigate to project directory
cd forgemind-mobile

# Install dependencies
npm install

# Start the server
npm start
```

---

## Running the Server

### Start Command
```bash
npm start
```

### What You'll See
```
Starting project at C:\...\forgemind-mobile
Starting Metro Bundler

▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
█ ▄▄▄▄▄ ██▄▄ ▀▀ █▄█ ▄▄▄▄▄ █
█ █   █ █▀▄  █▀▀▄▄█ █   █ █
█ █▄▄▄█ █▄▀ █▄█▄█▀█ █▄▄▄█ █
█▄▄▄▄▄▄▄█▄▀▄█ █ █ █▄▄▄▄▄▄▄█
(... QR code ...)

› Metro: exp://192.168.254.168:8081
› Web: http://localhost:8081
› Press ? │ show all commands
```

---

## Opening the App on Your Device

### Method 1: Scan QR Code (Recommended)
1. Open **Expo Go** app on your phone
2. Tap **"Scan QR code"**
3. Point camera at the QR code in the terminal
4. App will load automatically

### Method 2: Manual URL Entry
1. Open **Expo Go** app
2. Note the URL from terminal (e.g., `exp://192.168.254.168:8081`)
3. Enter it manually in Expo Go

### Method 3: Development Build
Press `s` in the terminal to switch to development build

---

## Common Commands

While the server is running, you can press:

| Key | Action |
|-----|--------|
| `a` | Open on Android device/emulator |
| `i` | Open on iOS simulator (Mac only) |
| `w` | Open in web browser |
| `r` | Reload app |
| `m` | Toggle menu |
| `?` | Show all commands |
| `Ctrl+C` | Stop the server |

---

## Troubleshooting

### Port Already in Use (8081)

**Error:**
```
Error: listen EADDRINUSE: address already in use :::8081
```

**Solution 1:** Kill the process using port 8081
```powershell
# Windows PowerShell
Get-NetTCPConnection -LocalPort 8081 | Select-Object -First 1 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

```bash
# Mac/Linux
lsof -ti:8081 | xargs kill -9
```

**Solution 2:** Use a different port
```bash
npm start -- --port 8082
```

### Can't Connect to Metro Server

**Check:**
1. Your phone and computer are on the **same Wi-Fi network**
2. Firewall isn't blocking port 8081
3. The IP address in terminal matches your computer's local IP

**Get your local IP:**
```powershell
# Windows
ipconfig
# Look for "IPv4 Address" under your Wi-Fi adapter
```

```bash
# Mac/Linux
ifconfig
# Look for "inet" under your Wi-Fi adapter
```

### App Won't Load / Stuck on Splash Screen

**Try:**
1. Press `r` in terminal to reload
2. Close Expo Go completely and reopen
3. Clear Metro bundler cache:
   ```bash
   npm start -- --clear
   ```

### Dependencies Out of Date

**Error:**
```
An update for expo is available: 57.0.22 → ~57.0.23
```

**Fix:**
```bash
npx expo install --check
npx expo install
```

---

## Development Workflow

### 1. Start Server
```bash
npm start
```

### 2. Make Code Changes
- Edit files in `src/` directory
- Server will auto-reload on save
- Changes appear in Expo Go automatically

### 3. View Debug Logs
- Check terminal for `console.log()` output
- Look for `[AuthService DEBUG]` logs during login/register
- Errors appear in red

### 4. Test on Device
- Use Expo Go for quick testing
- Physical device recommended over emulator

### 5. Stop Server
- Press `Ctrl+C` in terminal
- Or close the terminal window

---

## Quick Reference

### Start Server
```bash
npm start
```

### Stop Server
```
Ctrl+C
```

### Clear Cache and Restart
```bash
npm start -- --clear
```

### Install New Dependencies
```bash
npm install
```

### Check for Updates
```bash
npx expo install --check
```

---

## Server URLs

When the server is running:

| URL Type | Example | Use For |
|----------|---------|---------|
| **Metro** | `exp://192.168.254.168:8081` | Expo Go on same network |
| **Web** | `http://localhost:8081` | Web browser testing |
| **Tunnel** | `exp://abc123.tunnel.exp.direct` | Testing over internet (use `npx expo start --tunnel`) |

---

## Tips for Testing

### Testing Authentication Features (FE-4.5)
1. Start server: `npm start`
2. Open Expo Go and scan QR
3. Register a new account
4. **Check terminal for debug logs:**
   ```
   [AuthService DEBUG] Registration attempt:
     Email: alice@test.com
     Password: password123
     ...
   ```
5. Logout and login
6. **Check terminal for login debug logs**

### Testing Multiple Accounts
1. Register account 1 (e.g., Cosplayer)
2. Logout
3. Register account 2 (e.g., Organizer)
4. Logout
5. Switch between accounts by logging in

### Testing Persistence
1. Register and login
2. Force-quit Expo Go app
3. Reopen Expo Go
4. App should auto-login with last account

---

## Getting Help

### Check Logs
- Terminal shows all console output
- Red text = errors
- Yellow text = warnings
- Blue text = info

### Common Log Patterns
```
[AuthService DEBUG] Registration attempt:
[AuthService DEBUG] Login attempt:
[UserContext] Failed to load session:
ERROR: ...
```

### Still Stuck?
1. Clear cache: `npm start -- --clear`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Check Expo documentation: https://docs.expo.dev/
4. Search error message in terminal

---

## Environment Info

**Project:** ForgeMind Mobile App  
**Framework:** React Native + Expo  
**Expo SDK:** 57.0.0  
**Node Version:** v16+ required  
**Package Manager:** npm  

**Key Dependencies:**
- React Native 0.86.3
- Expo ~57.0.22
- React Navigation 7.x
- AsyncStorage (for authentication)

---

## Server is Ready! 🚀

Run `npm start` and scan the QR code with Expo Go to begin testing.

Happy coding! 🎉
