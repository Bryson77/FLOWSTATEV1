# SAKTUS Pre-Launch Engineering Audit (The 100-Point System)
> **Note**: Formerly Flowstate. Rebranding to **Saktus** across all apps, packages, and assets scheduled for **Phase 5**.

Yeah. I did this as a **real pre-launch engineering checklist**, not a generic “make sure your buttons work” list.

I cross-referenced current OWASP Top 10:2025, OWASP API Security Top 10, OWASP ASVS 5.0, NIST SSDF, WCAG 2.2, Google Search/Page Experience guidance, HTTP security guidance, and app-store review requirements. OWASP's current Top 10, for example, puts broken access control first and now explicitly includes software supply-chain failures and security logging/alerting. ([OWASP Foundation][1])

The key thing I'd do with **your AI agent** is make this a **gated launch audit**, not 100 suggestions. It should inspect the actual repo, deployment, database, APIs, DNS, environment, and running production app wherever it has access.

# The 100-point pre-launch agent

### How the agent should score things

* **PASS** — verified automatically
* **FAIL** — definite launch blocker
* **WARN** — potential issue requiring human review
* **N/A** — genuinely doesn't apply
* **UNVERIFIED** — agent couldn't prove it

And importantly:

> **UNVERIFIED ≠ PASS.**

I'd also give certain checks **P0 severity**. A single P0 failure should prevent the agent from saying "ready to launch."

---

# 1. Product & requirements — 1–10

### 1. Core user journeys work

Test the primary journey from beginning to end.

Example:

`landing → signup → onboarding → core feature → save → logout → login → data still exists`

### 2. Every advertised feature actually works

Compare README, landing page, marketing copy and UI against implemented functionality.

No fake buttons.

### 3. No placeholder content

Detect:

* Lorem ipsum
* "Coming soon"
* test names
* fake emails
* placeholder images
* dummy statistics
* TODO UI

### 4. No dead-end screens

Every important screen must have a valid next action, back path, or exit.

### 5. Empty states exist

Test:

* zero records
* first-time user
* no notifications
* no search results
* no permissions
* no history

### 6. Error states exist

Kill APIs, disconnect network, submit invalid data and verify useful recovery UI.

### 7. Loading states exist

No unexplained frozen buttons or blank screens while requests execute.

### 8. Destructive actions have safeguards

Delete, revoke, cancel, remove, reset, etc.

### 9. Business rules are enforced server-side

The agent should specifically look for business rules implemented **only in frontend code**.

### 10. Scope matches the launch

Identify unfinished features accidentally exposed in production.

---

# 2. Authentication & authorization — 11–25

This deserves heavy weighting because OWASP currently ranks broken access control as the #1 web-app risk. ([OWASP Foundation][1])

### 11. Signup works

### 12. Login works

### 13. Logout actually invalidates the session

### 14. Password reset works

### 15. Password reset tokens expire

### 16. Password reset tokens cannot be reused

### 17. Email verification works if required

### 18. Session expiration works

### 19. Session refresh works

### 20. Protected routes cannot be accessed anonymously

### 21. Role-based authorization works

Test every role against every protected operation.

### 22. Object-level authorization works

Example:

User A cannot request:

`/api/users/B/data`

by simply changing `B`.

This is particularly important for APIs. OWASP specifically identifies Broken Object Level Authorization as API1. ([OWASP Foundation][2])

### 23. Function-level authorization works

A normal user cannot invoke admin functionality simply by discovering the endpoint.

### 24. Property-level authorization works

A user shouldn't be able to submit:

```json
{
  "name": "Bob",
  "role": "admin"
}
```

and have the backend blindly accept it.

### 25. Privilege escalation tests pass

Attempt:

`resident → trustee`

`user → admin`

`staff → superadmin`

etc.

---

# 3. Database & data integrity — 26–37

### 26. Database migrations are reproducible

### 27. Production schema matches application expectations

### 28. Foreign keys are correct

### 29. Required fields have constraints

### 30. Unique constraints exist where required

### 31. Race conditions are handled

Example:

Two users simultaneously claim the same resource.

### 32. Transactions are used where operations must be atomic

### 33. Database permissions are least-privilege

