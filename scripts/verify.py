"""Run the same frozen checks for both attempts and retain actual output."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import os
import shutil
import subprocess

ROOT = Path(__file__).resolve().parent.parent
protocol = json.loads((ROOT / "evidence/protocol.json").read_text())
results = {"date_utc": datetime.now(timezone.utc).isoformat(), "arms": {}}
all_ok = True
for arm in ("direct", "with-spec"):
    folder = ROOT / arm
    records = []
    for filename, expected in (("brief.md", protocol["brief_sha256"]), ("tests/acceptance.test.mjs", protocol["tests_sha256"])):
        actual = hashlib.sha256((folder / filename).read_bytes()).hexdigest()
        ok = actual == expected
        records.append({"file": filename, "sha256": actual, "matches_frozen": ok})
        all_ok = all_ok and ok
    outputs = []
    commands = [["node", "--test", "tests/acceptance.test.mjs"], ["node", "--check", "app.mjs"], ["node", "--check", "domain.mjs"]]
    command_records = []
    for command in commands:
        process = subprocess.run(command, cwd=folder, capture_output=True, text=True)
        outputs.append("$ " + " ".join(command) + "\n" + process.stdout + process.stderr + "exit=" + str(process.returncode) + "\n")
        command_records.append({"command": command, "exit_code": process.returncode})
        all_ok = all_ok and process.returncode == 0
    output_path = ROOT / "evidence" / arm / "coordinator-checks.txt"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(outputs))
    same_initial = {name: (folder / name).read_bytes() == (folder / "initial" / name).read_bytes() for name in ("index.html", "styles.css", "app.mjs", "domain.mjs")}
    results["arms"][arm] = {"frozen_files": records, "commands": command_records, "initial_equals_current": same_initial}
    print(arm + ": " + ("PASS" if all(x["exit_code"] == 0 for x in command_records) and all(x["matches_frozen"] for x in records) else "FAIL"))

openspec = os.environ.get("OPENSPEC_BIN") or shutil.which("openspec")
if openspec:
    command = [openspec, "validate", "build-tracker", "--strict", "--no-interactive"]
    process = subprocess.run(command, cwd=ROOT / "with-spec", capture_output=True, text=True, env={**os.environ, "OPENSPEC_TELEMETRY": "0"})
    (ROOT / "evidence/with-spec/coordinator-spec-validation.txt").write_text("$ " + " ".join(command) + "\n" + process.stdout + process.stderr + "exit=" + str(process.returncode) + "\n")
    results["openspec"] = {"status": "PASS" if process.returncode == 0 else "FAIL", "exit_code": process.returncode}
    all_ok = all_ok and process.returncode == 0
else:
    results["openspec"] = {"status": "NOT RUN", "reason": "Set OPENSPEC_BIN or install OpenSpec 1.14.1"}
    all_ok = False
results["status"] = "PASS" if all_ok else "FAIL"
(ROOT / "evidence/verification.json").write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n")
raise SystemExit(0 if all_ok else 1)
