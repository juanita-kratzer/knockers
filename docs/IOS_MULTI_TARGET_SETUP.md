# iOS multi-target setup

This document describes the multi-target Xcode setup for Knockers so you can build and archive **App (Prod)**, **Knockers-Dev**, and **Knockers-Staging** without manually changing settings.

---

## 1. What was changed

### Files created

| Path | Purpose |
|------|--------|
| `ios/App/App/Config/Info-Dev.plist` | Info.plist for Dev (display name "Knockers Dev") |
| `ios/App/App/Config/Info-Staging.plist` | Info.plist for Staging (display name "Knockers Staging") |
| `ios/App/App/Config/App.entitlements` | Entitlements for Prod |
| `ios/App/App/Config/App-Dev.entitlements` | Entitlements for Dev |
| `ios/App/App/Config/App-Staging.entitlements` | Entitlements for Staging |
| `ios/App/App/Config/GoogleService-Info-Dev.plist` | Firebase config for Dev (bundle id `com.knockers.app.dev`) |
| `ios/App/App/Config/GoogleService-Info-Staging.plist` | Firebase config for Staging (bundle id `com.knockers.app.staging`) |
| `ios/App/App/Assets.xcassets/AppIcon-Dev.appiconset/` | App icon set for Dev (copy of main icon; replace for custom icon) |
| `ios/App/App/Assets.xcassets/AppIcon-Staging.appiconset/` | App icon set for Staging (copy of main icon; replace for custom icon) |
| `ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme` | Shared scheme for App (Prod) |
| `ios/App/App.xcodeproj/xcshareddata/xcschemes/Knockers-Dev.xcscheme` | Shared scheme for Knockers-Dev |
| `ios/App/App.xcodeproj/xcshareddata/xcschemes/Knockers-Staging.xcscheme` | Shared scheme for Knockers-Staging |

### Files modified

| Path | Change |
|------|--------|
| `ios/App/App.xcodeproj/project.pbxproj` | Added Config group; added **Knockers-Dev** and **Knockers-Staging** targets; added entitlements and `GoogleService-Info.plist` to App target; added Resources and build settings per target |
| `ios/App/Podfile` | Added `target 'Knockers-Dev'` and `target 'Knockers-Staging'` with same pods as App |

### Unchanged (existing behavior)

- **App** target: same bundle id, display name "Knockers", same Info.plist and assets. Only addition: entitlements and `GoogleService-Info.plist` in Copy Bundle Resources.
- Same source code (e.g. `AppDelegate.swift`) and shared resources (storyboards, `public/`, `Assets.xcassets`) are used by all three targets.

---

## 2. Targets and schemes

| Target | Scheme | Bundle ID | Display name | App icon set |
|--------|--------|-----------|--------------|--------------|
| **App** | **App** | `com.knockers.app` | Knockers | AppIcon |
| **Knockers-Dev** | **Knockers-Dev** | `com.knockers.app.dev` | Knockers Dev | AppIcon-Dev |
| **Knockers-Staging** | **Knockers-Staging** | `com.knockers.app.staging` | Knockers Staging | AppIcon-Staging |

Each target has:

- Its own **Info.plist** (or path to one)
- Its own **entitlements** file
- Its own **Firebase** `GoogleService-Info` (Dev/Staging use files in `Config/`; Prod uses `App/GoogleService-Info.plist`)
- Its own **app icon** catalog name (same assets by default; you can replace icons in `AppIcon-Dev` / `AppIcon-Staging`)

---

## 3. Where each configuration lives

- **Bundle identifier, display name, Info.plist, entitlements, app icon**  
  Set in **Xcode → select target → Build Settings** (and in the per-target plist/entitlements in `App/Config/`).

- **Per-target build settings**  
  In `project.pbxproj` under each target’s Debug/Release. No manual switching: each target has its own `PRODUCT_BUNDLE_IDENTIFIER`, `INFOPLIST_FILE`, `CODE_SIGN_ENTITLEMENTS`, `ASSETCATALOG_COMPILER_APPICON_NAME`, etc.

- **Firebase**  
  - Prod: `App/GoogleService-Info.plist` (added to App target’s Copy Bundle Resources).  
  - Dev: `App/Config/GoogleService-Info-Dev.plist` (BUNDLE_ID `com.knockers.app.dev`).  
  - Staging: `App/Config/GoogleService-Info-Staging.plist` (BUNDLE_ID `com.knockers.app.staging`).  
  Replace Dev/Staging plists with ones from Firebase Console if you use separate projects or apps per environment.

- **Code signing**  
  All targets use **Automatic** signing. Set your **Team** once per target (or at project level) in **Signing & Capabilities**.

---

## 4. How to select each app in Xcode

1. Open the workspace (not the project): **`ios/App/App.xcworkspace`**.
2. In the toolbar, use the **scheme** dropdown (next to the run/stop buttons).
3. Choose:
   - **App** → build/run/archive the **Prod** app (Knockers, `com.knockers.app`).
   - **Knockers-Dev** → build/run/archive the **Dev** app.
   - **Knockers-Staging** → build/run/archive the **Staging** app.

No need to change bundle id or config manually; switching the scheme is enough.

---

## 5. One-time: CocoaPods and code signing

### Pod install (required for new targets)

The new targets **Knockers-Dev** and **Knockers-Staging** need their Pods linked. From the repo root use the **Ruby 3.2.5**–based script (avoids the ActiveSupport::Logger error with system Ruby 2.6):

```bash
./scripts/ios-pod-install.sh
```

This uses rbenv’s Ruby 3.2.5, runs `bundle install` and `bundle exec pod install` in `ios/App`, and will:

- Generate `Pods-Knockers-Dev` and `Pods-Knockers-Staging` and update the Xcode project.
- Add the [CP] script phases and Pods frameworks to those targets.

**Requirements:** Ruby 3.2.5 via rbenv (`rbenv install 3.2.5` if needed). The project has `ios/App/Gemfile` and `ios/App/.ruby-version` (same approach as AMBTN). If you prefer to run manually: `cd ios/App && bundle exec pod install` (with rbenv active so Ruby 3.2.5 is used).

### Code signing

1. In Xcode, select the **App** (or **Knockers-Dev** / **Knockers-Staging**) target.
2. Open **Signing & Capabilities**.
3. Set **Team** to your development team so Automatic Signing can create/manage profiles.
4. Repeat for the other targets if they don’t inherit the project team.

---

## 6. Archiving and uploading

- **Product → Archive** builds the app for the **currently selected scheme**.
- So: select **App** (or **Knockers-Dev** or **Knockers-Staging**) in the scheme dropdown, then **Product → Archive**.
- Each scheme produces its own archive; you can distribute or upload to TestFlight/App Store per target independently.

---

## 7. Summary

- **Three targets:** App (Prod), Knockers-Dev, Knockers-Staging.  
- **Three schemes:** App, Knockers-Dev, Knockers-Staging.  
- **Per-target:** bundle id, display name, Info.plist, entitlements, app icon set, Firebase plist.  
- **No manual config switching:** choose the scheme and build/run/archive.  
- **Run `pod install`** once (and after Podfile changes) so Dev and Staging targets link Pods.  
- **Set your Team** in Signing & Capabilities for each target (or once at project level).
