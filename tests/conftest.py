import pytest


@pytest.fixture(autouse=True)
def isolate_first_creation_profile_store(tmp_path, monkeypatch):
    """Keep first-creation profile persistence out of the working tree during tests."""

    monkeypatch.setenv("JJK_FIRST_CREATION_PROFILE_STORE", str(tmp_path / "first_creation_profiles.json"))
