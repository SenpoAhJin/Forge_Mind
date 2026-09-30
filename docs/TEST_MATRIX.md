# ForgeMind — Test Matrix & Platform Risk Audit

**Created:** Wednesday, September 30, 2026, 18:00
**Phase:** Phase 1 — planning only. No feature code, no schema, no stored data was changed.
**Companions:** `SCOPE.md` (scope, discrepancies, open questions) · `DATABASE.md` (target schema).

---

## 0. What was actually verified, and what was not

This section exists so no reader mistakes an audit for a test run.

| Thing | Status | Evidence |
|---|---|---|
| TypeScript compile | **PASS** | `npx tsc --noEmit` → exit 0, run 2026-09-30. It is the *only* executed verification in this phase. |
| iOS on a real device or simulator | **NOT TESTED** | no simulator, no device, no Expo Go session was opened |
| Android on a real device or emulator | **NOT TESTED** | same |
| Web in a browser | **NOT TESTED** | the dev server was never started |
| Automated tests | **none exist** | `package.json` has no `test` script; no `jest`/`vitest` config; no test files in `src/` |
| Platform-divergent code | **audited statically** | §2 and §3 are read-only code and config inspection, with file:line evidence |

**Every cell in §4 and §5 therefore reads `NOT TESTED (2026-09-30)`.** A cell may only become `PASS`
after someone runs that row on that platform and records the date. A green `tsc` says nothing about
layout, the keyboard, the camera, or WebGL — it is a type check, not a test run.

Phase 1 changed **no application code**, so a `PASS` here would only ever be a baseline for the
Phase 2 migration. The value of this document in Phase 1 is the risk register (§3) and the fact that
every row is honestly marked untested rather than assumed working.

---

## 1. Environment, verified from the repo on 2026-09-30

| Item | Value | Source |
|---|---|---|
| Expo SDK | `~57.0.22` | `package.json` |
| React Native | `0.86.3` | `package.json` |
| `expo-camera` | `~57.0.5` | `package.json` |
| `expo-image-picker` | `~57.0.18` | `package.json` |
| `expo-sharing` | `~57.0.21` | `package.json` |
| `expo-file-system` | `~57.0.7` | `package.json` |
| `expo-sqlite` | **not installed** | `package.json` — Phase 2, needs approval |
| `expo-notifications` | **not installed** | `package.json` — see `SCOPE.md` D-10 |
| `expo-secure-store` | **not installed** | see `DATABASE.md` §6.3 |
| `expo-splash-screen` | **not installed** | `app.json:9-13` sets a legacy `splash` block with no plugin behind it |
| `expo-dev-client` | **not installed** | so the app runs in Expo Go or via a bare prebuild, not a dev client |
| `react-native-webview` | `13.16.1`, **never imported** | see `SCOPE.md` D-16 |
| Orientation | `portrait` | `app.json:6` |
| Tablet support | `ios.supportsTablet: true` | `app.json:15` — enabled, but no layout adapts for it (§3 R-11) |
| Android back gesture | `predictiveBackGestureEnabled: false` | `app.json:23` |
| Backend URL | `EXPO_PUBLIC_API_URL=http://localhost:3000` | `.env.local:1` — see R-2 |
| Registered config plugins | `@react-native-community/datetimepicker`, `expo-sharing`, `expo-asset` | `app.json:28-40` |

**Platform-specific source files:** none. There is not a single `.ios.tsx`, `.android.tsx`,
`.native.tsx`, or `.web.tsx` in the project. Every platform difference is a runtime `Platform`
check, which is why §2 has to be exhaustive — there are no files to diff.

---

## 2. Platform-divergent code, complete inventory

Every `Platform.*` reference in `src/`, verified by search on 2026-09-30. There are **13** and no more.