### 34. Row-level security is enabled where appropriate

For your Supabase architecture, this is a **major P0 check**.

### 35. RLS policies are tested

Not merely enabled.

Test:

* same tenant
* different tenant
* anonymous
* normal user
* admin
* deleted user

### 36. Sensitive columns aren't unnecessarily exposed

The agent should look for things like:

```sql
SELECT *
```

especially across API boundaries.

### 37. Database indexes cover important query paths

Check:

* foreign keys
* filtering
* sorting
* timestamps
* status
* tenant IDs

---

# 4. API security — 38–48

Modern applications are API-heavy, so this needs its own section. OWASP's API guidance explicitly calls out authorization, authentication, resource consumption, sensitive business flows, SSRF, API inventory and unsafe third-party API consumption. ([OWASP Foundation][3])

### 38. Every API endpoint is inventoried

### 39. No undocumented production endpoints

### 40. No debug endpoints

### 41. No test endpoints

### 42. API authentication is enforced correctly

### 43. API authorization is enforced correctly

### 44. Rate limits exist for sensitive operations

Especially:

* login
* signup
* password reset
* OTP
* expensive queries
* file uploads
* SMS
* email
* AI calls

### 45. Request body validation exists

### 46. Query parameters are validated

### 47. Pagination exists for potentially large datasets

### 48. Resource consumption is bounded

No:

```text
?page=1&limit=999999999
```

or unrestricted file uploads/API requests.

---

# 5. Security — 49–63

### 49. No secrets committed to Git

Search:

```text
API_KEY
SECRET
PASSWORD
TOKEN
PRIVATE_KEY
```

and common credential patterns.

### 50. Production secrets aren't exposed client-side

Check that server secrets aren't bundled into JavaScript.

### 51. Environment variables are correctly separated

Development ≠ staging ≠ production.

### 52. Dependencies are scanned

Check vulnerable/outdated packages.

### 53. Lockfile is committed

### 54. Dependency sources are trusted

Supply-chain security matters enough that OWASP now has **Software Supply Chain Failures** as A03. ([OWASP Foundation][1])

### 55. No suspicious dependencies

Look for:

* abandoned packages
* typosquatting
* unnecessary packages
* packages with dangerous install scripts

### 56. HTTPS works everywhere

### 57. HTTP redirects to HTTPS

### 58. Security headers are configured

At minimum investigate:

* CSP
* HSTS
* X-Content-Type-Options
* Referrer-Policy
* Permissions-Policy

MDN specifically identifies CSP, CORS, HSTS, Permissions-Policy and X-Content-Type-Options among relevant security controls. ([MDN Web Docs][4])

### 59. CORS is restrictive

No lazy:

```text
Access-Control-Allow-Origin: *
```

when credentials/sensitive APIs are involved.

### 60. CSRF protection exists where applicable

### 61. XSS protections are verified

Test reflected, stored and DOM-based attack paths.

### 62. Injection vulnerabilities are tested

Check:

* SQL
* NoSQL
* command
* LDAP
* template
* HTML

### 63. SSRF is tested where URLs are user-controlled

---

# 6. Privacy & user data — 64–70

### 64. Personally identifiable information is identified

The agent should create a data inventory.

### 65. Sensitive data isn't unnecessarily logged

No passwords, tokens, reset links, etc. in logs.

### 66. Sensitive data isn't unnecessarily stored

### 67. Data deletion works

### 68. Account deletion works

### 69. Privacy policy exists where required

### 70. Third-party data sharing is understood

The agent should identify:

* analytics
* email providers
* payment providers
* auth providers
* AI providers
* error monitoring
* advertising

---

# 7. Performance — 71–80

Google currently recommends good Core Web Vitals, secure delivery and mobile-friendly presentation as part of page experience. ([Google Developers][5])

### 71. Production build is actually optimized

### 72. No development mode accidentally deployed

### 73. JavaScript bundle size is reasonable

### 74. Images are optimized

### 75. Fonts are optimized

### 76. Lazy loading is used appropriately

### 77. Caching strategy is verified

And this is where your earlier **Redis vs Cloudflare caching** question fits.

The agent should understand:

```text
Browser cache
      ↓
CDN / Cloudflare
      ↓
Application cache / Redis
      ↓
Database
```

