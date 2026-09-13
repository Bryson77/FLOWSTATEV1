Skip to content
Bryson77
FLOWSTATEV1
Repository navigation
Code
Issues
Pull requests
1
 (1)
Agents
Actions
Projects
Wiki
Security and quality
Insights
Settings
Deploy Web Application to Cloudflare Workers
fix: resolve all CI typecheck and build errors #3
All jobs
Run details
Annotations
1 error and 1 warning
Deploy Saktus Web to Cloudflare
failed 2 minutes ago in 47s
Search logs
1s
1s
1s
10s
9s
3s
18s
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

./src/app/(dashboard)/flashcards/page.tsx:944:76
Type error: Property 'title' does not exist on type 'never'.

  942 |             <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
  943 |               <h3 className="text-sm font-semibold text-white">
> 944 |                 {editingCardId ? 'Edit Card' : `Add Card to ${managingDeck.title}`}
      |                                                                            ^
  945 |               </h3>
  946 |               <button onClick={() => setIsCardModalOpen(false)} className="text-zinc-500 hover:text-white">
  947 |                 Cancel
Next.js build worker exited with code: 1 and signal: null
[ELIFECYCLE] Command failed with exit code 1.
0s
0s
0s
1s
0s
16
783.333 × 20