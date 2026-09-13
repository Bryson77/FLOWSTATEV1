Run pnpm run build
$ next build && opennextjs-cloudflare build --skipNextBuild
⚠ No build cache found. Please configure build caching for faster rebuilds. Read more: https://nextjs.org/docs/messages/no-cache
Attention: Next.js now collects completely anonymous telemetry regarding usage.
This information is used to shape Next.js' roadmap and prioritize features.
You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
https://nextjs.org/telemetry

   ▲ Next.js 15.2.0

   Creating an optimized production build ...
<w> [webpack.cache.PackFileCacheStrategy] Serializing big strings (113kiB) impacts deserialization performance (consider using Buffer instead and decode when needed)
<w> [webpack.cache.PackFileCacheStrategy] Serializing big strings (267kiB) impacts deserialization performance (consider using Buffer instead and decode when needed)
 ✓ Compiled successfully
   Linting and checking validity of types ...

   We detected TypeScript in your project and reconfigured your tsconfig.json file for you. Strict-mode is set to false by default.
   The following suggested values were added to your tsconfig.json. These values can be changed to fit your project's needs:

   	- allowJs was set to true
   	- strict was set to false
   	- noEmit was set to true

   The following mandatory changes were made to your tsconfig.json:

   	- esModuleInterop was set to true (requirement for SWC / babel)
   	- resolveJsonModule was set to true (to match webpack resolution)

Failed to compile.

./src/app/(dashboard)/flashcards/page.tsx:250:30
Type error: Argument of type '"record_study_activity"' is not assignable to parameter of type 'never'.

  248 |         const { data: { user } } = await supabase.auth.getUser();
  249 |         if (user) {
> 250 |           await supabase.rpc('record_study_activity', {
      |                              ^
  251 |             p_user_id: user.id,
  252 |             p_activity_type: 'flashcards'
  253 |           });
Next.js build worker exited with code: 1 and signal: null
[ELIFECYCLE] Command failed with exit code 1.
Error: Process completed with exit code 1.