| File:line | Code | iOS | Android |
|---|---|---|---|
| `components/inputs/DateInput.tsx:59` | `if (Platform.OS === 'android')` | — | clears `showPicker` on value change |
| `components/inputs/DateInput.tsx:74` | `if (Platform.OS === 'web')` | — | — (web branch) |
| `components/inputs/DateInput.tsx:130` | `display={Platform.OS === 'ios' ? 'spinner' : 'default'}` | inline wheel | floating dialog |
| `components/inputs/TimePickerInput.tsx:191` | `...Platform.select({...})` | `shadow*` styles | `elevation: 8` |
| `components/AppealModal.tsx:83` | `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}` | pad | shrink |
| `components/RejectionReasonModal.tsx:109` | same | pad | shrink |
| `screens/auth/LoginScreen.tsx:115-116` | same + `keyboardVerticalOffset={ios ? 64 : 0}` | pad, 64 | shrink, 0 |
| `screens/auth/RegisterScreen.tsx:169-170` | same + offset 64 | pad, 64 | shrink, 0 |
| `screens/onboarding/AccountCreationScreen.tsx:106-107` | same + offset 64 | pad, 64 | shrink, 0 |
| `screens/cosplayer/MarketplaceRegistrationScreen.tsx:170-171` | same + offset 64 | pad, 64 | shrink, 0 |
| `screens/dev/StaffRegistrationScreen.tsx:168-169` | same + offset 64 | pad, 64 | shrink, 0 |
| `screens/dev/HeadOrganizerRegistrationScreen.tsx:171-172` | same + offset 64 | pad, 64 | shrink, 0 |
| `screens/cosplayer/CreateListingScreen.tsx:207-208` | same + offset 90 | pad, 90 | shrink, 0 |
| `screens/cosplayer/MakeOfferScreen.tsx:239-240` | same + offset 90 | pad, 90 | shrink, 0 |
| `screens/cosplayer/ChatThreadScreen.tsx:302,306` | `if (ios \|\| android)`, `behavior={ios ? 'padding' : 'height'}` | pad, **offset 90 always** | shrink, **offset 90 always** |
| `screens/cosplayer/JoinInviteMeetupScreen.tsx:35` | `const cameraSupported = Platform.OS !== 'web'` | yes | yes |
| `screens/organizer/VerifyCosplayersScreen.tsx:755` | `fontFamily: ios ? 'Courier' : 'monospace'` | Courier | monospace |
| `services/AuthService.ts:172` | `platform: Platform.OS` in a payload | `'ios'` | `'android'` |
| `App.tsx:35` | `if (Platform.OS !== 'web')` — console patch | patched | patched |
| `App.tsx:116` | `if (Platform.OS === 'web')` | — | — (web branch) |
| `components/testing/PhoneFrame.tsx:41` | `if (Platform.OS !== 'web')` | — | — |
| `navigation/RootNavigator.tsx:56` | `SafeAreaView edges={['top']}` | top inset | top inset |

`Platform.Version` and `Platform.constants` are used **nowhere**. There is no OS-version
compatibility branch in the app.

**Safe area.** `SafeAreaProvider` is correctly mounted once at `App.tsx:74-112`. But
`SafeAreaView` / `useSafeAreaInsets` appear in exactly **two** files — `RootNavigator.tsx:56` and
`Preview3DTestScreen.tsx:36` — and `RootNavigator` uses `edges={['top']}`. Every other screen relies
on the native-stack header, which is correct for screens with a header, and wrong for the headerless
flows listed in R-4.

**Keyboard.** 26 screens contain a `TextInput`. 9 wrap one in a `KeyboardAvoidingView`
(verified by search). That leaves **17 form screens with a text input and no keyboard avoidance at
all** — enumerated in R-3.

**Dimensions.** `Dimensions.get('window')` appears twice: `RegistrationSuccessModal.tsx:40` and
`components/testing/PhoneFrame.tsx:46`. No `useWindowDimensions` and no resize listener anywhere, so
neither component re-lays-out on rotation or on an iPad split-view resize.

**Fonts.** `fontFamily` appears four times. Only `VerifyCosplayersScreen.tsx:755` branches on
platform; the other three hardcode `'monospace'`
(`Preview3DTestScreen.tsx:226`, `DiagnosticsScreen.tsx:104,116`). `src/theme/typography.ts` claims an
Inter-based scale but defines no `fontFamily`, and nothing sets `allowFontScaling`,
`maxFontSizeMultiplier`, or Android `includeFontPadding`.

---

## 3. Risk register

Severity is about user-visible breakage on a real device, not code smell. **P0** = a core flow
breaks on a whole platform class. **P1** = breaks in a plausible real configuration. **P2** = visual
or polish defect. **P3** = latent, only bites on hardware the app never claimed.