and verify each layer is doing what you think it is.

### 78. Core Web Vitals are acceptable

Current Google targets:

* **LCP < 2.5s**
* **INP < 200ms**
* **CLS < 0.1** ([Google Developers][6])

### 79. API response times are acceptable

Identify slow endpoints.

### 80. Database queries aren't obviously inefficient

Detect:

* N+1 queries
* missing indexes
* massive SELECTs
* unnecessary joins
* repeated requests

---

# 8. Frontend UX — 81–88

### 81. Responsive layout works

Test:

* mobile
* tablet
* desktop
* very wide screen

### 82. Touch targets are usable

### 83. Keyboard navigation works

### 84. Focus states exist

### 85. Forms are usable

Check:

* labels
* validation
* errors
* autofill
* keyboard types

### 86. Accessibility baseline passes

WCAG 2.2 is the current W3C recommendation, covering perceivable, operable, understandable and robust interfaces. ([W3C][7])

Test:

* semantic HTML
* keyboard navigation
* screen-reader labels
* contrast
* focus
* alt text
* accessible authentication

### 87. Dark/light mode doesn't break the UI

If supported.

### 88. Browser compatibility works

At minimum test the browsers you officially support.

---

# 9. SEO & public web presence — 89–94

### 89. Page titles exist

### 90. Meta descriptions exist

### 91. Canonical URLs are correct

### 92. robots.txt is intentional

### 93. sitemap.xml exists where appropriate

### 94. Open Graph/social metadata works

Also check:

* favicon
* manifest
* structured data
* 404 page
* redirects
* indexability

MDN specifically lists robots.txt and related controls as part of practical web security/site configuration. ([MDN Web Docs][8])

---

# 10. Infrastructure & deployment — 95–100

### 95. Production environment is reproducible

The agent should know how to build the application from a clean environment.

### 96. CI/CD passes

Check:

```text
install
→ lint
→ typecheck
→ test
→ build
→ deploy
```

### 97. Rollback works

This is **massively underrated**.

Don't just verify deployment works.

Verify:

> "Can I safely undo this deployment?"

### 98. Monitoring and error tracking work

The agent should verify that a production exception actually appears in your monitoring system.

### 99. Backups and recovery are verified

Not:

> "Backups are enabled."

Instead:

> "A backup exists and recovery has been tested."

### 100. Production smoke test passes

After deployment:

```text
DNS
 ↓
HTTPS
 ↓
homepage
 ↓
authentication
 ↓
database
 ↓
core feature
 ↓
API
 ↓
logout
```

If that fails, **STOP THE LAUNCH.**

---

# But I'd actually make your AI agent smarter than this

The list above is the **100 checks**.

But the actual agent should operate in **phases**.

## Phase 1 — Static inspection

It gets the repo and asks:

```text
What is this application?
What framework?
What database?
What APIs?
What authentication?
What external services?
What deployment platform?
What environment variables?
What user roles?
What sensitive data?
```

Then builds its own application map.

For example, with something like Estavo:

```text
Estavo
│
├── Resident app
├── Security app
├── Maintenance app
├── Management web
├── Trustee portal
├── Corporate dashboard
│
├── Supabase
│   ├── Auth
│   ├── DB
│   ├── Storage
│   └── RLS
│
├── Cloudflare
│   ├── DNS
│   ├── CDN
│   └── WAF
│
├── Twilio
├── Resend
└── Redis
```

Then it knows what checks are relevant.

---

# Phase 2 — Build audit

Run:

```text
lint
typecheck
unit tests
integration tests
E2E tests
production build
dependency audit
secret scan
```

No launch if any **critical** build check fails.

---

# Phase 3 — Security audit

This should be based heavily on:

**OWASP Top 10 2025 + OWASP API Top 10 + ASVS 5.0.**

OWASP ASVS 5.0 is currently the stable ASVS release, while the project also publishes bleeding-edge documentation separately. ([GitHub][9])

The agent shouldn't simply say:

> "Security looks good."

It should say:

