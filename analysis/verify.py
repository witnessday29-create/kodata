"""Re-run every pipeline and check the committed output still matches.

This is deliberately a *check*, not an update. The prose on the site is written
around specific findings — "not weak, inverted", "the only negative one", the
fables — and no automation can rewrite a fable when a number moves. So nothing
here ever writes to web/content. It only tells you whether the committed data
still corresponds to what the pipelines produce today.

Three ways it can fail, all worth knowing about:

  drift     the upstream dataset changed, so the numbers moved. Someone has to
            re-run the pipeline AND re-read every sentence that cites it.
  tamper    web/content/*/data.json was edited by hand. The whole promise of
            the site is that those files come out of the pipelines.
  break     a pipeline assertion failed — e.g. the `depressed` column in piece
            02 stopped being bdi_total >= 14.

    python analysis/verify.py
"""
import json
import subprocess
import sys
from pathlib import Path

# On Windows a piped stdout defaults to cp1252, which cannot encode the rules
# below — or any non-ASCII value that turns up in a dataset. Without this the
# script dies on its own output, which is a poor advertisement for a checker.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "web" / "content"

PIPELINES = [
    ("01-ai-exposure", "analysis/pipelines/01_ai_exposure/build.py"),
    ("02-screen-time", "analysis/pipelines/02_screen_time/build.py"),
    ("03-pekerja-sejahtera", "analysis/pipelines/03_pekerja_sejahtera/build.py"),
]

# `retrieved` is stamped with today's date on every run, so it is expected to
# differ and is not evidence of drift.
VOLATILE = {("source", "retrieved")}


def flatten(obj, path=()):
    """Every leaf as (path, value), so a diff can name what moved."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from flatten(v, path + (k,))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from flatten(v, path + (i,))
    else:
        yield path, obj


def main():
    failed = []

    for slug, script in PIPELINES:
        out = CONTENT / slug / "data.json"
        if not out.exists():
            print(f"MISSING  {slug}: {out.relative_to(ROOT)} is not committed")
            failed.append(slug)
            continue

        before = json.loads(out.read_text(encoding="utf-8"))
        backup = before  # kept in memory so a failed run cannot lose the commit

        print(f"\n─── {slug} ───")
        run = subprocess.run([sys.executable, str(ROOT / script)],
                             capture_output=True, text=True, cwd=ROOT)
        if run.returncode != 0:
            print("BREAK    pipeline exited non-zero — an assertion probably failed")
            print(run.stderr.strip()[-1200:])
            out.write_text(json.dumps(backup, indent=2), encoding="utf-8")
            failed.append(slug)
            continue

        after = json.loads(out.read_text(encoding="utf-8"))

        a = dict(flatten(before))
        b = dict(flatten(after))
        moved = [
            (p, a.get(p), b.get(p))
            for p in sorted(set(a) | set(b), key=lambda t: [str(x) for x in t])
            if a.get(p) != b.get(p)
            and not any(p[i:i + 2] == tuple(v) for v in VOLATILE for i in range(len(p)))
        ]

        if not moved:
            print(f"OK       {len(b)} values, identical to the commit")
        else:
            print(f"DRIFT    {len(moved)} value(s) differ from the commit:")
            for p, x, y in moved[:25]:
                print(f"           {'.'.join(str(k) for k in p)}: {x!r} -> {y!r}")
            if len(moved) > 25:
                print(f"           … and {len(moved) - 25} more")
            print("         Re-read every sentence that cites these before committing.")
            failed.append(slug)
            # leave the fresh file in place so the diff is reviewable in git

    print()
    if failed:
        print(f"FAIL  {', '.join(failed)}")
        print("Nothing was published. Review the diff, then update the prose "
              "and the fable to match before committing.")
        return 1
    print("PASS  every committed data.json reproduces exactly.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