| # | Risk | Sev | Platforms | Evidence | Why it matters |
|---|---|---|---|---|---|
| **R-1** | `expo-camera` and `expo-image-picker` ship config plugins that are **not registered** in `app.json` | **P0** | iOS, Android | `app.json:28-40` lists only datetimepicker, sharing, asset; both packages have an `app.plugin.js` that injects `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSPhotoLibraryAddUsageDescription`, `android.permission.CAMERA`, `android.permission.RECORD_AUDIO` | In **Expo Go these modules work**, because the Expo Go binary already contains the permissions. In any prebuilt or store build, iOS **terminates the app** the moment `JoinInviteMeetupScreen` (QR scan) or any of the three image pickers requests a permission with no usage string. Android has no `CAMERA` permission declared at all, so the QR scanner cannot work. This is invisible until the app leaves Expo Go. |
| **R-2** | Backend base URL is `http://localhost:3000` | **P0** | Android | `.env.local:1` | An Android emulator resolves `localhost` to the *emulator itself*, not the host. Every auth call fails. The iOS simulator shares the host loopback and works, so this passes on iOS and fails on Android — the worst possible asymmetry. Needs `10.0.2.2` for emulators, or the LAN IP for a physical device. |
| **R-3** | 17 form screens have a `TextInput` and no `KeyboardAvoidingView` | **P0** | Android especially | the 17 are in §4 rows 3-4 and §5 | On Android with edge-to-edge and gesture navigation (default on RN `0.86.3` / Android 15), a focused field near the bottom of the screen can sit under the keyboard with no way to scroll it into view. `app.json` sets neither `android.edgeToEdgeEnabled` nor `android.softwareKeyboardLayoutMode`, so the default applies. Additionally none of the 17 set `keyboardShouldPersistTaps`, so on Android the first tap on a submit button while the keyboard is open only dismisses the keyboard. |
| **R-4** | Headerless flows have no safe-area inset | **P1** | iOS, Android | `RootNavigator.tsx:56` uses `edges={['top']}`; `AuthNavigator` / `OnboardingNavigator` use plain `View` containers | Login and Account Creation sit under the notch on iOS and under the status bar on Android. The bottom is worse: a keyboard with no `edges={['bottom']}` anywhere means nothing in the app compensates for the home indicator or the gesture pill. |
| **R-5** | iOS `DateInput` spinner has no dismiss path | **P1** | iOS | `DateInput.tsx:130` sets `display='spinner'`; the only clear of `showPicker` on iOS is `onDismiss` (`:64-67`), and an inline spinner fires no dismiss event | On iOS the ~216pt wheel stays permanently expanded inside the form's `ScrollView` after a single tap, displacing every field below it. `showPicker` is only cleared in `onValueChange` under `Platform.OS === 'android'` (`:59-61`). This affects **12 call sites**: `AddLogisticsEntryScreen:160,172`, `CalendarManageScreen:230,235`, `CreateEventScreen:186,201`, `LogisticsEntryDetailScreen:268`, `CreateProjectScreen:126,133`, `CreateInviteMeetupScreen:147`, `EventMeetupsScreen:288`, `ItemConfirmationScreen:162`, `OwnedItemDetail:203`, `ProjectDashboardScreen:327`. |
| **R-6** | Android `DateInput` uses a floating dialog where iOS uses inline | **P1** | Android | `DateInput.tsx:130` | Same form, completely different layout rhythm. Any bottom-anchored action button is covered by the dialog on Android and pushed down on iOS. There is no single layout that is correct on both. |
| **R-7** | `keyboardVerticalOffset` of 64 / 90 is an unmeasured magic number | **P1** | iOS | 8 screens pass `ios ? 64 : 0` or `ios ? 90 : 0`; none measures a header | The offsets do not correspond to any real header height, so they are wrong on a notched device and a non-notched device alike, in opposite directions. |
| **R-8** | `ChatThreadScreen` applies offset 90 on **both** platforms | **P1** | Android | `ChatThreadScreen.tsx:306-307`: `behavior` branches on platform but `keyboardVerticalOffset={90}` does not | On Android `behavior='height'` already shrinks the container to the keyboard, and then 90pt is subtracted again. The input bar is pushed ~90pt too high. This is the only native-only KAV in the app and the only screen with an input bar above a list, which makes it the highest-value Android keyboard test. |
| **R-9** | `LoginScreen` wraps a non-scrolling `View` in a KAV | **P1** | iOS | `LoginScreen.tsx:113-194` | With the keyboard open on a small phone, the password field and the submit button can be pushed off-screen with no scroll container to recover them. `RegisterScreen` and the other form screens wrap a `ScrollView`; this one does not. |
| **R-10** | "Save to Gallery" writes nothing, and the Android share sheet is gated off | **P1** | iOS, Android | `ShareableCardScreen.tsx:12` imports `expo-file-system` and never calls it | The gallery button is a no-op on both platforms. The share button calls `Sharing.isAvailableAsync()`, which returns **false on Android**, and the screen silently does nothing on the failure path. The Shareable card is a `PLAN P1` deliverable. |
| **R-11** | `ios.supportsTablet: true` with no adaptive layout | **P2** | iOS, Android | `app.json:15`; no `useWindowDimensions` anywhere; `TimePickerInput.tsx:107` reads `Dimensions.get('window')` at **module scope** | On an iPad the fixed `maxWidth: 400` / `maxHeight: 500` sheet is sized against a value frozen at import time, so it will not follow a split-view resize or an orientation change. Nothing in the app is verified on a tablet. |
| **R-12** | `console.log` / `console.warn` are monkey-patched away on native | **P2** | iOS, Android | `App.tsx:35-53`, filtering `pixelStorei`, `EXGL`, `WEBGL_lose_context`, `WebGLRenderer` | A genuine `expo-gl` context-loss error on a specific device is silently discarded in production, so a platform-specific 3D crash is undiagnosable from device logs. Any 3D failure must be reproduced in a dev build with this patch neutralised. The `DebugLogger` banner at `App.tsx:60-70` also prints mojibake (`������`) in its own frame characters. |
| **R-13** | `TimePickerInput` shadow is clipped on Android | **P2** | Android | `TimePickerInput.tsx:191-202` combines `Platform.select` `elevation: 8` with `overflow: 'hidden'` + `borderRadius` on the same style | Android `elevation` cannot render a soft shadow inside a clipping container, so the popover gets a hard edge on Android and a soft shadow on iOS. |
| **R-14** | Five stale compiled `.js` artifacts sit beside their `.ts` sources | **P3** | both (build hygiene) | `src/types/events.js`, `types/logistics.js`, `types/organizer.js`, `utils/dateHelpers.js`, `utils/logisticsRules.js` | These are old CommonJS build output. `utils/dateHelpers.js` has no `formatCountdown` and `utils/logisticsRules.js` has no `formatMissingFieldName`, while both `.ts` files do — so they are demonstrably out of date. Metro resolves `.ts` ahead of `.js` and no import in `src/` names a `.js` path explicitly, so the `.ts` wins at runtime and this is **not** a live bug. It matters because `expo/tsconfig.base.json` sets `"allowJs": true`, so these files are inside the TypeScript program and a future `checkJs` would surface them as errors. |
| **R-15** | No `Platform.Version` branch anywhere | **P3** | both | verified: zero matches | Nothing in the app adapts to an OS version. Acceptable today, but it means a future SDK 58/57 API change has no compatibility gate. |
| **R-16** | Font scaling is uncontrolled | **P3** | both | `src/theme/typography.ts` fixes `lineHeight`; no `allowFontScaling`/`maxFontSizeMultiplier`; no Android `includeFontPadding` override | At large accessibility text sizes, fixed line heights clip. Android's default font padding also shifts the one platform-branching font line (`VerifyCosplayersScreen.tsx:755`) vertically relative to the system-font labels around it. |

