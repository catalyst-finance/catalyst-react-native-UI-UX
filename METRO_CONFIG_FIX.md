# Metro Config Error Fix

## Problem
You're encountering this error:
```
Error [ERR_UNSUPPORTED_ESM_URL_SCHEME]: Error loading Metro config
Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. 
On Windows, absolute paths must be valid file:// URLs. Received protocol 'c:'
```

## Root Cause
The issue is caused by **spaces in the directory path**:
```
C:\Users\brand\Downloads\Catalyst App Mobile UI_UX v7.0 (2)\catalyst-native
```

Node.js ESM loader on Windows has trouble with paths containing spaces. When Expo CLI tries to dynamically import the `metro.config.js` file, it fails because the path isn't properly encoded as a `file://` URL.

## Solution Options

### Option 1: Move Project to Path Without Spaces (RECOMMENDED)
Move the project to a directory without spaces in the path:

**Good paths:**
- `C:\Users\brand\Projects\catalyst-native`
- `C:\catalyst-native`
- `C:\Users\brand\catalyst-native`

**Bad paths (avoid):**
- `C:\Users\brand\Downloads\Catalyst App Mobile UI_UX v7.0 (2)\catalyst-native` ❌
- `C:\My Projects\catalyst-native` ❌
- `C:\React Native Apps\catalyst-native` ❌

**Steps:**
1. Close any running Metro bundler
2. Move the entire `catalyst-native` folder to a path without spaces
3. Open terminal in the new location
4. Run `npm start` or `npx expo start`

### Option 2: Use Short Path (Windows Workaround)
Windows has a "short path" feature that removes spaces:

1. Open Command Prompt (not PowerShell)
2. Run: `dir /x "C:\Users\brand\Downloads"`
3. Look for the short name (8.3 format) of your folder, something like `CATALY~1`
4. Navigate using the short path: `cd C:\Users\brand\Downloads\CATALY~1\catalyst-native`
5. Run `npx expo start`

### Option 3: Upgrade Expo CLI
Sometimes newer versions of Expo CLI handle this better:

```bash
npm install -g expo-cli@latest
npx expo start --clear
```

### Option 4: Use WSL (Windows Subsystem for Linux)
If you have WSL installed, you can run the project from there:

```bash
# In WSL terminal
cd /mnt/c/Users/brand/catalyst-native  # After moving to path without spaces
npm start
```

## Recommended Action
**Move the project to a path without spaces.** This is the cleanest solution and will prevent similar issues in the future with other tools.

Example:
```powershell
# In PowerShell
Move-Item "C:\Users\brand\Downloads\Catalyst App Mobile UI_UX v7.0 (2)\catalyst-native" "C:\Users\brand\catalyst-native"
cd C:\Users\brand\catalyst-native
npm start
```

## Why This Happens
- Node.js ESM (ECMAScript Modules) loader requires proper file:// URLs
- Windows paths with spaces need to be encoded (e.g., `%20` for space)
- Expo CLI's dynamic import doesn't properly encode the path on Windows
- This is a known issue with Node.js v18+ on Windows

## Verification
After moving the project, verify it works:
```bash
npx expo start --clear
```

You should see:
```
Starting Metro Bundler
› Metro waiting on exp://...
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

## Additional Notes
- This issue only affects Windows
- macOS and Linux don't have this problem
- The metro.config.js file itself is fine - the issue is the path to it
- Once moved, all your code and changes will work normally
