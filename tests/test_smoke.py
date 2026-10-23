import pytest
from django.core.management import call_command


@pytest.mark.django_db
def test_no_missing_migrations() -> None:
    call_command("makemigrations", "--check", "--dry-run", verbosity=0)


def test_system_checks_pass() -> None:
    call_command("check", fail_level="WARNING")