---

## 4. Test matrix

**Cell format:** `PASS` / `FAIL` / `NOT TESTED` plus the date it was run. Current state for every row:
`NOT TESTED (2026-09-30)`. Priority P0 first.

| # | Pri | Test | Where | iOS | Android | Web |
|---|---|---|---|---|---|---|
| 1 | **P0** | `expo prebuild` produces an `Info.plist` containing `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSPhotoLibraryAddUsageDescription` | R-1, `app.json:28-40` | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) | n/a — web has no permission model |
| 2 | **P0** | Prebuilt Android manifest declares `android.permission.CAMERA` and the barcode-scanner meta-data | R-1 | n/a | NOT TESTED (2026-09-30) | n/a |
| 3 | **P0** | QR scan end-to-end in **Expo Go** and in a **prebuilt build** | R-1, `JoinInviteMeetupScreen:166-180` | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) | n/a — `cameraSupported` is false |
| 4 | **P0** | Register → login → load profile reaches the backend | R-2, `.env.local:1` | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) |
| 5 | **P0** | Focus the last field of each of the 17 no-KAV forms; confirm it scrolls above the keyboard | R-3 | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) |
| 6 | **P0** | With the keyboard open, tap a submit button: does the first tap submit or only dismiss the keyboard? | R-3, `keyboardShouldPersistTaps` | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) |
| 7 | **P0** | `DateInput`: open, pick, confirm — does the picker close and does the form reflow correctly? | R-5, R-6, 12 call sites | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) |
| 8 | **P0** | Keyboard avoidance on the 8 KAV screens: last field + submit reachable | R-7, `offset 64/90` | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) |
| 9 | P1 | Chat: type and send with the keyboard open; input bar position and list scroll | R-8, `ChatThreadScreen:302-310` | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) |
| 10 | P1 | Login on the smallest supported phone: password + submit visible with the keyboard open | R-9, `LoginScreen:113-194` | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) |
| 11 | P1 | Shareable card: share sheet receives a rendered image; Save to Gallery writes a file | R-10, `ShareableCardScreen:113-151` | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) |
| 12 | P1 | Image pickers: grant, deny, and cancel paths (diary, photo entry, portfolio) | R-1 | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) |
| 13 | P1 | Safe area: Login, Account Creation, and every headerless flow are clear of the notch and the home indicator | R-4 | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) | n/a |
| 14 | P1 | Bottom tab bar not overlapped by the gesture pill or the 3-button nav bar | R-4 | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) |
| 15 | P1 | Appeal and Rejection modals: the multiline reason field is visible with the keyboard open | R-7, `AppealModal:81`, `RejectionReasonModal:107` | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) | n/a |
| 16 | P1 | 3D preview: orbit by drag, pinch to zoom, and scroll the parent list without the gesture being stolen | `ProjectDashboardScreen:375-389`, `Preview3DTestScreen:36` | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) |
| 17 | P1 | 3D models load on a low-end device (2.54 MB of GLB bundled into the binary) | `IN-34`, R-12 | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) |
| 18 | P1 | Notifications: reminders appear in-app; nothing is expected when the app is closed | `SCOPE.md` D-10 | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) |
| 19 | P2 | `TimePickerInput` popover: sizing on a small phone and a large phone | R-11, `TimePickerInput:107` | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) |
| 20 | P2 | Referral code renders in Courier vs monospace and sits on the baseline of adjacent labels | R-16, `VerifyCosplayersScreen:755` | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) |
| 21 | P2 | Accessibility text scaling to 200%: no clipped text, no overlapping controls | R-16 | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) |
| 22 | P2 | `console` patch: confirm a WebGL context-loss error is visible in a dev build | R-12, `App.tsx:35-53` | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) | n/a — patch is native-only |
| 23 | P3 | iPad split-view resize: registration success modal re-lays-out | R-11, `RegistrationSuccessModal:40` | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) |
| 24 | P3 | Rotation is locked to portrait; confirm no screen assumes landscape | `app.json:6` | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) | NOT TESTED (2026-09-30) |
| 25 | — | `npx tsc --noEmit` (the only executed check in Phase 1) | whole app | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE |

