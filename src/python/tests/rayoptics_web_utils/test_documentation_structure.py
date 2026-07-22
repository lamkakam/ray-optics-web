"""Enforce the source-documentation conventions for the internal package."""

import ast
import re
from pathlib import Path

import pytest


PACKAGE_ROOT = Path(__file__).parents[2] / "src" / "rayoptics_web_utils"
PYTHON_FILES = tuple(sorted(PACKAGE_ROOT.rglob("*.py")))

FILENAME_TITLE = re.compile(r"^#\s+.*\.py(?:`|\s|$)")
BOILERPLATE_HEADING = re.compile(
    r"^\s*#{2,3}\s+(?:Purpose|Behavior|Dependencies|Usages|Public Surface|"
    r"Public API|API|Exports(?:\s+\(Internal\))?|Function Details|Key Behaviors)$",
    re.MULTILINE,
)
SYMBOL_SIGNATURE_HEADING = re.compile(r"^\s*###\s+`[^`]+`$", re.MULTILINE)
DECORATIVE_SEPARATOR = re.compile(r"^\s*#\s*[-=*_]{3,}\s*$", re.MULTILINE)
COMMENTED_RETURN_EXAMPLE = re.compile(r"^\s*#\s*Returns:\s*", re.MULTILINE)


def _docstrings(tree: ast.AST) -> list[str]:
    """Return every module, class, and function docstring in ``tree``."""
    nodes = (
        node
        for node in ast.walk(tree)
        if isinstance(node, (ast.Module, ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef))
    )
    return [docstring for node in nodes if (docstring := ast.get_docstring(node, clean=False))]


@pytest.mark.parametrize("path", PYTHON_FILES, ids=lambda path: str(path.relative_to(PACKAGE_ROOT)))
def test_source_documentation_avoids_legacy_structure(path: Path) -> None:
    """Reject legacy headings and comment blocks that duplicate owning symbols."""
    source = path.read_text(encoding="utf-8")
    docstrings = _docstrings(ast.parse(source))
    violations: list[str] = []

    for docstring in docstrings:
        first_line = docstring.lstrip().splitlines()[0]
        if FILENAME_TITLE.match(first_line):
            violations.append(f"filename title: {first_line}")
        if match := BOILERPLATE_HEADING.search(docstring):
            violations.append(f"boilerplate heading: {match.group(0)}")
        if match := SYMBOL_SIGNATURE_HEADING.search(docstring):
            violations.append(f"symbol signature heading: {match.group(0)}")

    if match := DECORATIVE_SEPARATOR.search(source):
        violations.append(f"decorative separator: {match.group(0).strip()}")
    if match := COMMENTED_RETURN_EXAMPLE.search(source):
        violations.append(f"commented return example: {match.group(0).strip()}")

    assert not violations, "\n".join(violations)