```text
AUTHORIZATION
━━━━━━━━━━━━━━━━━━━━
✓ Resident → resident data
✓ Resident → own data
✗ Resident → other estate data

CRITICAL: Cross-tenant data exposure detected.

Endpoint:
GET /api/estates/:estateId/residents

Evidence:
estateId is accepted from client without server-side
authorization verification.

Launch blocked.
```

**That's the kind of agent you want.**

---

# Phase 4 — Attack simulation

Have it actively attempt:

```text
Unauthenticated access
↓
Horizontal privilege escalation
↓
Vertical privilege escalation
↓
IDOR
↓
SQL injection
↓
XSS
↓
CSRF
↓
SSRF
↓
Rate-limit bypass
↓
Mass assignment
↓
Sensitive data exposure
```

For APIs, this maps closely to OWASP's current API risks. ([OWASP Foundation][2])

---

# Phase 5 — Browser testing

The agent should actually use the application.

Not just inspect source code.

It should do:

```text
Open app
→ Signup
→ Login
→ Create record
→ Edit record
→ Delete record
→ Refresh
→ Logout
→ Login again
→ Verify persistence
```

Then repeat with different roles.

---

# Phase 6 — Production verification

This is where I'd make the agent **particularly strict**.

After deployment it should verify:

```text
DNS              ✓
TLS              ✓
CDN              ✓
Origin           ✓
Environment      ✓
Database         ✓
Auth             ✓
API              ✓
Core workflow    ✓
Monitoring       ✓
Error tracking   ✓
Backups          ✓
Rollback         ✓
```

Because a successful `npm run build` does **not** mean your application is ready for users.

---

# And I'd give the agent a launch verdict

Something like:

```text
╔══════════════════════════════════════╗
║          PRE-LAUNCH AUDIT            ║
╠══════════════════════════════════════╣
║ Critical checks       42/42  ✓       ║
║ Security checks       31/32  ✗       ║
║ Performance checks    14/15  ⚠       ║
║ UX checks              18/18  ✓       ║
║ Infrastructure         12/12  ✓       ║
╠══════════════════════════════════════╣
║ STATUS: BLOCKED                     ║
╚══════════════════════════════════════╝

BLOCKERS
1. Cross-tenant authorization failure
2. Missing rate limit on password reset
3. Production error tracking unverified
```

That's much more useful than an AI saying:

> "Your app looks ready! 🚀"

---

## One important change I'd make to your original idea

Don't call it simply a **"100-point checklist."**

Make it a:

### **AI Pre-Launch Verification System**

Because the agent shouldn't merely **check boxes**.

It should:

**discover → inspect → test → attack → measure → verify → report → block/approve.**

And it should maintain evidence for every result.

For every check:

```json
{
  "id": "SEC-AUTH-022",
  "category": "Authorization",
  "severity": "P0",
  "status": "FAIL",
  "evidence": "...",
  "affected_route": "...",
  "affected_file": "...",
  "recommendation": "...",
  "launch_blocker": true
}
```

That would turn this from a cool AI feature into something genuinely useful for **Estavo, Saktus (formerly Flow State, rebranding in Phase 5), your AWS projects, and basically every app you build going forward**.

The standards behind this aren't arbitrary either: OWASP's current guidance explicitly emphasizes access control, misconfiguration, supply-chain security, authentication, logging and exceptional-condition handling, while NIST's SSDF frames security as something integrated throughout the software lifecycle rather than bolted on immediately before release. ([OWASP Foundation][1])

If you want, I can turn these 100 checks into the **actual PRD/architecture for your AI pre-launch agent**, including its agents, tools, scoring system, database schema, and exact workflow.

