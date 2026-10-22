@AGENTS.md

## Magic Server Control Phrases

When the user's message is "arise" or contains the word "arise":

1. Run: `powershell -ExecutionPolicy Bypass -File "forgemind-mobile\scripts\start-all.ps1"`
2. Then run: `powershell -ExecutionPolicy Bypass -File "forgemind-mobile\scripts\check-services.ps1"`
3. Report the real UP or DOWN result for backend, Flask and Metro
4. Print the exp:// link and the backend health link

Never claim success without running the commands and showing their output.

When the user's message is "rest": run `forgemind-mobile\scripts\stop-all.ps1` and confirm ports 3000, 5000 and 8081 are free.

**Context**: These phrases control the ForgeMind backend (Node/Express), Flask AI service, and Metro bundler for remote testing via Tailscale. All services start first, then health checks run at the end (a failed check does not abort the script). See `docs/START_SERVER.md` for full documentation.
