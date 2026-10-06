# Job ingestion contract

Repo A submits normalized jobs to `POST /api/internal/v1/jobs`.

Authentication uses `Authorization: Bearer <SCRAPER_INGEST_SECRET>`.

Required JSON fields: `source`, `sourceJobId`, `company`, `title`, `jobUrl`, and `discoveredAt`.

Optional fields: `location`, `description`, `team`, and `datePosted`.

`jobUrl` must use HTTPS. Dates must be ISO-8601 strings. The server rejects unknown workflow fields such as approval, send status, user identity, and permissions. Jobs are deduplicated by `(source, sourceJobId)`.

Responses are `201 created`, `200 duplicate`, `400 validation error`, `401 authentication failure`, `429 rate limited`, or `5xx temporary/server failure`.
