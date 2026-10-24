from datetime import datetime

import pytest
from django.utils import timezone

from app.models import Recording
from app.selectors import filter_recordings

from .factories import CameraFactory, RecordingFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def recordings() -> list[Recording]:
    day = timezone.make_aware(datetime(2025, 6, 1, 12, 0))
    return [
        RecordingFactory.create(
            camera=CameraFactory.create(name="cam1"), filename="a.mp4", timestamp=day
        ),
        RecordingFactory.create(camera=CameraFactory.create(name="cam2"), filename="b.mp4"),
    ]


def test_no_filters_returns_all_newest_first(recordings: list[Recording]) -> None:
    result = list(filter_recordings(Recording.objects.all()))

    assert [r.pk for r in result] == [recordings[1].pk, recordings[0].pk]


def test_date_filter(recordings: list[Recording]) -> None:
    result = filter_recordings(Recording.objects.all(), date="2025-06-01")

    assert [r.pk for r in result] == [recordings[0].pk]


def test_invalid_date_is_ignored(recordings: list[Recording]) -> None:
    assert filter_recordings(Recording.objects.all(), date="not-a-date").count() == 2


@pytest.mark.parametrize("search", ["cam2", "b.mp4", "B.MP4"])
def test_search(recordings: list[Recording], search: str) -> None:
    result = filter_recordings(Recording.objects.all(), search=search)

    assert [r.pk for r in result] == [recordings[1].pk]


def test_camera_filter_is_case_insensitive(recordings: list[Recording]) -> None:
    result = filter_recordings(Recording.objects.all(), camera="CAM1")

    assert [r.pk for r in result] == [recordings[0].pk]


def test_filters_combine(recordings: list[Recording]) -> None:
    assert not filter_recordings(Recording.objects.all(), camera="cam1", search="b.mp4").exists()