[1]: https://owasp.org/Top10/2025/?utm_source=chatgpt.com "OWASP Top 10:2025"
[2]: https://owasp.org/API-Security/editions/2023/en/0x11-t10/?utm_source=chatgpt.com "OWASP Top 10 API Security Risks – 2023 - OWASP API Security Top 10"
[3]: https://owasp.org/blog/2023/07/03/owasp-api-top10-2023?utm_source=chatgpt.com "OWASP API Security Top 10 2023 has been released | OWASP Foundation"
[4]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers?utm_source=chatgpt.com "HTTP headers - HTTP | MDN"
[5]: https://developers.google.com/search/docs/appearance/page-experience?utm_source=chatgpt.com "Understanding Google Page Experience | Google Search Central  |  Documentation  |  Google for Developers"
[6]: https://developers.google.com/search/docs/appearance/core-web-vitals?utm_source=chatgpt.com "Understanding Core Web Vitals and Google search results | Google Search Central  |  Documentation  |  Google for Developers"
[7]: https://www.w3.org/TR/wcag/?utm_source=chatgpt.com "Web Content Accessibility Guidelines (WCAG) 2.2"
[8]: https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides?utm_source=chatgpt.com "Practical security implementation guides - Security | MDN"
[9]: https://github.com/OWASP/ASVS/releases?utm_source=chatgpt.com "Releases · OWASP/ASVS · GitHub"

Ahhh, got you. You’re narrowing the agent to the **actual launch-critical engineering areas**, not SEO, marketing metadata, etc.

I'd structure the **Top 100** around these six pillars:

| Area                               |  Checks |
| ---------------------------------- | ------: |
| 🎨 UI/UX & "non-vibecoded" quality |  **20** |
| 🗄️ CRUD & data integrity          |  **15** |
| 🔐 Security                        |  **20** |
| 📈 Scaling & performance           |  **15** |
| 👤 Authentication                  |  **15** |
| 🚪 Login & Sign-up                 |  **15** |
| **TOTAL**                          | **100** |

And I'd make the agent **actively test these**, not just inspect code.

## 1. UI/UX — 20 checks

The agent should specifically detect whether the app feels like a **real engineered product vs AI-generated/vibecoded UI**.

1. Consistent spacing system
2. Consistent typography hierarchy
3. Consistent button styles
4. Consistent border radius
5. Consistent iconography
6. Consistent color usage
7. No random gradients
8. No excessive glassmorphism
9. No unnecessary animations
10. No excessive rounded cards
11. No generic AI-dashboard layout
12. No duplicated UI patterns implemented differently
13. Proper visual hierarchy
14. Clear primary vs secondary actions
15. Proper empty states
16. Proper loading states
17. Proper error states
18. Proper success/confirmation states
19. Responsive at mobile/tablet/desktop
20. Complete user flows without UX dead ends

### The important one:

**21 isn't allowed because we're staying at 20**, but I'd actually make #11 a sophisticated visual heuristic.

The agent should ask:

> "Does this interface appear intentionally designed, or does it exhibit common AI-generated UI patterns?"

Things I'd flag:

```text
10 cards on one screen
+
gradient hero
+
huge rounded corners
+
random purple/blue gradients
+
every element in a card
+
unnecessary dashboard statistics
+
Lucide icons everywhere
+
excessive whitespace
+
generic "Welcome back, John 👋"
```

Not because those things are inherently bad, but because **the combination often screams generated UI**.

---

# 2. CRUD — 15 checks

For every major entity:

```text
CREATE
READ
UPDATE
DELETE
```

the agent verifies:

21. Create works
22. Read works
23. Update works
24. Delete works
25. Validation on create
26. Validation on update
27. Duplicate handling
28. Missing-record handling
29. Unauthorized CRUD attempts fail
30. Cross-user CRUD attempts fail
31. Cross-tenant CRUD attempts fail
32. Deleted records aren't accidentally accessible
33. Database constraints protect integrity
34. UI reflects mutations immediately/correctly
35. Refresh confirms persistence

And this is where an AI agent becomes useful.

It shouldn't say:

> "CRUD implemented."

It should actually execute:

```text
create record
↓
read record
↓
modify record
↓
refresh
↓
verify modification
↓
delete
↓
attempt to retrieve deleted record
```

---

# 3. Security — 20 checks

36. Secrets aren't in source
37. Secrets aren't in frontend bundles
38. `.env` isn't committed
39. Production credentials separated
40. Dependencies audited
41. SQL injection tested
42. XSS tested
43. CSRF tested where applicable
44. SSRF tested where applicable
45. Rate limiting exists
46. Brute-force protection exists
47. API authorization verified
48. IDOR/BOLA tested
49. Privilege escalation tested
50. Mass assignment tested
51. Input validation server-side
52. Output encoding appropriate
53. CORS correctly configured
54. Security headers configured
55. Sensitive information isn't exposed in errors/logs

