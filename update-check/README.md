# Somasu update check
*Last updated: 09-11-2026*

The scheduled task **"Somasu update check and deploy"** runs at **08:47 UK on the 1st, 15th and 28th of every month**, the same way the St Kenelm's monthly check works. A run only counts as scheduled between 08:30 and 10:30 UK on one of those days; anything else (fired by hand) is a **test run** that never deploys or stages. Andy set it up on 01-11-2026; from 07-11-2026 (prompt v7) **nothing goes live without his approval** of exactly what is staged. It emails the results to SomiahDev@proton.me and does nothing else that is sent, published or deleted.

| Run | What it does |
|---|---|
| **28th: preview** | Checks and stages safe updates, then emails **exactly what would go live on the 1st** (What's new wording, each change, test results, credits) and asks: **reply APPROVE or HOLD**. Never deploys. |
| **15th: mid-month check** | A. checks every part Somasu relies on for updates and security issues. C. schedules every needed update: safe ones (patch or minor versions of supabase-js or web-push, low or moderate security fixes) are staged in `06_Next-Update`, tested, with What's new notes, for the 1st. **Critical** ones (a High or Critical security issue that affects Somasu, or a provider change that would break it) are staged and sent to Andy straight away as an **urgent approval email** with a phone notification; they go live as soon as he approves. D, E: live site, database and sign-in checks. Emails the results. |
| **1st: monthly deploy** | Same checks, stages any new safe updates first, then, **if Andy has approved it**, deploys whatever is in `06_Next-Update` once (Netlify credits reset on the 1st), sets the next version number, checks the live site shows it, files the old build and empties `06_Next-Update`. Nothing staged = no deploy, no credits. No approval yet = nothing goes live; the email asks again and the next run checks again. |

**Bin day (prompt v9, 09-11-2026):** from 1 March to 15 April each run reads the council's new collection calendar (with WebFetch; the council's site blocks scripts) and emails Andy any changed dates to type into Family › Bin day. It never changes the app or the settings itself.

## Approving an update (from 07-11-2026)

- **By email only (Andy, 07-11-2026):** reply to any Somasu update email from SomiahDev@proton.me with **APPROVE** (or **HOLD**) as the first word. Works from your phone; your computer doesn't need to be on.
- An approval only counts for what was staged when you gave it. If anything is added afterwards, the run asks again.
- Silence, auto-replies and other senders never count.

## Ideas to improve Somasu (section F, from 07-11-2026)

Every email ends with up to three ideas. None is built unless you say yes: reply **YES 1** (or YES 1 3), or **NO 2** to turn one down. Approved ideas go on a list in `NEXT-UPDATE.md` for a working session with you to build and stage; ideas you turn down go on a declined list so they aren't suggested again.

## How a deploy works

Somasu's Netlify site deploys automatically from GitHub (`absomiah-dev/Somasu`, branch `main`). So a deploy is a push to `main`: one push = one production deploy = 15 credits. Nothing else may push to `main` between releases, or it costs credits and goes live untested.

