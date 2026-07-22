"""Regression guard: every KROL demo must still demonstrate its rule."""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

import krol_demos  # noqa: E402


def test_all_krol_demos_hold():
    for demo in krol_demos.DEMOS:
        assert demo() is True, f"{demo.__name__} no longer demonstrates its rule"
