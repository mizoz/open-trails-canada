#!/usr/bin/env python3
"""Check translations against English and facts.json.

Run: python3 scripts/check.py
Fails on: invalid JSON, unknown link ids, unknown {placeholders},
topic/block structure that differs from English, or missing UI keys.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PH = re.compile(r"\{([a-z0-9_]+)\}")


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def strings(node):
    if isinstance(node, str):
        yield node
    elif isinstance(node, list):
        for x in node:
            yield from strings(x)
    elif isinstance(node, dict):
        for k, v in node.items():
            if k not in ("id", "icon", "links", "kind"):
                yield from strings(v)


def paras(block):
    p = block.get("p")
    return len(p) if isinstance(p, list) else (1 if p else 0)


def main():
    facts = load(ROOT / "data/facts.json")
    langs = load(ROOT / "i18n/languages.json")
    en = load(ROOT / "i18n/en.json")
    errors = []

    for place in facts["places"]:
        for lid in place.get("links", []):
            if lid not in facts["links"]:
                errors.append(f"facts: place {place['id']} -> unknown link {lid}")
        if place["id"] not in en["places"]:
            errors.append(f"en: missing place text for {place['id']}")
    for lid in facts.get("officialMaps", []):
        if lid not in facts["links"]:
            errors.append(f"facts: officialMaps -> unknown link {lid}")

    en_shape = [(t["id"], len(t["blocks"])) for t in en["topics"]]

    for lang in langs:
        code = lang["code"]
        path = ROOT / f"i18n/{code}.json"
        if not path.exists():
            errors.append(f"{code}: file missing")
            continue
        try:
            doc = load(path)
        except json.JSONDecodeError as e:
            errors.append(f"{code}: invalid JSON: {e}")
            continue

        for s in strings(doc):
            for ph in PH.findall(s):
                if ph not in facts["values"]:
                    errors.append(f"{code}: unknown placeholder {{{ph}}} in: {s[:60]}")

        for k in en["ui"]:
            if k not in doc.get("ui", {}):
                errors.append(f"{code}: missing ui key {k}")

        shape = [(t["id"], len(t["blocks"])) for t in doc.get("topics", [])]
        if code != "en" and shape != en_shape:
            errors.append(f"{code}: topic/block structure differs from English")

        for t in doc.get("topics", []):
            for b in t["blocks"]:
                for lid in b.get("links", []):
                    if lid not in facts["links"]:
                        errors.append(f"{code}: topic {t['id']} -> unknown link {lid}")

        if code != "en":
            en_t = {t["id"]: t for t in en["topics"]}
            for t in doc.get("topics", []):
                for i, (b, eb) in enumerate(zip(t["blocks"], en_t[t["id"]]["blocks"])):
                    if b.get("links", []) != eb.get("links", []) or b.get("kind") != eb.get("kind"):
                        errors.append(f"{code}: {t['id']} block {i} links/kind differ from English")
                    for key in ("list", "terms"):
                        if len(b.get(key, [])) != len(eb.get(key, [])):
                            errors.append(f"{code}: {t['id']} block {i} {key} length differs")
                    if paras(b) != paras(eb):
                        errors.append(f"{code}: {t['id']} block {i} paragraph count differs")
            for pid in en["places"]:
                if pid not in doc.get("places", {}):
                    errors.append(f"{code}: missing place {pid}")

    if errors:
        print("\n".join(errors))
        print(f"\n{len(errors)} problem(s)")
        return 1
    print(f"OK: {len(langs)} languages, {len(en['topics'])} topics, {len(facts['links'])} links")
    return 0


if __name__ == "__main__":
    sys.exit(main())