Safety checks before the push (any failure stops the deploy and the email says why):
1. GitHub `main` matches `01_Site` and the live site shows the version `01_Site` says (nobody deployed anything newer).
2. `config.js` unchanged; no secret key anywhere in the build.
3. No database change needed (the same tables and functions as live); if one is needed, Andy runs the SQL first.
4. Version is the next release (same year: R + 1; new calendar year: R1), in all four places: `APP_YEAR`/`APP_RELEASE`/`APP_UPDATED` in `app.js`, the `app-version` meta in `index.html`, `CACHE` in `sw.js`, and the top `RELEASES` entry (What's new).
5. Tests pass: `tests/fn.test.mjs` (notifications and reminders, 23), `tests/ics.test.mjs` (calendar link service, 15), `tests/smoke.js` in try-out mode and with `--real` (version, files, Help, What's new, no console errors), `tests/merge.test.js` (calendar duplicates show once, 9), `tests/member.test.mjs` (member sign-in function, 19), and for releases that touch sign-in or the family screen, `tests/passwords.test.js` (Show / Hide and the Caps Lock note, 18) and `tests/members.test.js` (family members screen and colours, 21); for releases that touch lists, `tests/scan.test.js` (barcode scanner, Open Food Facts lookup and Compare prices, 24; add `--real` to use the real Open Food Facts, 23); `tests/bins.server.test.mjs` (bin day rule against the council's 2026-27 Thursday 1 calendar, and the 7pm reminder sent once, 16) and, for releases that touch Home or the calendar, `tests/bins.ui.test.js` (At a glance tiles, bin sheet, Bin day settings, 22).

Rollback: Netlify (SomiahDev account) › Deploys › the previous deploy › **Publish deploy**. Free and instant.

## Files here

| File | What it is |
|---|---|
| `07-11-2026_Somiah-Family-App_Update-Email-Template-v3.html` | The email design (v3 07-11-2026: approval box for previews and held updates, section F ideas; v2 05-11-2026 Moringa colours, kept as N-1): Moringa header with the Somasu icon, status banner, approval box, four key numbers, For you to do, sections A to F. Email-safe (tables, inline styles). |
| `05-11-2026_Somiah-Family-App_Update-Email-Template-v2.html` | Previous design (N-1). |
| `fill_email.py` | Fills the template (handles the v3 approval box and ideas list; still fills v2): `python3 fill_email.py <template> <results.json> <out.html>`. Stops if anything is missing. |
| `07-11-2026_Somiah-Family-App_Update-Email-Example-Data-v2.json` | A worked example of the results file for template v3 (a 28th preview with an update waiting for approval and two ideas). |
| `01-11-2026_Somiah-Family-App_Update-Email-Example-Data-v1.json` | The v2-template example (N-1). |
| `07-11-2026_Somiah-Family-App_Update-Check-Task-Prompt-v8.md` | Backup copy of the scheduled task's full instructions (v8 07-11-2026: approvals by email only; v7 the same day: 28th preview, approval before any deploy, ideas section, template v3). v7 kept as N-1; v6 to To_Delete. An earlier unapproved draft also labelled v7 (letting a deploy go ahead once a new table exists) is in To_Delete and was never used. If the task is lost, recreate it from this. |
| `07-11-2026_Somiah-Family-App_Update-Check-Task-Prompt-v7.md` | Previous instructions (N-1). |
| `email-icon.png` | The Somasu icon, sent as the email's one inline attachment (`cid:att0`). |
| `tests/` | `fn.test.mjs`, `ics.test.mjs` (run from the site folder after `npm ci`, with `SITE=$PWD`), `smoke.js` (`node smoke.js <public folder> [--real]`, needs Playwright), `merge.test.js` (`node merge.test.js <public folder>`), `member.test.mjs` (run like `fn.test.mjs`), `passwords.test.js` and `members.test.js` (serve `public` with its real config.js on a local port, then `node <test> <port>`; sign-in is mocked), `bins.server.test.mjs` (run like `fn.test.mjs`), `bins.ui.test.js` (`node bins.ui.test.js <public folder>`), `scan.test.js` (`node scan.test.js <public folder> <tests folder> [--real]`; Chromium's fake camera plays `beanz.png` as a video, made with ffmpeg the first time), `sample.ics`. |

## Cloud copy of this kit (from 26 R3)

The template, `fill_email.py`, example data, icon and `tests/` are also in the GitHub repo under `update-check/` (not published: Netlify only serves `public/`). If a run can't reach this folder it still sends the designed HTML email from that copy, instead of plain text. If you change the template here, the next release's push should copy it to `update-check/` too (never a push just for that, it costs 15 credits).

## The email

Sent from Andy's Gmail to **SomiahDev@proton.me**. Subject: `Somasu update preview DD-MM-YYYY: 26 R9 ready: reply APPROVE or HOLD`, `Somasu mid-month check DD-MM-YYYY: All OK` or `Somasu monthly deploy …`, ending for example `All OK`, `Needs a quick look`, `Waiting for your approval: 26 R9`, `Live: 26 R9` or `Action needed`. The cloud copy in the repo's `update-check/` still has template v2 until the next release's push copies v3 across; v2 simply leaves out the approval box and ideas.

Tones: **OK** green, **WARN** amber, **BAD** red, **INFO** grey. Overall status is BAD for any failed check, a paused database, family data visible to the public, sign-ups open, or a failed or blocked deploy.

Database line: the keep-alive (`rpc/keep_alive`) should reply `ok <time>`. 404 = the function is missing (re-run the database script). No answer or "paused" = Supabase paused the project: Supabase › Restore project (data is kept). The reminders job on Netlify (every 5 minutes) normally keeps it awake; its log is only in the SomiahDev Netlify account.
