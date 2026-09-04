#!/usr/bin/env python3
"""Legacy entry point — regenerates all brand assets."""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "generate-brand-assets.py"

raise SystemExit(subprocess.call([sys.executable, str(SCRIPT)]))
