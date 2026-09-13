Running "expo doctor"
Running 18 checks on your project...
15/18 checks passed. 3 checks failed. Possible issues detected:
Use the --verbose flag to see more details about passed checks.
✖ Check Expo config (app.json/ app.config.js) schema
Errors validating asset fields in /home/expo/workingdir/build/apps/mobile/app.json:
 Field: icon - cannot access file at './assets/icon.png'.
Advice:
Resolve schema errors in your app config. Learn more: https://docs.expo.dev/workflow/configuration/
✖ Check that required peer dependencies are installed
Missing peer dependency: expo-constants
Required by: expo-router
Missing peer dependency: expo-linking
Required by: expo-router
Advice:
Install missing required peer dependencies with "npx expo install expo-constants expo-linking"
Your app may crash outside of Expo Go without these dependencies. Native module peer dependencies must be installed directly.
✖ Check that packages match versions required by installed Expo SDK
The following packages should be updated for best compatibility with the installed expo version:
  @react-native-async-storage/async-storage@2.2.0 - expected version: 1.23.1
  expo-updates@0.26.19 - expected version: ~0.27.5
  react@19.1.0 - expected version: 18.3.1
  react-native-safe-area-context@5.0.0 - expected version: 4.12.0
  @types/react@19.3.0 - expected version: ~18.3.12
Your project may not work correctly until you install the expected versions of the packages.
Found outdated dependencies
Advice:
Use 'npx expo install --check' to review and upgrade your dependencies.
To ignore specific packages, add them to "expo.install.exclude" in package.json. Learn more: https://expo.fyi/dependency-validation
3 checks failed, indicating possible issues with the project.
Command "expo doctor" failed.
npx -y expo-doctor exited with non-zero code: 1

Prebuild

1s


- Creating native directory (./android)
✔ Created native directory
- Updating package.json
✔ Updated package.json
- Running prebuild
✖ Prebuild failed
Error: [android.dangerous]: withAndroidDangerousBaseMod: ENOENT: no such file or directory, open './assets/icon.png'
Error: [android.dangerous]: withAndroidDangerousBaseMod: ENOENT: no such file or directory, open './assets/icon.png'
    at Object.openSync (node:fs:562:18)
    at readFileSync (node:fs:446:35)
    at calculateHash (/home/expo/workingdir/build/node_modules/.pnpm/@expo+image-utils@0.6.5/node_modules/@expo/image-utils/build/Cache.js:14:91)
    at createCacheKey (/home/expo/workingdir/build/node_modules/.pnpm/@expo+image-utils@0.6.5/node_modules/@expo/image-utils/build/Cache.js:19:18)
    at Object.createCacheKeyWithDirectoryAsync (/home/expo/workingdir/build/node_modules/.pnpm/@expo+image-utils@0.6.5/node_modules/@expo/image-utils/build/Cache.js:28:33)
    at generateImageAsync (/home/expo/workingdir/build/node_modules/.pnpm/@expo+image-utils@0.6.5/node_modules/@expo/image-utils/build/Image.js:211:34)
    at async generateIconAsync (/home/expo/workingdir/build/node_modules/.pnpm/@expo+prebuild-config@8.2.0/node_modules/@expo/prebuild-config/build/plugins/icons/withAndroidIcons.js:352:11)
    at async /home/expo/workingdir/build/node_modules/.pnpm/@expo+prebuild-config@8.2.0/node_modules/@expo/prebuild-config/build/plugins/icons/withAndroidIcons.js:276:21
    at async Promise.all (index 0)
    at async generateMultiLayerImageAsync (/home/expo/workingdir/build/node_modules/.pnpm/@expo+prebuild-config@8.2.0/node_modules/@expo/prebuild-config/build/plugins/icons/withAndroidIcons.js:272:3)
pnpm expo prebuild --no-install --platform android exited with non-zero code: 1

Fail job

< 1s


Build failed

pnpm expo prebuild --no-install --platform android exited with non-zero code: 1