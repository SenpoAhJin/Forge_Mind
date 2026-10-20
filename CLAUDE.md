@AGENTS.md

## Magic Server Control Phrases

When the user's message contains the trigger phrase **"FORGE AWAKE"** (case-insensitive):

1. Run `scripts\start-all.ps1` to start all ForgeMind services
2. Run `scripts\check-services.ps1` to verify service status
3. Report the real results from both scripts
4. Include the Expo Go URL: `exp://<laptop-tailscale-ip>:8081`
5. Include the backend health check URL: `http://<laptop-tailscale-ip>:3000/health`

When the user's message contains the stop phrase **"forge sleep"** (case-insensitive):

1. Run `scripts\stop-all.ps1` to stop all services
2. Report the results

**Important**: Always execute the scripts and report real output. Do not skip execution or fabricate results. If a health check fails, report the failure explicitly.

**Context**: These phrases control the ForgeMind backend (Node/Express), Flask AI service, and Metro bundler for remote testing via Tailscale. See `docs/START_SERVER.md` for full documentation.