**Row 25 result: `PASS (2026-09-30)`, exit 0.** It is recorded as not-applicable per platform
because a type check is platform-independent, and it is called out here precisely so it is not
mistaken for device verification.

---

## 5. Per-screen platform matrix

Every screen with a `TextInput`, and whether it has keyboard avoidance. "no KAV" rows are R-3.

| Screen | KAV | Offset | Risk |
|---|---|---|---|
| `screens/auth/LoginScreen.tsx` | yes | ios 64 | **R-9** — KAV wraps a non-scrolling `View` |
| `screens/auth/RegisterScreen.tsx` | yes | ios 64 | R-7 |
| `screens/onboarding/AccountCreationScreen.tsx` | yes | ios 64 | R-7, R-4 (headerless) |
| `screens/cosplayer/MarketplaceRegistrationScreen.tsx` | yes | ios 64 | R-7 |
| `screens/dev/StaffRegistrationScreen.tsx` | yes | ios 64 | R-7 |
| `screens/dev/HeadOrganizerRegistrationScreen.tsx` | yes | ios 64 | R-7 |
| `screens/cosplayer/CreateListingScreen.tsx` | yes | ios 90 | R-7 |
| `screens/cosplayer/MakeOfferScreen.tsx` | yes | ios 90 | R-7 |
| `screens/cosplayer/ChatThreadScreen.tsx` | yes | **90 on both** | **R-8** |
| `screens/cosplayer/CharacterBrowseScreen.tsx` | **no** | — | R-3 |
| `screens/cosplayer/CreateInviteMeetupScreen.tsx` | **no** | — | R-3, R-5 (`DateInput` at `:147`) |
| `screens/cosplayer/CreateProjectScreen.tsx` | **no** | — | R-3, R-5 (`:126,133`) |
| `screens/cosplayer/EventMeetupsScreen.tsx` | **no** | — | R-3, R-5 (`:288`) |
| `screens/cosplayer/ItemConfirmationScreen.tsx` | **no** | — | R-3, R-5 (`:162`) |
| `screens/cosplayer/JoinInviteMeetupScreen.tsx` | **no** | — | R-3, R-1 (camera) |
| `screens/cosplayer/OwnedItemDetail.tsx` | **no** | — | R-3, R-5 (`:203`) |
| `screens/cosplayer/ProjectDashboardScreen.tsx` | **no** | — | R-3, R-5 (`:327`), 3D (R-12) |
| `screens/organizer/AddLogisticsEntryScreen.tsx` | **no** | — | R-3, R-5 (`:160,172`) |
| `screens/organizer/CalendarApprovalScreen.tsx` | **no** | — | R-3 |
| `screens/organizer/CalendarManageScreen.tsx` | **no** | — | R-3, R-5 (`:230,235`) |
| `screens/organizer/ContestManageScreen.tsx` | **no** | — | R-3 |
| `screens/organizer/CreateEventScreen.tsx` | **no** | — | R-3, R-5 (`:186,201`) |
| `screens/organizer/LogisticsEntryDetailScreen.tsx` | **no** | — | R-3, R-5 (`:268`) |
| `screens/organizer/RequestOrganizerAccessScreen.tsx` | **no** | — | R-3 |
| `screens/organizer/VerifyCosplayersScreen.tsx` | **no** | — | R-3, R-16 |
| `screens/shared/ComponentShowcaseScreen.tsx` | **no** | — | R-3 (dev screen) |

