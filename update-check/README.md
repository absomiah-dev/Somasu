# Somasu update check kit (cloud copy)

A copy of `08_Update-Check` from Andy's project folder, kept here so the scheduled
update check can still send the designed HTML email (and run the tests) if it can't
reach the computer. The master copy is `CLAUDE_MASTER/My Projects/Somiah-Family-App/08_Update-Check`;
when that changes, update this copy in the next release's push (never a push on its own).

Netlify only publishes `public/`, so nothing in this folder goes on the website.

- `05-11-2026_Somiah-Family-App_Update-Email-Template-v2.html`: the email design (v2: Moringa colours to match Somasu 26 R5)
- `fill_email.py`: `python3 fill_email.py <template> <results.json> <out.html>`
- `01-11-2026_Somiah-Family-App_Update-Email-Example-Data-v1.json`: a worked example
- `email-icon.png`: the one inline attachment (`cid:att0`), the Somasu app icon
- `tests/`: `fn.test.mjs`, `ics.test.mjs`, `smoke.js`, `merge.test.js` (calendar duplicates), `sample.ics`
