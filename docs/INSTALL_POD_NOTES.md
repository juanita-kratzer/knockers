# CocoaPods (pod) install notes

When running **`npx cap sync ios`**, Capacitor runs `bundle exec pod install` in `ios/App`. If you see:

```text
rbenv: pod: command not found
```

then CocoaPods is not available in your current Ruby environment.

---

## Option 1: Install CocoaPods with the system Ruby (recommended if not using rbenv for iOS)

```bash
sudo gem install cocoapods
```

Then run from project root:

```bash
cd ios/App && pod install && cd ../..
```

Or run sync without bundle (so it uses your PATH `pod`):

```bash
npx cap sync ios
```

If Capacitor still uses `bundle exec pod install`, you may need to skip the bundle step (see Option 3) or ensure `pod` is on your PATH.

---

## Option 2: Install CocoaPods when using rbenv

1. Make sure a Ruby version is selected: `rbenv version`
2. Install CocoaPods for that Ruby:
   ```bash
   gem install cocoapods
   ```
3. Rehash so the shell finds `pod`:
   ```bash
   rbenv rehash
   ```
4. Verify: `which pod` and `pod --version`
5. Then from project root: `cd ios/App && pod install` or `npx cap sync ios`

---

## Option 3: Run pod install manually after sync

If `npx cap sync ios` fails only on the **pod install** step, the web assets have already been copied. You can:

1. Install CocoaPods using Option 1 or 2 above.
2. Run pod install yourself:
   ```bash
   cd ios/App
   pod install
   cd ../..
   ```
3. Open Xcode: `npx cap open ios` or open `ios/App/App.xcworkspace`.

---

## Quick reference

| Step              | Command              |
|------------------|----------------------|
| Build web app    | `npm run build`       |
| Sync to iOS      | `npx cap sync ios`    |
| Install pods only | `cd ios/App && pod install` |
| Open Xcode       | `npx cap open ios`    |

Always open the **`.xcworkspace`** file (not the `.xcodeproj`) when using CocoaPods.
