from django.apps.registry import Apps
from django.db import migrations
from django.db.backends.base.schema import BaseDatabaseSchemaEditor


def backfill_mp4(apps: Apps, schema_editor: BaseDatabaseSchemaEditor) -> None:
    """Blank format has always meant mp4; store it explicitly so filenames get an extension."""
    FFmpegConfig = apps.get_model("app", "FFmpegConfig")
    FFmpegConfig.objects.filter(recording_format="").update(recording_format="mp4")


class Migration(migrations.Migration):
    dependencies = [("app", "0010_ffmpegconfig_recording_format_default")]

    operations = [migrations.RunPython(backfill_mp4, migrations.RunPython.noop)]
