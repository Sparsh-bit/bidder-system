import sys
import os

def test_app_import():
    """
    Simple smoke test to verify that the Flask app can be imported.
    This catches 'ModuleNotFoundError' and syntax errors in app.py.
    """
    try:
        from backend.app import app
        assert app is not None
        print("Successfully imported backend.app.app")
    except ImportError as e:
        print(f"Failed to import app: {e}")
        # Print sys.path to help debug
        print(f"sys.path: {sys.path}")
        raise
