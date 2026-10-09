"""Require complete parameter and return annotations across the internal package."""

import ast
from pathlib import Path

import pytest


PACKAGE_ROOT = Path(__file__).parents[2] / "src" / "rayoptics_web_utils"
PYTHON_FILES = tuple(sorted(PACKAGE_ROOT.rglob("*.py")))
IMPLICIT_PARAMETERS = frozenset({"self", "cls"})


def _missing_annotations(tree: ast.AST) -> list[str]:
    """Return ``line: function(parameter)`` entries for every unannotated parameter or return.

    ``self``/``cls`` are exempt, and ``__init__`` may omit its return annotation
    because Pyright infers ``None`` once its parameters are annotated.
    """
    missing: list[str] = []
    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        arguments = node.args
        parameters = [*arguments.posonlyargs, *arguments.args, *arguments.kwonlyargs]
        parameters += [parameter for parameter in (arguments.vararg, arguments.kwarg) if parameter is not None]
        for parameter in parameters:
            if parameter.annotation is None and parameter.arg not in IMPLICIT_PARAMETERS:
                missing.append(f"{node.lineno}: {node.name}({parameter.arg})")
        if node.returns is None and node.name != "__init__":
            missing.append(f"{node.lineno}: {node.name} -> ?")
    return missing


@pytest.mark.parametrize("path", PYTHON_FILES, ids=lambda path: str(path.relative_to(PACKAGE_ROOT)))
def test_every_function_is_fully_annotated(path: Path) -> None:
    """Pyright's basic mode does not flag missing returns, so this guard enforces both."""
    missing = _missing_annotations(ast.parse(path.read_text(encoding="utf-8")))

    assert not missing, "\n".join(missing)
