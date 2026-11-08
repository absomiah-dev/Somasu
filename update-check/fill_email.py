"""Fill the Somasu update check email template.

Usage:  python3 fill_email.py <template.html> <results.json> <out.html>

results.json holds every {{PLACEHOLDER}} as a key, plus five lists:
  "actions":   [{"ACTION"}]                                          (empty = no "For you to do" box)
  "libraries": [{"LIB_NAME","LIB_PURPOSE","LIB_IN_USE","LIB_LATEST","LIB_STATUS","CHIP"}]
  "recs":      [{"REC_LABEL","REC_TEXT","CHIP"}]
  "staged":    [{"STAGED_ITEM","STAGED_STATE","CHIP"}]               (empty = no table under C)
  "checks":    [{"CHECK_NAME","CHECK_DETAIL","CHECK_RESULT","CHIP"}]
  "ideas":     [{"IDEA_NO","IDEA_TITLE","IDEA_TEXT","IDEA_EFFORT"}]   (template v3; empty = no list under F)
APPROVAL_TITLE / APPROVAL_TEXT (template v3): fill on preview runs and when a deploy waits for approval; "" hides the box.
Tones (STATUS, NEXT, DB, PUBLIC, SIGNUP and every CHIP) are one of OK, WARN, BAD, INFO.
Leave CTA_URL empty for no button. Text must already be HTML-escaped (&amp; &lt; &gt;).
Stops with "Unfilled placeholders" if anything is missing.
"""
import json, re, sys

TONES = {"OK": ("#1e8a5a", "#e6f4ec"), "WARN": ("#8a5a00", "#fdf1d6"),
         "BAD": ("#b0301e", "#fbe6e2"), "INFO": ("#5e6b64", "#eef0ec")}
LISTS = ["actions", "libraries", "recs", "staged", "checks", "ideas"]


def tone(d, key, prefix):
    if key in d:
        if d[key] not in TONES:
            sys.exit("Unknown tone %r for %s (use OK, WARN, BAD or INFO)" % (d[key], key))
        d[prefix + "_COLOUR"], d[prefix + "_BG"] = TONES[d.pop(key)]


def sub(s, d):
    for k, v in d.items():
        if isinstance(v, str):
            s = s.replace("{{%s}}" % k, v)
    return s


def main(tpl, data, out):
    t = open(tpl, encoding="utf-8").read()
    d = json.load(open(data, encoding="utf-8"))
    t = re.sub(r"\A\s*<!--.*?-->\s*", "", t, flags=re.S)   # drop the notes at the top
    for key in ["STATUS", "NEXT", "DB", "PUBLIC", "SIGNUP"]:
        tone(d, key, key)
    for name in LISTS:
        d.setdefault(name, [])
        for row in d[name]:
            tone(row, "CHIP", "CHIP")
    # optional blocks
    def keep(m):
        v = d.get(m.group(1))
        return m.group(2) if v else ""
    while True:     # repeat so blocks nested inside other blocks are handled too
        t2 = re.sub(r"[ \t]*<!-- IF (\w+) -->\n?(.*?)[ \t]*<!-- END IF \1 -->\n?", keep, t, flags=re.S)
        if t2 == t:
            break
        t = t2
    # repeats
    t = re.sub(r"<!-- REPEAT (\w+) -->(.*?)<!-- END REPEAT \1 -->",
               lambda m: "".join(sub(m.group(2), r) for r in d[m.group(1)]), t, flags=re.S)
    t = re.sub(r"<!--.*?-->\n?", "", t, flags=re.S)      # drop remaining comments
    t = sub(t, d)
    left = re.findall(r"{{\w+}}", t)
    if left:
        sys.exit("Unfilled placeholders: " + ", ".join(sorted(set(left))))
    open(out, "w", encoding="utf-8").write(t)
    print("ok", out, len(t), "chars")


if __name__ == "__main__":
    main(*sys.argv[1:4])
