"""Read-side query helpers shared by views and API endpoints."""

from datetime import datetime

from django.db.models import Q, QuerySet

from .models import Recording


def filter_recordings(
    queryset: QuerySet[Recording],
    date: str | None = None,
    search: str | None = None,
    camera: str | None = None,
) -> QuerySet[Recording]:
    """
    Filter recordings, newest first.
    - date: YYYY-MM-DD; invalid dates are ignored rather than raising
    - search: matches camera name, s3_url or filename (case-insensitive)
    - camera: exact camera name (case-insensitive)
    """
    if date:
        try:
            parsed_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            pass
        else:
            queryset = queryset.filter(timestamp__date=parsed_date)

    if search:
        queryset = queryset.filter(
            Q(camera__name__icontains=search)
            | Q(s3_url__icontains=search)
            | Q(filename__icontains=search)
        )

    if camera:
        queryset = queryset.filter(camera__name__iexact=camera)

    return queryset.order_by("-timestamp")
