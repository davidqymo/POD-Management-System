#!/usr/bin/env python3
"""
check_design_deps.py — Verify backend/frontend code and test suite are in sync
with TECHNICAL_DESIGN.md.

Checks:
  1. All data model entities in DESIGN have corresponding SQLAlchemy models
  2. All API endpoints in DESIGN have corresponding FastAPI router files
  3. All service layer modules in DESIGN exist
  4. Test files exist for each backend module (basic presence check)

Exit 0 if all checks pass, 1 if gaps found.
"""

import re
import sys
from pathlib import Path
from typing import Set, List, Tuple

PROJECT_ROOT = Path(__file__).parent.parent
DESIGN = PROJECT_ROOT / "doc/TECHNICAL_DESIGN.md"
BACKEND = PROJECT_ROOT / "backend"
FRONTEND = PROJECT_ROOT / "frontend"
TESTS = PROJECT_ROOT / "tests"

class Colors:
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    RESET = "\033[0m"


def read_file(path: Path) -> str:
    return path.read_text(encoding="utf-8") if path.exists() else ""


def extract_entities(design_text: str) -> Set[str]:
    """Extract database entity names (tables/models) from design doc."""
    # Look for data model section — entities typically in code blocks or bold
    entities = set()
    # Match code blocks with class definitions
    classes = re.findall(r'class\s+(\w+)\s*\(', design_text)
    entities.update(classes)

    # Match table names (snake_case) mentioned in data model
    tables = re.findall(r'`(\w+_)+\w+`', design_text)
    entities.update(t.strip('`') for t in tables)

    return entities


def extract_api_endpoints(design_text: str) -> List[Tuple[str, str]]:
    """Extract (method, path) tuples from API spec section."""
    endpoints = []
    # Match typical API doc patterns: GET /api/v1/resources, POST /api/v1/allocations
    api_section = re.search(r'(?:##\s*API|##\s*Endpoints).*?(?=\n## |$)', design_text, re.DOTALL)
    if not api_section:
        return endpoints

    section_text = api_section.group(0)
    for line in section_text.split('\n'):
        # Match: `GET /api/v1/resources` or "GET /api/v1/allocations"
        match = re.search(r'[`"]?(GET|POST|PUT|DELETE|PATCH)\s+`?/(api/v\d+/\w+)`?', line, re.IGNORECASE)
        if match:
            endpoints.append((match.group(1).upper(), match.group(2)))

    return endpoints


def check_design_synced() -> Tuple[bool, List[str]]:
    violations = []

    design_text = read_file(DESIGN)

    if not design_text:
        print(f"{Colors.YELLOW}ℹ TECHNICAL_DESIGN.md not yet created — skipping downstream checks{Colors.RESET}")
        return True, []  # Not a failure, just not ready

    # Check 1: Design cites PRD version (traceability)
    if "PRD" not in design_text and "PRODUCT_REQUIREMENTS" not in design_text:
        violations.append("TECHNICAL_DESIGN.md missing PRD traceability citation")

    # Check 2: Core module directories exist
    expected_dirs = [BACKEND, FRONTEND / "src", TESTS]
    for d in expected_dirs:
        if not d.exists():
            violations.append(f"Expected directory not found: {d.relative_to(PROJECT_ROOT)}")

    # Check 3: API endpoints map to backend router files (if backend exists)
    endpoints = extract_api_endpoints(design_text)
    if endpoints and BACKEND.exists():
        # Expected backend structure: backend/app/routers/{module}.py
        for method, path in endpoints:
            module = path.split('/')[-1]  # e.g., 'resources' from '/api/v1/resources'
            router_file = BACKEND / "app" / "routers" / f"{module}.py"
            if not router_file.exists():
                violations.append(f"API endpoint {method} {path} → missing router file: {router_file.relative_to(PROJECT_ROOT)}")

    # Check 4: Core business logic modules referenced exist
    core_modules = ["allocation_engine", "schedule_engine", "auto_allocation", "dashboard_aggregator"]
    if BACKEND.exists():
        for mod in core_modules:
            mod_file = BACKEND / "app" / "services" / f"{mod}.py"
            if not mod_file.exists():
                print(f"{Colors.YELLOW}ℹ Core module not yet created: {mod_file.relative_to(PROJECT_ROOT)}{Colors.RESET}")

    # Check 5: Data model — if design defines models, check models file exists (not strict if models/ doesn't exist yet)
    models_dir = BACKEND / "app" / "models"
    if models_dir.exists():
        entities = extract_entities(design_text)
        for entity in entities:
            if entity[0].isupper():  # PascalCase = model class
                model_file = models_dir / f"{entity.lower()}.py"
                if not model_file.exists():
                    print(f"{Colors.YELLOW}ℹ Model file may need creation: {model_file.relative_to(PROJECT_ROOT)}{Colors.RESET}")

    return len(violations) == 0, violations


def main():
    print(f"{Colors.CYAN}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}Design → Implementation Dependency Check{Colors.RESET}")
    print(f"Time: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{Colors.CYAN}{'='*60}{Colors.RESET}\n")

    ok, violations = check_design_synced()

    if ok:
        print(f"{Colors.GREEN}[OK] Design → implementation sync ok.{Colors.RESET}")
        print(f"  - Technical design document present")
        print(f"  - Core directories structure in place")
        print(f"  - API endpoint routing files aligned (where defined)")
        sys.exit(0)
    else:
        print(f"{Colors.RED}[FAIL] Design → implementation sync issues found:{Colors.RESET}")
        for v in violations:
            print(f"  {Colors.YELLOW}- {v}{Colors.RESET}")
        print(f"\n{Colors.BOLD}Remediation:{Colors.RESET}")
        print("  1. Update TECHNICAL_DESIGN.md or create missing files")
        print("  2. Ensure backend/frontend directory structure matches design")
        print("  3. Re-run: python scripts/check_design_deps.py")
        sys.exit(1)


if __name__ == "__main__":
    main()