**#48 is especially important for multi-tenant apps.**

For Estavo, the agent should aggressively test:

```text
Estate A user
       ↓
tries accessing
       ↓
Estate B record
       ↓
BLOCKED
```

Not merely:

```text
button isn't visible
```

because hiding the button isn't authorization.

---

# 4. Scaling & performance — 15 checks

56. Database indexes exist for major queries
57. No obvious N+1 queries
58. Pagination implemented
59. Large datasets don't load entirely
60. API response size bounded
61. File uploads have limits
62. Request body sizes bounded
63. Rate limits prevent resource abuse
64. Caching strategy exists where beneficial
65. Cache invalidation works
66. CDN configuration verified where applicable
67. Static assets optimized
68. Images optimized
69. Production bundle optimized
70. Application tested against realistic data volume

And **#70 is important**.

An app that works with:

```text
12 users
37 records
```

isn't necessarily ready for:

```text
10,000 users
5 million records
```

The agent should be able to generate/load synthetic data and test performance.

---

# 5. Authentication — 15 checks

71. Authentication provider configured correctly
72. Sessions created correctly
73. Sessions expire appropriately
74. Session refresh works
75. Logout invalidates session
76. Protected routes protected
77. Role system enforced server-side
78. Permission checks enforced server-side
79. Account recovery works
80. Password reset works
81. Reset tokens expire
82. Reset tokens can't be reused
83. Email verification works where required
84. MFA/2FA works where implemented
85. Authentication events are logged appropriately

---

# 6. Login + Sign-up — 15 checks

86. Sign-up form works
87. Login form works
88. Invalid credentials handled correctly
89. Duplicate email handling
90. Invalid email validation
91. Weak password handling
92. Password confirmation validation where used
93. Email verification flow
94. Login after verification
95. Logout → login persistence
96. Forgot password flow
97. Reset password flow
98. Session persistence across refresh
99. Session persistence across browser restart where intended
100. Authenticated user lands in the correct application state

---

# But here's the part I'd change

I wouldn't have the agent simply report:

> **87/100 checks passed**

because that's misleading.

I'd have **severity levels**.

### P0 — Launch blocker

Examples:

```text
❌ User can access another user's data
❌ Authentication bypass
❌ Password reset vulnerability
❌ Production secrets exposed
❌ CRUD bypasses authorization
❌ Database data corruption
```

### P1 — Must fix before serious launch

```text
⚠️ Broken mobile layout
⚠️ Missing loading states
⚠️ Slow database query
⚠️ Poor error handling
⚠️ Missing pagination
```

### P2 — Polish

```text
ℹ️ Inconsistent spacing
ℹ️ Minor typography issue
ℹ️ Animation inconsistency
```

Then the final result becomes:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━
     PRE-LAUNCH AUDIT
━━━━━━━━━━━━━━━━━━━━━━━━━━

UI/UX             18/20   ⚠️
CRUD              15/15   ✓
SECURITY          19/20   ❌
SCALING           13/15   ⚠️
AUTH              15/15   ✓
LOGIN/SIGNUP      15/15   ✓

TOTAL             95/100

P0 BLOCKERS: 1
P1 ISSUES:   4
P2 ISSUES:   3

━━━━━━━━━━━━━━━━━━━━━━━━━━
       LAUNCH: BLOCKED
━━━━━━━━━━━━━━━━━━━━━━━━━━

BLOCKER

SEC-048
Cross-tenant data access detected.

User from Estate A can retrieve
Estate B records by modifying
the estate_id parameter.
```

**That** is the direction I'd take.

And honestly, for the thing you're describing, **UI/UX should not just mean accessibility and responsiveness**. Your "non-vibecoded look" requirement is actually valuable. The agent should have a dedicated **Design Quality Audit** that evaluates consistency, hierarchy, spacing, component reuse, visual noise, interaction patterns and whether the implementation appears intentionally designed.

For your use case, I'd call the six modules:

**Design → CRUD → Security → Scale → Auth → Identity**

and make **Security + Auth hard launch gates**, while UI/UX can have a quality score.

Would you like the next version to focus more on the agent’s audit workflow or on the exact 100-check scoring schema?
