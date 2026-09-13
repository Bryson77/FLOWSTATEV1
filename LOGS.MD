2026-09-13T14:05:12.2897135Z Current runner version: '2.337.0'
2026-09-13T14:05:12.2920397Z ##[group]Runner Image Provisioner
2026-09-13T14:05:12.2921220Z Hosted Compute Agent
2026-09-13T14:05:12.2921810Z Version: 20260828.587
2026-09-13T14:05:12.2922486Z Commit: abac92662cab4cc7352de4f9f9d2e2419aad9c29
2026-09-13T14:05:12.2923169Z Build Date: 2026-08-28T16:44:25Z
2026-09-13T14:05:12.2924058Z Worker ID: {930616f5-38ad-4533-909b-9291b69ca0a7}
2026-09-13T14:05:12.2924649Z Azure Region: westus3
2026-09-13T14:05:12.2925269Z ##[endgroup]
2026-09-13T14:05:12.2926664Z ##[group]Operating System
2026-09-13T14:05:12.2927285Z Ubuntu
2026-09-13T14:05:12.2927738Z 24.04.5
2026-09-13T14:05:12.2928272Z LTS
2026-09-13T14:05:12.2929109Z ##[endgroup]
2026-09-13T14:05:12.2929668Z ##[group]Runner Image
2026-09-13T14:05:12.2930197Z Image: ubuntu-24.04
2026-09-13T14:05:12.2930700Z Version: 20260907.300.1
2026-09-13T14:05:12.2931983Z Included Software: https://github.com/actions/runner-images/blob/ubuntu24/20260907.300/images/ubuntu/Ubuntu2404-Readme.md
2026-09-13T14:05:12.2933702Z Image Release: https://github.com/actions/runner-images/releases/tag/ubuntu24%2F20260907.300
2026-09-13T14:05:12.2934590Z ##[endgroup]
2026-09-13T14:05:12.2935720Z ##[group]GITHUB_TOKEN Permissions
2026-09-13T14:05:12.2937542Z Contents: read
2026-09-13T14:05:12.2938183Z Metadata: read
2026-09-13T14:05:12.2938649Z Packages: read
2026-09-13T14:05:12.2939182Z ##[endgroup]
2026-09-13T14:05:12.2941111Z Secret source: Actions
2026-09-13T14:05:12.2942056Z Cache mode: write
2026-09-13T14:05:12.2942720Z Prepare workflow directory
2026-09-13T14:05:12.3226939Z Prepare all required actions
2026-09-13T14:05:12.3266793Z Getting action download info
2026-09-13T14:05:12.6188484Z Download action repository 'actions/checkout@v4' (SHA:11d5960a326750d5838078e36cf38b85af677262)
2026-09-13T14:05:12.8079645Z Download action repository 'actions/setup-node@v4' (SHA:49933ea5288caeca8642d1e84afbd3f7d6820020)
2026-09-13T14:05:12.9642816Z Download action repository 'pnpm/action-setup@v4' (SHA:b906affcce14559ad1aafd4ab0e942779e9f58b1)
2026-09-13T14:05:13.8572638Z Download action repository 'actions/cache@v4' (SHA:0057852bfaa89a56745cba8c7296529d2fc39830)
2026-09-13T14:05:14.0881897Z Complete job name: EAS Update
2026-09-13T14:05:14.1615553Z Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
2026-09-13T14:05:14.1624011Z ##[group]Run actions/checkout@v4
2026-09-13T14:05:14.1624659Z with:
2026-09-13T14:05:14.1625057Z   repository: Bryson77/FLOWSTATEV1
2026-09-13T14:05:14.1631423Z   token: ***
2026-09-13T14:05:14.1631818Z   ssh-strict: true
2026-09-13T14:05:14.1632229Z   ssh-user: git
2026-09-13T14:05:14.1632642Z   persist-credentials: true
2026-09-13T14:05:14.1633124Z   clean: true
2026-09-13T14:05:14.1633670Z   sparse-checkout-cone-mode: true
2026-09-13T14:05:14.1634230Z   fetch-depth: 1
2026-09-13T14:05:14.1634636Z   fetch-tags: false
2026-09-13T14:05:14.1635073Z   show-progress: true
2026-09-13T14:05:14.1635506Z   lfs: false
2026-09-13T14:05:14.1635924Z   submodules: false
2026-09-13T14:05:14.1636351Z   set-safe-directory: true
2026-09-13T14:05:14.1636865Z   allow-unsafe-pr-checkout: false
2026-09-13T14:05:14.1637728Z ##[endgroup]
2026-09-13T14:05:14.2446025Z Syncing repository: Bryson77/FLOWSTATEV1
2026-09-13T14:05:14.2447716Z ##[group]Getting Git version info
2026-09-13T14:05:14.2448533Z Working directory is '/home/runner/work/FLOWSTATEV1/FLOWSTATEV1'
2026-09-13T14:05:14.2451867Z [command]/usr/bin/git version
2026-09-13T14:05:14.2578607Z git version 2.55.0
2026-09-13T14:05:14.2601341Z ##[endgroup]
2026-09-13T14:05:14.2608843Z Temporarily overriding HOME='/home/runner/work/_temp/0934cb85-c4b0-4627-adae-45bfba439ed6' before making global git config changes
2026-09-13T14:05:14.2612180Z Adding repository directory to the temporary git global config as a safe directory
2026-09-13T14:05:14.2615315Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/FLOWSTATEV1/FLOWSTATEV1
2026-09-13T14:05:14.2658572Z Deleting the contents of '/home/runner/work/FLOWSTATEV1/FLOWSTATEV1'
2026-09-13T14:05:14.2662178Z ##[group]Initializing the repository
2026-09-13T14:05:14.2666530Z [command]/usr/bin/git init /home/runner/work/FLOWSTATEV1/FLOWSTATEV1
2026-09-13T14:05:14.2748387Z hint: Using 'master' as the name for the initial branch. This default branch name
2026-09-13T14:05:14.2749797Z hint: will change to "main" in Git 3.0. To configure the initial branch name
2026-09-13T14:05:14.2751060Z hint: to use in all of your new repositories, which will suppress this warning,
2026-09-13T14:05:14.2751956Z hint: call:
2026-09-13T14:05:14.2752322Z hint:
2026-09-13T14:05:14.2752838Z hint: 	git config --global init.defaultBranch <name>
2026-09-13T14:05:14.2753774Z hint:
2026-09-13T14:05:14.2754707Z hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
2026-09-13T14:05:14.2756532Z hint: 'development'. The just-created branch can be renamed via this command:
2026-09-13T14:05:14.2757900Z hint:
2026-09-13T14:05:14.2758501Z hint: 	git branch -m <name>
2026-09-13T14:05:14.2759258Z hint:
2026-09-13T14:05:14.2760334Z hint: Disable this message with "git config set advice.defaultBranchName false"
2026-09-13T14:05:14.2762429Z Initialized empty Git repository in /home/runner/work/FLOWSTATEV1/FLOWSTATEV1/.git/
2026-09-13T14:05:14.2768681Z [command]/usr/bin/git remote add origin https://github.com/Bryson77/FLOWSTATEV1
2026-09-13T14:05:14.2807840Z ##[endgroup]
2026-09-13T14:05:14.2810687Z ##[group]Disabling automatic garbage collection
2026-09-13T14:05:14.2811823Z [command]/usr/bin/git config --local gc.auto 0
2026-09-13T14:05:14.2837805Z ##[endgroup]
2026-09-13T14:05:14.2838865Z ##[group]Setting up auth
2026-09-13T14:05:14.2842471Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
2026-09-13T14:05:14.2876063Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
2026-09-13T14:05:14.3486664Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
2026-09-13T14:05:14.3519928Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
2026-09-13T14:05:14.3732036Z [command]/usr/bin/git config --local --name-only --get-regexp ^includeIf\.gitdir:
2026-09-13T14:05:14.3766716Z [command]/usr/bin/git submodule foreach --recursive git config --local --show-origin --name-only --get-regexp remote.origin.url
2026-09-13T14:05:14.3956876Z [command]/usr/bin/git config --local http.https://github.com/.extraheader AUTHORIZATION: basic ***
2026-09-13T14:05:14.3988785Z ##[endgroup]
2026-09-13T14:05:14.3989570Z ##[group]Fetching the repository
2026-09-13T14:05:14.3997217Z [command]/usr/bin/git -c protocol.version=2 fetch --no-tags --prune --no-recurse-submodules --depth=1 origin +e0351500dc6356f83766beeca88753ec9437dbee:refs/remotes/origin/WorkingBranch
2026-09-13T14:05:15.1987296Z From https://github.com/Bryson77/FLOWSTATEV1
2026-09-13T14:05:15.1988709Z  * [new ref]         e0351500dc6356f83766beeca88753ec9437dbee -> origin/WorkingBranch
2026-09-13T14:05:15.1991628Z ##[endgroup]
2026-09-13T14:05:15.1992446Z ##[group]Determining the checkout info
2026-09-13T14:05:15.1993739Z ##[endgroup]
2026-09-13T14:05:15.1998575Z [command]/usr/bin/git sparse-checkout disable
2026-09-13T14:05:15.2042529Z [command]/usr/bin/git config --local --unset-all extensions.worktreeConfig
2026-09-13T14:05:15.2130344Z ##[group]Checking out the ref
2026-09-13T14:05:15.2131610Z [command]/usr/bin/git checkout --progress --force -B WorkingBranch refs/remotes/origin/WorkingBranch
2026-09-13T14:05:15.2204187Z Switched to a new branch 'WorkingBranch'
2026-09-13T14:05:15.2208654Z branch 'WorkingBranch' set up to track 'origin/WorkingBranch'.
2026-09-13T14:05:15.2213868Z ##[endgroup]
2026-09-13T14:05:15.2249297Z [command]/usr/bin/git log -1 --format=%H
2026-09-13T14:05:15.2272515Z e0351500dc6356f83766beeca88753ec9437dbee
2026-09-13T14:05:15.2531496Z Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
2026-09-13T14:05:15.2533770Z ##[group]Run actions/setup-node@v4
2026-09-13T14:05:15.2534419Z with:
2026-09-13T14:05:15.2535011Z   node-version: 22
2026-09-13T14:05:15.2535619Z   always-auth: false
2026-09-13T14:05:15.2536223Z   check-latest: false
2026-09-13T14:05:15.2538980Z   token: ***
2026-09-13T14:05:15.2539561Z ##[endgroup]
2026-09-13T14:05:15.3681737Z Found in cache @ /opt/hostedtoolcache/node/22.23.2/x64
2026-09-13T14:05:15.3685847Z (node:2039) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
2026-09-13T14:05:15.3686989Z (Use `node --trace-deprecation ...` to show where the warning was created)
2026-09-13T14:05:15.3688463Z ##[group]Environment details
2026-09-13T14:05:20.6675283Z node: v22.23.2
2026-09-13T14:05:20.6675633Z npm: 10.9.8
2026-09-13T14:05:20.6675861Z yarn: 1.22.22
2026-09-13T14:05:20.6678158Z ##[endgroup]
2026-09-13T14:05:20.6808996Z Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
2026-09-13T14:05:20.6809967Z ##[group]Run pnpm/action-setup@v4
2026-09-13T14:05:20.6810181Z with:
2026-09-13T14:05:20.6810340Z   version: 11.5.2
2026-09-13T14:05:20.6810513Z   dest: ~/setup-pnpm
2026-09-13T14:05:20.6810708Z   run_install: null
2026-09-13T14:05:20.6810876Z   cache: false
2026-09-13T14:05:20.6811058Z   cache_dependency_path: pnpm-lock.yaml
2026-09-13T14:05:20.6811301Z   package_json_file: package.json
2026-09-13T14:05:20.6811499Z   standalone: false
2026-09-13T14:05:20.6811669Z ##[endgroup]
2026-09-13T14:05:20.7961962Z ##[group]Running self-installer...
2026-09-13T14:05:21.1116428Z (node:2084) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
2026-09-13T14:05:21.1117410Z (Use `node --trace-deprecation ...` to show where the warning was created)
2026-09-13T14:05:21.2818584Z Progress: resolved 1, reused 0, downloaded 0, added 0
2026-09-13T14:05:21.2883161Z Packages: +1
2026-09-13T14:05:21.5559007Z +
2026-09-13T14:05:21.5559565Z Progress: resolved 1, reused 0, downloaded 1, added 1, done
2026-09-13T14:05:21.7003416Z 
2026-09-13T14:05:21.7004101Z dependencies:
2026-09-13T14:05:21.7004555Z + pnpm 11.5.2 (12.4.1 is available)
2026-09-13T14:05:21.7004783Z 
2026-09-13T14:05:21.7027591Z Done in 761ms
2026-09-13T14:05:21.7177950Z ##[endgroup]
2026-09-13T14:05:21.7178441Z Installation Completed!
2026-09-13T14:05:21.7290667Z ##[group]Run npm install --global eas-cli
2026-09-13T14:05:21.7291005Z [36;1mnpm install --global eas-cli[0m
2026-09-13T14:05:21.7331084Z shell: /usr/bin/bash -e {0}
2026-09-13T14:05:21.7331355Z env:
2026-09-13T14:05:21.7331582Z   PNPM_HOME: /home/runner/setup-pnpm/node_modules/.bin
2026-09-13T14:05:21.7331842Z ##[endgroup]
2026-09-13T14:05:32.3500808Z npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
2026-09-13T14:05:32.8241025Z npm warn deprecated rimraf@2.4.5: Rimraf versions prior to v4 are no longer supported
2026-09-13T14:05:32.8448951Z npm warn deprecated glob@6.0.4: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
2026-09-13T14:05:34.2079438Z npm warn deprecated uuid@7.0.3: uuid@10 and below is no longer supported.  For ESM codebases, update to uuid@latest.  For CommonJS codebases, use uuid@11 (but be aware this version will likely be deprecated in 2028).
2026-09-13T14:05:34.2914029Z npm warn deprecated glob@10.5.0: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
2026-09-13T14:05:34.3128590Z npm warn deprecated uuid@8.3.2: uuid@10 and below is no longer supported.  For ESM codebases, update to uuid@latest.  For CommonJS codebases, use uuid@11 (but be aware this version will likely be deprecated in 2028).
2026-09-13T14:05:34.3743623Z npm warn deprecated uuid@8.3.2: uuid@10 and below is no longer supported.  For ESM codebases, update to uuid@latest.  For CommonJS codebases, use uuid@11 (but be aware this version will likely be deprecated in 2028).
2026-09-13T14:05:34.4623475Z npm warn deprecated glob@10.5.0: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
2026-09-13T14:05:39.6555812Z 
2026-09-13T14:05:39.6556395Z added 525 packages in 18s
2026-09-13T14:05:39.6556757Z 
2026-09-13T14:05:39.6556957Z 69 packages are looking for funding
2026-09-13T14:05:39.6557306Z   run `npm fund` for details
2026-09-13T14:05:39.7028238Z ##[group]Run echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV
2026-09-13T14:05:39.7028670Z [36;1mecho "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV[0m
2026-09-13T14:05:39.7063695Z shell: /usr/bin/bash --noprofile --norc -e -o pipefail {0}
2026-09-13T14:05:39.7063968Z env:
2026-09-13T14:05:39.7064172Z   PNPM_HOME: /home/runner/setup-pnpm/node_modules/.bin
2026-09-13T14:05:39.7064425Z ##[endgroup]
2026-09-13T14:05:40.1989360Z Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
2026-09-13T14:05:40.1990321Z ##[group]Run actions/cache@v4
2026-09-13T14:05:40.1990526Z with:
2026-09-13T14:05:40.1990743Z   path: /home/runner/setup-pnpm/node_modules/.bin/store/v11
2026-09-13T14:05:40.1991152Z   key: Linux-pnpm-store-1ddfa28c045ab2b1396994806406ef491584c0a2fe2c8fa627a049121bbe9cab
2026-09-13T14:05:40.1991527Z   restore-keys: Linux-pnpm-store-

2026-09-13T14:05:40.1991750Z   enableCrossOsArchive: false
2026-09-13T14:05:40.1991978Z   fail-on-cache-miss: false
2026-09-13T14:05:40.1992170Z   lookup-only: false
2026-09-13T14:05:40.1992349Z   save-always: false
2026-09-13T14:05:40.1992512Z env:
2026-09-13T14:05:40.1992743Z   PNPM_HOME: /home/runner/setup-pnpm/node_modules/.bin
2026-09-13T14:05:40.1993049Z   STORE_PATH: /home/runner/setup-pnpm/node_modules/.bin/store/v11
2026-09-13T14:05:40.1993584Z ##[endgroup]
2026-09-13T14:05:40.2853904Z (node:2178) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
2026-09-13T14:05:40.2854846Z (Use `node --trace-deprecation ...` to show where the warning was created)
2026-09-13T14:05:40.4963821Z Cache not found for input keys: Linux-pnpm-store-1ddfa28c045ab2b1396994806406ef491584c0a2fe2c8fa627a049121bbe9cab, Linux-pnpm-store-
2026-09-13T14:05:40.5048394Z ##[group]Run pnpm install --no-frozen-lockfile
2026-09-13T14:05:40.5048688Z [36;1mpnpm install --no-frozen-lockfile[0m
2026-09-13T14:05:40.5081740Z shell: /usr/bin/bash -e {0}
2026-09-13T14:05:40.5081946Z env:
2026-09-13T14:05:40.5082157Z   PNPM_HOME: /home/runner/setup-pnpm/node_modules/.bin
2026-09-13T14:05:40.5082474Z   STORE_PATH: /home/runner/setup-pnpm/node_modules/.bin/store/v11
2026-09-13T14:05:40.5082742Z ##[endgroup]
2026-09-13T14:05:40.8354638Z Scope: all 7 workspace projects
2026-09-13T14:05:40.9619630Z ? Verifying lockfile against supply-chain policies (1313 entries)...
2026-09-13T14:05:40.9716806Z ✓ Lockfile passes supply-chain policies (1313 entries in 10ms)
2026-09-13T14:05:40.9762907Z Lockfile is up to date, resolution step is skipped
2026-09-13T14:05:41.0503195Z Progress: resolved 1, reused 0, downloaded 0, added 0
2026-09-13T14:05:41.1375004Z Packages: +1117
2026-09-13T14:05:41.1384342Z ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
2026-09-13T14:05:42.0575213Z Progress: resolved 1117, reused 0, downloaded 111, added 101
2026-09-13T14:05:43.0541949Z Progress: resolved 1117, reused 0, downloaded 212, added 212
2026-09-13T14:05:44.1698019Z Progress: resolved 1117, reused 0, downloaded 635, added 633
2026-09-13T14:05:45.1705618Z Progress: resolved 1117, reused 0, downloaded 829, added 786
2026-09-13T14:05:46.1730462Z Progress: resolved 1117, reused 0, downloaded 854, added 794
2026-09-13T14:05:47.1729711Z Progress: resolved 1117, reused 0, downloaded 909, added 830
2026-09-13T14:05:48.1764793Z Progress: resolved 1117, reused 0, downloaded 1014, added 898
2026-09-13T14:05:49.1740454Z Progress: resolved 1117, reused 0, downloaded 1117, added 1063
2026-09-13T14:05:49.2796910Z Progress: resolved 1117, reused 0, downloaded 1117, added 1117, done
2026-09-13T14:05:49.7274791Z .../sharp@0.33.5/node_modules/sharp install$ node install/check
2026-09-13T14:05:49.7454419Z .../node_modules/workerd postinstall$ node install.js
2026-09-13T14:05:49.7455065Z .../esbuild@0.17.19/node_modules/esbuild postinstall$ node install.js
2026-09-13T14:05:49.7470502Z .../esbuild@0.25.4/node_modules/esbuild postinstall$ node install.js
2026-09-13T14:05:49.7471173Z .../esbuild@0.25.12/node_modules/esbuild postinstall$ node install.js
2026-09-13T14:05:50.2296714Z .../sharp@0.33.5/node_modules/sharp install: Done
2026-09-13T14:05:50.2383916Z .../node_modules/workerd postinstall$ node install.js
2026-09-13T14:05:50.3232632Z .../node_modules/workerd postinstall: Done
2026-09-13T14:05:50.3807040Z .../esbuild@0.17.19/node_modules/esbuild postinstall: Done
2026-09-13T14:05:50.4054327Z .../esbuild@0.28.1/node_modules/esbuild postinstall$ node install.js
2026-09-13T14:05:50.4423842Z .../esbuild@0.25.12/node_modules/esbuild postinstall: Done
2026-09-13T14:05:50.4430766Z .../esbuild@0.25.4/node_modules/esbuild postinstall: Done
2026-09-13T14:05:51.2581920Z .../node_modules/workerd postinstall: Done
2026-09-13T14:05:51.3620638Z .../esbuild@0.28.1/node_modules/esbuild postinstall: Done
2026-09-13T14:05:51.8695523Z 
2026-09-13T14:05:51.8696110Z devDependencies:
2026-09-13T14:05:51.8696476Z + prettier 3.9.6
2026-09-13T14:05:51.8697063Z + turbo 2.10.12
2026-09-13T14:05:51.8697404Z + typescript 5.9.3
2026-09-13T14:05:51.8697582Z 
2026-09-13T14:05:52.0244644Z Done in 11.4s using pnpm v11.5.2
2026-09-13T14:05:52.3216394Z ##[group]Run pnpm --filter @flowstate/shared build || true
2026-09-13T14:05:52.3216771Z [36;1mpnpm --filter @flowstate/shared build || true[0m
2026-09-13T14:05:52.3217053Z [36;1mpnpm --filter @flowstate/study-engine build[0m
2026-09-13T14:05:52.3251110Z shell: /usr/bin/bash -e {0}
2026-09-13T14:05:52.3251315Z env:
2026-09-13T14:05:52.3251520Z   PNPM_HOME: /home/runner/setup-pnpm/node_modules/.bin
2026-09-13T14:05:52.3251840Z   STORE_PATH: /home/runner/setup-pnpm/node_modules/.bin/store/v11
2026-09-13T14:05:52.3252116Z ##[endgroup]
2026-09-13T14:05:52.6446558Z $ tsc
2026-09-13T14:05:53.3644689Z $ tsc
2026-09-13T14:05:53.6599479Z ##[group]Run pnpm run typecheck
2026-09-13T14:05:53.6599746Z [36;1mpnpm run typecheck[0m
2026-09-13T14:05:53.6632557Z shell: /usr/bin/bash -e {0}
2026-09-13T14:05:53.6632770Z env:
2026-09-13T14:05:53.6632984Z   PNPM_HOME: /home/runner/setup-pnpm/node_modules/.bin
2026-09-13T14:05:53.6633754Z   STORE_PATH: /home/runner/setup-pnpm/node_modules/.bin/store/v11
2026-09-13T14:05:53.6634024Z ##[endgroup]
2026-09-13T14:05:53.9796724Z $ tsc --noEmit
2026-09-13T14:05:56.1280152Z ##[error]app/(tabs)/index.tsx(97,18): error TS2345: Argument of type '{ code: string; color: string | null; created_at: string | null; id: string; name: string; target_hours_per_week: number | null; user_id: string; }[]' is not assignable to parameter of type 'SetStateAction<CourseItem[]>'.
2026-09-13T14:05:56.1287591Z   Type '{ code: string; color: string | null; created_at: string | null; id: string; name: string; target_hours_per_week: number | null; user_id: string; }[]' is not assignable to type 'CourseItem[]'.
2026-09-13T14:05:56.1288614Z     Type '{ code: string; color: string | null; created_at: string | null; id: string; name: string; target_hours_per_week: number | null; user_id: string; }' is not assignable to type 'CourseItem'.
2026-09-13T14:05:56.1289295Z       Types of property 'target_hours_per_week' are incompatible.
2026-09-13T14:05:56.1289658Z         Type 'number | null' is not assignable to type 'number'.
2026-09-13T14:05:56.1290001Z           Type 'null' is not assignable to type 'number'.
2026-09-13T14:05:56.1290860Z ##[error]app/(tabs)/index.tsx(136,25): error TS2538: Type 'null' cannot be used as an index type.
2026-09-13T14:05:56.1294220Z ##[error]app/(tabs)/index.tsx(169,17): error TS2345: Argument of type '{ user_id: string; text: string; prio: string; done: false; due: string; }' is not assignable to parameter of type 'RejectExcessProperties<{ created_at?: string | null | undefined; done?: boolean | null | undefined; due?: string | null | undefined; id: string; notes?: string | null | undefined; prio?: string | null | undefined; text: string; updated_at?: string | ... 1 more ... | undefined; user_id?: string | ... 1 more ... | und...'.
2026-09-13T14:05:56.1296777Z   Type '{ user_id: string; text: string; prio: string; done: false; due: string; }' is not assignable to type 'RejectExcessProperties<{ created_at?: string | null | undefined; done?: boolean | null | undefined; due?: string | null | undefined; id: string; notes?: string | null | undefined; prio?: string | null | undefined; text: string; updated_at?: string | ... 1 more ... | undefined; user_id?: string | ... 1 more ... | und...'.
2026-09-13T14:05:56.1298884Z     Property 'id' is missing in type '{ user_id: string; text: string; prio: string; done: false; due: string; }' but required in type '{ created_at?: string | null | undefined; done?: boolean | null | undefined; due?: string | null | undefined; id: string; notes?: string | null | undefined; prio?: string | null | undefined; text: string; updated_at?: string | ... 1 more ... | undefined; user_id?: string | ... 1 more ... | undefined; }'.
2026-09-13T14:05:56.1300225Z ##[error]app/(tabs)/social.tsx(59,23): error TS2769: No overload matches this call.
2026-09-13T14:05:56.1301470Z   Overload 1 of 2, '(relation: "courses" | "profiles" | "flashcard_decks" | "squads" | "assessments" | "flashcards" | "friendships" | "sessions" | "squad_members" | "stats" | "study_sessions" | "tasks" | "timetable_classes"): PostgrestQueryBuilder<...>', gave the following error.
2026-09-13T14:05:56.1302792Z     Argument of type '"follows"' is not assignable to parameter of type '"courses" | "profiles" | "flashcard_decks" | "squads" | "assessments" | "flashcards" | "friendships" | "sessions" | "squad_members" | "stats" | "study_sessions" | "tasks" | "timetable_classes"'.
2026-09-13T14:05:56.1305081Z   Overload 2 of 2, '(relation: never): PostgrestQueryBuilder<{ PostgrestVersion: "14.5"; }, { Tables: { assessments: { Row: { completed: boolean | null; course_id: string; created_at: string | null; due_date: string; id: string; ... 5 more ...; weight_percentage: number | null; }; Insert: { ...; }; Update: { ...; }; Relationships: [...]; }; ... 11 more ...; timetable_classes: { ...; }; }; Views: {}; Functions: {}; Enums: {}; CompositeTypes: {}; }, never, never, never>', gave the following error.
2026-09-13T14:05:56.1306538Z     Argument of type '"follows"' is not assignable to parameter of type 'never'.
2026-09-13T14:05:56.1307165Z ##[error]app/(tabs)/social.tsx(60,23): error TS2769: No overload matches this call.
2026-09-13T14:05:56.1308435Z   Overload 1 of 2, '(relation: "courses" | "profiles" | "flashcard_decks" | "squads" | "assessments" | "flashcards" | "friendships" | "sessions" | "squad_members" | "stats" | "study_sessions" | "tasks" | "timetable_classes"): PostgrestQueryBuilder<...>', gave the following error.
2026-09-13T14:05:56.1309778Z     Argument of type '"study_rooms"' is not assignable to parameter of type '"courses" | "profiles" | "flashcard_decks" | "squads" | "assessments" | "flashcards" | "friendships" | "sessions" | "squad_members" | "stats" | "study_sessions" | "tasks" | "timetable_classes"'.
2026-09-13T14:05:56.1311632Z   Overload 2 of 2, '(relation: never): PostgrestQueryBuilder<{ PostgrestVersion: "14.5"; }, { Tables: { assessments: { Row: { completed: boolean | null; course_id: string; created_at: string | null; due_date: string; id: string; ... 5 more ...; weight_percentage: number | null; }; Insert: { ...; }; Update: { ...; }; Relationships: [...]; }; ... 11 more ...; timetable_classes: { ...; }; }; Views: {}; Functions: {}; Enums: {}; CompositeTypes: {}; }, never, never, never>', gave the following error.
2026-09-13T14:05:56.1312909Z     Argument of type '"study_rooms"' is not assignable to parameter of type 'never'.
2026-09-13T14:05:56.1313832Z ##[error]app/(tabs)/social.tsx(60,82): error TS2345: Argument of type '"status"' is not assignable to parameter of type 'never'.
2026-09-13T14:05:56.1316327Z ##[error]app/(tabs)/social.tsx(64,58): error TS2339: Property 'follower_id' does not exist on type '{ back_text: string; created_at: string | null; deck_id: string; due_date: string | null; ease_factor: number | null; front_text: string; id: string; interval_days: number | null; repetition_number: number | null; updated_at: string | null; user_id: string; } | ... 11 more ... | { ...; }'.
2026-09-13T14:05:56.1318289Z   Property 'follower_id' does not exist on type '{ back_text: string; created_at: string | null; deck_id: string; due_date: string | null; ease_factor: number | null; front_text: string; id: string; interval_days: number | null; repetition_number: number | null; updated_at: string | null; user_id: string; }'.
2026-09-13T14:05:56.1320857Z ##[error]app/(tabs)/social.tsx(64,94): error TS2339: Property 'followee_id' does not exist on type '{ back_text: string; created_at: string | null; deck_id: string; due_date: string | null; ease_factor: number | null; front_text: string; id: string; interval_days: number | null; repetition_number: number | null; updated_at: string | null; user_id: string; } | ... 11 more ... | { ...; }'.
2026-09-13T14:05:56.1322813Z   Property 'followee_id' does not exist on type '{ back_text: string; created_at: string | null; deck_id: string; due_date: string | null; ease_factor: number | null; front_text: string; id: string; interval_days: number | null; repetition_number: number | null; updated_at: string | null; user_id: string; }'.
2026-09-13T14:05:56.1325225Z ##[error]app/(tabs)/social.tsx(69,21): error TS2339: Property 'username' does not exist on type '{ avatar_url: string | null; created_at: string | null; current_subject: string | null; degree: string | null; email: string; full_name: string; id: string; is_studying_now: boolean | null; ... 6 more ...; updated_at: string | null; }'.
2026-09-13T14:05:56.1326661Z ##[error]app/(tabs)/social.tsx(107,29): error TS2769: No overload matches this call.
2026-09-13T14:05:56.1328041Z   Overload 1 of 2, '(relation: "courses" | "profiles" | "flashcard_decks" | "squads" | "assessments" | "flashcards" | "friendships" | "sessions" | "squad_members" | "stats" | "study_sessions" | "tasks" | "timetable_classes"): PostgrestQueryBuilder<...>', gave the following error.
2026-09-13T14:05:56.1329374Z     Argument of type '"follows"' is not assignable to parameter of type '"courses" | "profiles" | "flashcard_decks" | "squads" | "assessments" | "flashcards" | "friendships" | "sessions" | "squad_members" | "stats" | "study_sessions" | "tasks" | "timetable_classes"'.
2026-09-13T14:05:56.1331340Z   Overload 2 of 2, '(relation: never): PostgrestQueryBuilder<{ PostgrestVersion: "14.5"; }, { Tables: { assessments: { Row: { completed: boolean | null; course_id: string; created_at: string | null; due_date: string; id: string; ... 5 more ...; weight_percentage: number | null; }; Insert: { ...; }; Update: { ...; }; Relationships: [...]; }; ... 11 more ...; timetable_classes: { ...; }; }; Views: {}; Functions: {}; Enums: {}; CompositeTypes: {}; }, never, never, never>', gave the following error.
2026-09-13T14:05:56.1332630Z     Argument of type '"follows"' is not assignable to parameter of type 'never'.
2026-09-13T14:05:56.1333576Z ##[error]app/(tabs)/social.tsx(107,52): error TS2345: Argument of type '"follower_id"' is not assignable to parameter of type 'never'.
2026-09-13T14:05:56.1334777Z ##[error]app/(tabs)/social.tsx(107,85): error TS2345: Argument of type '"followee_id"' is not assignable to parameter of type 'never'.
2026-09-13T14:05:56.1335715Z ##[error]app/(tabs)/social.tsx(114,29): error TS2769: No overload matches this call.
2026-09-13T14:05:56.1336985Z   Overload 1 of 2, '(relation: "courses" | "profiles" | "flashcard_decks" | "squads" | "assessments" | "flashcards" | "friendships" | "sessions" | "squad_members" | "stats" | "study_sessions" | "tasks" | "timetable_classes"): PostgrestQueryBuilder<...>', gave the following error.
2026-09-13T14:05:56.1338300Z     Argument of type '"follows"' is not assignable to parameter of type '"courses" | "profiles" | "flashcard_decks" | "squads" | "assessments" | "flashcards" | "friendships" | "sessions" | "squad_members" | "stats" | "study_sessions" | "tasks" | "timetable_classes"'.
2026-09-13T14:05:56.1340131Z   Overload 2 of 2, '(relation: never): PostgrestQueryBuilder<{ PostgrestVersion: "14.5"; }, { Tables: { assessments: { Row: { completed: boolean | null; course_id: string; created_at: string | null; due_date: string; id: string; ... 5 more ...; weight_percentage: number | null; }; Insert: { ...; }; Update: { ...; }; Relationships: [...]; }; ... 11 more ...; timetable_classes: { ...; }; }; Views: {}; Functions: {}; Enums: {}; CompositeTypes: {}; }, never, never, never>', gave the following error.
2026-09-13T14:05:56.1341401Z     Argument of type '"follows"' is not assignable to parameter of type 'never'.
2026-09-13T14:05:56.1344043Z ##[error]app/(tabs)/social.tsx(114,49): error TS2353: Object literal may only specify known properties, and 'follower_id' does not exist in type 'RejectExcessProperties<{ completed?: boolean | null | undefined; course_id: string; created_at?: string | null | undefined; due_date: string; id?: string | undefined; target_study_hours?: number | null | undefined; ... 4 more ...; weight_percentage?: number | ... 1 more ... | undefined; } | ... 11 more ... | { ...; ...'.
2026-09-13T14:05:56.1345846Z ##[error]app/(tabs)/timer.tsx(73,16): error TS2503: Cannot find namespace 'NodeJS'.
2026-09-13T14:05:56.1347507Z ##[error]lib/supabase.ts(5,21): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
2026-09-13T14:05:56.1349402Z ##[error]lib/supabase.ts(6,25): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
2026-09-13T14:05:56.1586958Z [ELIFECYCLE] Command failed with exit code 2.
2026-09-13T14:05:56.1841182Z ##[error]Process completed with exit code 2.
2026-09-13T14:05:56.1915140Z Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
2026-09-13T14:05:56.1916209Z Post job cleanup.
2026-09-13T14:05:56.3071241Z Pruning is unnecessary.
2026-09-13T14:05:56.3210112Z Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
2026-09-13T14:05:56.3211026Z Post job cleanup.
2026-09-13T14:05:56.3920883Z [command]/usr/bin/git version
2026-09-13T14:05:56.3958325Z git version 2.55.0
2026-09-13T14:05:56.3990640Z Temporarily overriding HOME='/home/runner/work/_temp/83143121-b6e3-470e-bbcb-7b9712d7bec1' before making global git config changes
2026-09-13T14:05:56.3991600Z Adding repository directory to the temporary git global config as a safe directory
2026-09-13T14:05:56.3995763Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/FLOWSTATEV1/FLOWSTATEV1
2026-09-13T14:05:56.4026890Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
2026-09-13T14:05:56.4055160Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
2026-09-13T14:05:56.4263273Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
2026-09-13T14:05:56.4291791Z http.https://github.com/.extraheader
2026-09-13T14:05:56.4310111Z [command]/usr/bin/git config --local --unset-all http.https://github.com/.extraheader
2026-09-13T14:05:56.4338649Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
2026-09-13T14:05:56.4590789Z [command]/usr/bin/git config --local --name-only --get-regexp ^includeIf\.gitdir:
2026-09-13T14:05:56.4622307Z [command]/usr/bin/git submodule foreach --recursive git config --local --show-origin --name-only --get-regexp remote.origin.url
2026-09-13T14:05:56.5029534Z Cleaning up orphan processes
2026-09-13T14:05:56.5328245Z ##[warning]Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/cache@v4, actions/checkout@v4, actions/setup-node@v4, pnpm/action-setup@v4. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
9
9
1248.667 × 3602







Run pnpm run build
$ next build && opennextjs-cloudflare build --skipNextBuild
⚠ No build cache found. Please configure build caching for faster rebuilds. Read more: https://nextjs.org/docs/messages/no-cache
Attention: Next.js now collects completely anonymous telemetry regarding usage.
This information is used to shape Next.js' roadmap and prioritize features.
You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
https://nextjs.org/telemetry

   ▲ Next.js 15.2.0

   Creating an optimized production build ...
Failed to compile.

../../lib/study-engine/src/index.ts
Module not found: Can't resolve './sm2.js'

https://nextjs.org/docs/messages/module-not-found

Import trace for requested module:
./src/app/(dashboard)/flashcards/page.tsx

../../lib/study-engine/src/index.ts
Module not found: Can't resolve './streaks.js'

https://nextjs.org/docs/messages/module-not-found

Import trace for requested module:
./src/app/(dashboard)/flashcards/page.tsx


> Build failed because of webpack errors
[ELIFECYCLE] Command failed with exit code 1.
Error: Process completed with exit code 1.