import pytest

from app.models import Camera, FFmpegConfig

from .factories import CameraFactory, RecordingFactory

pytestmark = pytest.mark.django_db


class TestCamera:
    def test_known_location_and_live_url(self) -> None:
        camera = CameraFactory.create(name="CAM2")

        assert camera.location == "Interior da Loja"
        assert camera.live_url == "rtc.didicameras.live/cam2"
        assert str(camera) == "CAM2 (Interior da Loja)"

    def test_unknown_camera_location(self) -> None:
        assert Camera(name="garage").location == "Local Desconhecido"


class TestRecording:
    def test_urls(self) -> None:
        recording = RecordingFactory.create(
            camera=CameraFactory.create(name="cam3"), filename="x.mp4"
        )

        assert recording.friendly_url == f"/cam3/{recording.pk}/"
        assert recording.public_direct_url == (
            "https://recordings.didicameras.live/recordings/cam3/x.mp4"
        )
        assert str(recording).startswith("cam3 - ")

    def test_public_url_empty_without_s3_url(self) -> None:
        assert RecordingFactory.create(s3_url="").public_direct_url == ""


class TestFFmpegConfig:
    def test_defaults(self) -> None:
        config = FFmpegConfig.objects.create()

        assert (config.recording_duration, config.recording_crf) == (5, 28)
        assert config.recording_format == "mp4"
        assert config.recording_preset == "veryfast"

    @pytest.mark.parametrize(
        ("duration", "crf", "expected"),
        [(0, 10, (1, 18)), (7, 30, (7, 30)), (2.6, 20.4, (3, 20))],
    )
    def test_save_rounds_and_clamps(
        self, duration: float, crf: float, expected: tuple[int, int]
    ) -> None:
        config = FFmpegConfig(recording_duration=duration, recording_crf=crf)
        config.save()

        assert (config.recording_duration, config.recording_crf) == expected

    def test_reset_to_default(self) -> None:
        config = FFmpegConfig.objects.create(
            recording_crf=31, recording_duration=20, recording_format="mkv", recording_preset="slow"
        )

        config.reset_to_default()
        config.refresh_from_db()

        assert (config.recording_crf, config.recording_duration) == (28, 5)
        assert (config.recording_format, config.recording_preset) == ("mp4", "veryfast")
        assert config.recording_resolution == ""

    @pytest.mark.parametrize(
        ("resolution", "label"),
        [
            ("480:360", "Baixa"),
            ("1080:720", "Média"),
            ("1920:1080", "Alta"),
            ("", "Nativa"),
            ("640:480", "640:480"),
        ],
    )
    def test_resolution_display(self, resolution: str, label: str) -> None:
        assert FFmpegConfig(recording_resolution=resolution).get_resolution_display == label

    @pytest.mark.parametrize(
        ("crf", "label"),
        [
            (18, "Alta"),
            (21, "Alta"),
            (22, "Média"),
            (26, "Baixa"),
            (30, "Muito Baixa"),
            (32, "Muito Baixa"),
            (40, "Indefinido"),
        ],
    )
    def test_crf_display(self, crf: int, label: str) -> None:
        assert FFmpegConfig(recording_crf=crf).get_crf_display == label

    def test_str_lists_settings(self) -> None:
        text = str(FFmpegConfig(recording_crf=20, recording_preset="slow"))

        assert "CRF: 20" in text
        assert "Preset: slow" in text
