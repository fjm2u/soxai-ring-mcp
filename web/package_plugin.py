"""Add cloud skills to a ChatGPT-exported personal plugin, retaining its app mapping."""

import argparse
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("source", type=Path)
parser.add_argument("output", type=Path)
args = parser.parse_args()
if args.source.resolve() == args.output.resolve() or args.output.exists():
    parser.error("Choose a new output ZIP path.")
with ZipFile(args.source) as archive:
    manifest = json.loads(archive.read(".codex-plugin/plugin.json"))
    apps = json.loads(archive.read(".app.json"))
if not apps.get("apps") or any(set(v) - {"id", "required"} for v in apps["apps"].values()):
    parser.error("Expected a ChatGPT export with app identifiers only.")
parts = manifest["version"].split(".")
if len(parts) != 3 or not all(part.isdigit() for part in parts):
    parser.error("Expected a three-part numeric version.")
parts[-1] = str(int(parts[-1]) + 1)
manifest["version"] = ".".join(parts)
manifest["apps"] = "./.app.json"
manifest["skills"] = "./skills/"
# Exports may retain an old onboarding hook. OAuth is the complete setup flow.
manifest.get("extensions", {}).get("com.openai", {}).pop("onboardingSkill", None)
interface = manifest.setdefault("interface", {})
interface.update(
    capabilities=["Read"],
    category="Productivity",
    defaultPrompt=["SOXAI RINGの接続を確認して", "最近1週間の睡眠と活動を振り返って"],
)
with ZipFile(args.output, "x", ZIP_DEFLATED) as archive:
    archive.writestr(
        ".codex-plugin/plugin.json", json.dumps(manifest, ensure_ascii=False, indent=2)
    )
    archive.writestr(".app.json", json.dumps(apps, indent=2))
    for skill in (Path(__file__).parent / "skills").glob("*/SKILL.md"):
        archive.write(skill, "skills/" + skill.parent.name + "/SKILL.md")
print("Created", args.output)
