import json
import logging
from datetime import UTC, datetime
from typing import Any

# Attributes every LogRecord has; anything else was passed via `extra=` and is emitted as a field.
_RESERVED = set(vars(logging.makeLogRecord({}))) | {"message", "asctime"}


class JsonFormatter(logging.Formatter):
    """One JSON object per line, so log aggregators (Railway, etc.) can index fields."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        payload.update({k: v for k, v in vars(record).items() if k not in _RESERVED})
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


def build_logging(log_format: str, level: str) -> dict[str, Any]:
    """Django LOGGING dict that writes to stdout as `text` or `json`."""
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "text": {"format": "%(asctime)s %(levelname)s %(name)s: %(message)s"},
            "json": {"()": JsonFormatter},
        },
        "handlers": {
            "console": {"class": "logging.StreamHandler", "formatter": log_format},
        },
        "root": {"handlers": ["console"], "level": level},
        "loggers": {
            "django": {"handlers": ["console"], "level": level, "propagate": False},
        },
    }