**9 with KAV, 17 without, 26 total** — verified by search, not estimated.

Screens with **no** `TextInput` but real platform exposure: `navigation/RootNavigator.tsx` (R-4),
`components/ShareableCardScreen` / `screens/shared/ShareableCardScreen.tsx` (R-10),
`components/Preview3D.tsx` and `screens/Preview3DTestScreen.tsx` (R-11, R-12, R-14),
`components/RegistrationSuccessModal.tsx` (R-11), `screens/shared/DiagnosticsScreen.tsx` (R-16).

---

## 6. How to run these tests

Prerequisites, and two traps that will otherwise waste an afternoon.

1. **Backend reachability (R-2).** `.env.local` must not be `localhost` for anything but the iOS
   simulator. Use `http://10.0.2.2:3000` for an Android emulator, or the machine's LAN IP for a
   physical device. Start `forgemind-backend` first and confirm `GET /health` from the device's own
   browser.
2. **Expo Go vs a real build (R-1).** Every native module here works in Expo Go. R-1 is *invisible*
   in Expo Go and appears only after `npx expo prebuild` or a store build. A matrix run in Expo Go
   alone cannot clear rows 1-3. Running in Expo Go is still useful for rows 4-24.
3. `npx expo start`, then `npx tsc --noEmit` for the type check.
4. Minimum device set suggested by the risks: one small iPhone (notch, 3-button-equivalent
   keyboard), one current iPhone, one small Android with gesture navigation, one Android with
   3-button navigation. Row 23 needs an iPad.

---

## 7. Test matrix status declaration

- **iOS: NOT TESTED (2026-09-30).** No simulator and no physical device were used.
- **Android: NOT TESTED (2026-09-30).** No emulator and no physical device were used.
- **Web: NOT TESTED (2026-09-30).** The dev server was never started and no browser was opened.
- **TypeScript compile: PASS (2026-09-30)**, `npx tsc --noEmit`, exit 0. This is a compiler check,
  not a runtime test, and it is recorded separately for exactly that reason.
- **Automated tests: none exist.** No `test` script, no runner configured, no test files.

No historical or web-only result was carried forward as a current pass. Nothing in this document is
marked `PASS` on the strength of an earlier session's claim.
