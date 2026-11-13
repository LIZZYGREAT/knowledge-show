"""Project-scoped SQLite storage for knowledge research and review records."""

from __future__ import annotations

import hashlib
import json
import re
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator, TypeVar
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import BaseModel

from .models import (
    Claim,
    ClaimEvidence,
    CreativeLead,
    Issue,
    ResearchTask,
    Run,
    RunEvent,
    Source,
)


Record = TypeVar("Record", bound=BaseModel)
_TRACKING_PARAMETERS = {"fbclid", "gclid", "mc_cid", "mc_eid"}


class ResearchStore:
    """Small local store with explicit project scoping on every read."""

    def __init__(self, database_path: str | Path) -> None:
        self.database_path = Path(database_path)
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    @contextmanager
    def _connection(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self.database_path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA busy_timeout = 10000")
        try:
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    def _initialize(self) -> None:
        with self._connection() as connection:
            connection.execute("PRAGMA journal_mode = WAL")
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS research_tasks (
                    id TEXT NOT NULL,
                    project_id TEXT NOT NULL,
                    task_key TEXT NOT NULL,
                    status TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    PRIMARY KEY (project_id, id),
                    UNIQUE (project_id, task_key)
                );
                CREATE INDEX IF NOT EXISTS idx_research_tasks_open
                    ON research_tasks(project_id, status);

                CREATE TABLE IF NOT EXISTS sources (
                    id TEXT NOT NULL,
                    project_id TEXT NOT NULL,
                    normalized_url TEXT,
                    content_hash TEXT,
                    payload TEXT NOT NULL,
                    PRIMARY KEY (project_id, id)
                );
                CREATE UNIQUE INDEX IF NOT EXISTS idx_sources_url
                    ON sources(project_id, normalized_url) WHERE normalized_url IS NOT NULL;
                CREATE UNIQUE INDEX IF NOT EXISTS idx_sources_content_hash
                    ON sources(project_id, content_hash) WHERE content_hash IS NOT NULL;

                CREATE TABLE IF NOT EXISTS claims (
                    id TEXT NOT NULL,
                    project_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    provenance TEXT NOT NULL,
                    content_hash TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    PRIMARY KEY (project_id, id)
                );
                CREATE INDEX IF NOT EXISTS idx_claims_status
                    ON claims(project_id, status);
                CREATE INDEX IF NOT EXISTS idx_claims_content_hash
                    ON claims(project_id, content_hash);

                CREATE TABLE IF NOT EXISTS claim_evidence (
                    id TEXT NOT NULL,
                    project_id TEXT NOT NULL,
                    claim_id TEXT NOT NULL,
                    source_id TEXT,
                    payload TEXT NOT NULL,
                    PRIMARY KEY (project_id, id),
                    FOREIGN KEY (project_id, claim_id)
                        REFERENCES claims(project_id, id) ON DELETE CASCADE,
                    FOREIGN KEY (project_id, source_id)
                        REFERENCES sources(project_id, id) ON DELETE SET NULL
                );
                CREATE INDEX IF NOT EXISTS idx_evidence_claim
                    ON claim_evidence(project_id, claim_id);

                CREATE TABLE IF NOT EXISTS creative_leads (
                    id TEXT NOT NULL,
                    project_id TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    PRIMARY KEY (project_id, id)
                );

                CREATE TABLE IF NOT EXISTS issues (
                    id TEXT NOT NULL,
                    project_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    PRIMARY KEY (project_id, id)
                );
                CREATE INDEX IF NOT EXISTS idx_issues_status
                    ON issues(project_id, status);

                CREATE TABLE IF NOT EXISTS runs (
                    id TEXT NOT NULL,
                    project_id TEXT NOT NULL,
                    started_at TEXT NOT NULL,
                    status TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    PRIMARY KEY (project_id, id)
                );
                CREATE INDEX IF NOT EXISTS idx_runs_started
                    ON runs(project_id, started_at DESC);

                CREATE TABLE IF NOT EXISTS run_events (
                    sequence INTEGER PRIMARY KEY AUTOINCREMENT,
                    id TEXT NOT NULL,
                    project_id TEXT NOT NULL,
                    run_id TEXT NOT NULL,
                    phase TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    UNIQUE (project_id, id),
                    FOREIGN KEY (project_id, run_id)
                        REFERENCES runs(project_id, id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_run_events_order
                    ON run_events(project_id, run_id, sequence);

                CREATE TABLE IF NOT EXISTS packages (
                    project_id TEXT NOT NULL,
                    artifact_id TEXT NOT NULL,
                    revision INTEGER NOT NULL,
                    brief_revision INTEGER NOT NULL,
                    payload TEXT NOT NULL,
                    PRIMARY KEY (project_id, artifact_id, revision)
                );
                """
            )

    @staticmethod
    def _payload(record: BaseModel) -> str:
        return json.dumps(record.model_dump(mode="json"), ensure_ascii=False, separators=(",", ":"))

    def save_task(self, task: ResearchTask) -> ResearchTask:
        task_key = _normalize_task(task.question)
        with self._connection() as connection:
            existing = connection.execute(
                "SELECT payload FROM research_tasks WHERE project_id=? AND task_key=?",
                (task.project_id, task_key),
            ).fetchone()
            if existing:
                return _model(ResearchTask, existing["payload"])
            connection.execute(
                "INSERT INTO research_tasks(id, project_id, task_key, status, payload) VALUES(?,?,?,?,?)",
                (task.id, task.project_id, task_key, task.status.value, self._payload(task)),
            )
        return task

    def list_open_tasks(self, project_id: str) -> list[ResearchTask]:
        with self._connection() as connection:
            rows = connection.execute(
                "SELECT payload FROM research_tasks WHERE project_id=? AND status='open' ORDER BY rowid",
                (project_id,),
            ).fetchall()
        return [_model(ResearchTask, row["payload"]) for row in rows]

    def list_tasks(self, project_id: str, *, include_rejected: bool = False) -> list[ResearchTask]:
        query = "SELECT payload FROM research_tasks WHERE project_id=?"
        if not include_rejected:
            query += " AND status != 'rejected'"
        query += " ORDER BY rowid"
        with self._connection() as connection:
            rows = connection.execute(query, (project_id,)).fetchall()
        return [_model(ResearchTask, row["payload"]) for row in rows]

    def update_task_status(self, project_id: str, task_id: str, status: str) -> ResearchTask:
        if status not in {"open", "completed", "blocked", "rejected"}:
            raise ValueError("unsupported research task status")
        with self._connection() as connection:
            row = connection.execute(
                "SELECT payload FROM research_tasks WHERE project_id=? AND id=?",
                (project_id, task_id),
            ).fetchone()
            if row is None:
                raise KeyError(task_id)
            task = _model(ResearchTask, row["payload"])
            task.status = status
            connection.execute(
                "UPDATE research_tasks SET status=?, payload=? WHERE project_id=? AND id=?",
                (status, self._payload(task), project_id, task_id),
            )
        return task

    def save_source(self, source: Source) -> Source:
        normalized_url = normalize_url(source.url)
        with self._connection() as connection:
            existing = None
            if normalized_url:
                existing = connection.execute(
                    "SELECT id, payload FROM sources WHERE project_id=? AND normalized_url=?",
                    (source.project_id, normalized_url),
                ).fetchone()
            if existing is None and source.content_hash:
                existing = connection.execute(
                    "SELECT id, payload FROM sources WHERE project_id=? AND content_hash=?",
                    (source.project_id, source.content_hash),
                ).fetchone()
            if existing:
                prior = _model(Source, existing["payload"])
                # A stable URL can acquire updated content; keep its identity and refresh the record.
                if normalized_url and existing["id"] == source.id:
                    connection.execute(
                        "UPDATE sources SET normalized_url=?, content_hash=?, payload=? WHERE project_id=? AND id=?",
                        (normalized_url, source.content_hash, self._payload(source), source.project_id, source.id),
                    )
                    return source
                return prior
            connection.execute(
                "INSERT INTO sources(id, project_id, normalized_url, content_hash, payload) VALUES(?,?,?,?,?)",
                (source.id, source.project_id, normalized_url, source.content_hash, self._payload(source)),
            )
        return source

    def get_source(self, project_id: str, source_id: str) -> Source | None:
        with self._connection() as connection:
            row = connection.execute(
                "SELECT payload FROM sources WHERE project_id=? AND id=?",
                (project_id, source_id),
            ).fetchone()
        return _model(Source, row["payload"]) if row else None

    def read_source_content(self, project_id: str, source_id: str) -> str | None:
        source = self.get_source(project_id, source_id)
        if source is None or not source.content_path:
            return None
        path = Path(source.content_path)
        return path.read_text(encoding="utf-8") if path.is_file() else None

    def save_claim(self, claim: Claim) -> Claim:
        payload = self._payload(claim)
        content_hash = hashlib.sha256(claim.content.casefold().encode("utf-8")).hexdigest()
        with self._connection() as connection:
            connection.execute(
                """INSERT INTO claims(id, project_id, status, provenance, content_hash, payload)
                   VALUES(?,?,?,?,?,?) ON CONFLICT(project_id, id) DO UPDATE SET
                   status=excluded.status, provenance=excluded.provenance,
                   content_hash=excluded.content_hash, payload=excluded.payload""",
                (claim.id, claim.project_id, claim.status.value, claim.provenance.value, content_hash, payload),
            )
        return claim

    def save_claims(self, claims: list[Claim]) -> list[Claim]:
        for claim in claims:
            self.save_claim(claim)
        return claims

    def get_claim(self, project_id: str, claim_id: str) -> Claim | None:
        with self._connection() as connection:
            row = connection.execute(
                "SELECT payload FROM claims WHERE project_id=? AND id=?",
                (project_id, claim_id),
            ).fetchone()
        return _model(Claim, row["payload"]) if row else None

    def get_claim_and_evidence(self, claim_id: str, *, project_id: str) -> dict[str, Any] | None:
        claim = self.get_claim(project_id, claim_id)
        if claim is None:
            return None
        return {"claim": claim, "evidence": self.list_evidence(project_id, claim_id=claim_id)}

    def save_evidence(self, evidence: ClaimEvidence) -> ClaimEvidence:
        with self._connection() as connection:
            claim = connection.execute(
                "SELECT 1 FROM claims WHERE project_id=? AND id=?",
                (evidence.project_id, evidence.claim_id),
            ).fetchone()
            if claim is None:
                raise ValueError("claim evidence references a missing claim in this project")
            if evidence.source_id:
                source = connection.execute(
                    "SELECT 1 FROM sources WHERE project_id=? AND id=?",
                    (evidence.project_id, evidence.source_id),
                ).fetchone()
                if source is None:
                    raise ValueError("claim evidence references a missing source in this project")
            connection.execute(
                """INSERT INTO claim_evidence(id, project_id, claim_id, source_id, payload)
                   VALUES(?,?,?,?,?) ON CONFLICT(project_id, id) DO UPDATE SET
                   claim_id=excluded.claim_id, source_id=excluded.source_id, payload=excluded.payload""",
                (evidence.id, evidence.project_id, evidence.claim_id, evidence.source_id, self._payload(evidence)),
            )
        return evidence

    def list_evidence(self, project_id: str, *, claim_id: str | None = None) -> list[ClaimEvidence]:
        query = "SELECT payload FROM claim_evidence WHERE project_id=?"
        args: tuple[Any, ...] = (project_id,)
        if claim_id is not None:
            query += " AND claim_id=?"
            args += (claim_id,)
        query += " ORDER BY rowid"
        with self._connection() as connection:
            rows = connection.execute(query, args).fetchall()
        return [_model(ClaimEvidence, row["payload"]) for row in rows]

    def save_lead(self, lead: CreativeLead) -> CreativeLead:
        with self._connection() as connection:
            connection.execute(
                """INSERT INTO creative_leads(id, project_id, payload) VALUES(?,?,?)
                   ON CONFLICT(project_id, id) DO UPDATE SET payload=excluded.payload""",
                (lead.id, lead.project_id, self._payload(lead)),
            )
        return lead

    def list_leads(self, project_id: str) -> list[CreativeLead]:
        with self._connection() as connection:
            rows = connection.execute(
                "SELECT payload FROM creative_leads WHERE project_id=? ORDER BY rowid", (project_id,)
            ).fetchall()
        return [_model(CreativeLead, row["payload"]) for row in rows]

    def save_issue(self, issue: Issue) -> Issue:
        with self._connection() as connection:
            connection.execute(
                """INSERT INTO issues(id, project_id, status, payload) VALUES(?,?,?,?)
                   ON CONFLICT(project_id, id) DO UPDATE SET status=excluded.status, payload=excluded.payload""",
                (issue.id, issue.project_id, issue.status, self._payload(issue)),
            )
        return issue

    def list_issues(self, project_id: str, *, include_resolved: bool = False) -> list[Issue]:
        query = "SELECT payload FROM issues WHERE project_id=?"
        if not include_resolved:
            query += " AND status='open'"
        query += " ORDER BY rowid"
        with self._connection() as connection:
            rows = connection.execute(query, (project_id,)).fetchall()
        return [_model(Issue, row["payload"]) for row in rows]

    def save_run(self, run: Run) -> Run:
        with self._connection() as connection:
            connection.execute(
                """INSERT INTO runs(id, project_id, started_at, status, payload) VALUES(?,?,?,?,?)
                   ON CONFLICT(project_id, id) DO UPDATE SET started_at=excluded.started_at,
                   status=excluded.status, payload=excluded.payload""",
                (run.id, run.project_id, run.started_at.isoformat(), run.status, self._payload(run)),
            )
        return run

    def get_run(self, project_id: str, run_id: str) -> Run | None:
        with self._connection() as connection:
            row = connection.execute(
                "SELECT payload FROM runs WHERE project_id=? AND id=?", (project_id, run_id)
            ).fetchone()
        return _model(Run, row["payload"]) if row else None

    def list_runs(self, project_id: str, *, limit: int = 50) -> list[Run]:
        if not 1 <= limit <= 500:
            raise ValueError("run history limit must be between 1 and 500")
        with self._connection() as connection:
            rows = connection.execute(
                "SELECT payload FROM runs WHERE project_id=? ORDER BY started_at DESC LIMIT ?",
                (project_id, limit),
            ).fetchall()
        return [_model(Run, row["payload"]) for row in rows]

    def update_run(self, run: Run) -> Run:
        with self._connection() as connection:
            cursor = connection.execute(
                "UPDATE runs SET status=?, payload=? WHERE project_id=? AND id=?",
                (run.status, self._payload(run), run.project_id, run.id),
            )
            if cursor.rowcount == 0:
                raise KeyError(run.id)
        return run

    def save_run_event(self, project_id: str, event: RunEvent) -> RunEvent:
        with self._connection() as connection:
            run = connection.execute(
                "SELECT 1 FROM runs WHERE project_id=? AND id=?", (project_id, event.run_id)
            ).fetchone()
            if run is None:
                raise ValueError("run event references a missing run in this project")
            connection.execute(
                """INSERT INTO run_events(id, project_id, run_id, phase, event_type, payload)
                   VALUES(?,?,?,?,?,?) ON CONFLICT(project_id, id) DO UPDATE SET
                   phase=excluded.phase, event_type=excluded.event_type, payload=excluded.payload""",
                (event.id, project_id, event.run_id, event.phase, event.event_type, self._payload(event)),
            )
        return event

    def list_run_events(self, project_id: str, run_id: str) -> list[RunEvent]:
        with self._connection() as connection:
            rows = connection.execute(
                "SELECT payload FROM run_events WHERE project_id=? AND run_id=? ORDER BY sequence",
                (project_id, run_id),
            ).fetchall()
        return [_model(RunEvent, row["payload"]) for row in rows]

    def save_review(self, project_id: str, run_id: str, rating: str, note: str) -> Run:
        if rating not in {"usable", "needs_adjustment", "unusable"}:
            raise ValueError("unsupported human rating")
        if len(note) > 2000:
            raise ValueError("human review note cannot exceed 2000 characters")
        run = self.get_run(project_id, run_id)
        if run is None:
            raise KeyError(run_id)
        run.human_rating = rating
        run.human_note = note
        return self.update_run(run)

    def save_package(self, package: dict[str, Any]) -> dict[str, Any]:
        project_id = str(package["project_id"])
        artifact_id = str(package["artifact_id"])
        brief_revision = int(package["brief_revision"])
        with self._connection() as connection:
            latest = connection.execute(
                "SELECT revision, payload FROM packages WHERE project_id=? AND artifact_id=? ORDER BY revision DESC LIMIT 1",
                (project_id, artifact_id),
            ).fetchone()
            if latest and _same_package_content(json.loads(latest["payload"]), package):
                stable = json.loads(latest["payload"])
                package.clear()
                package.update(stable)
                return package
            revision = (latest["revision"] + 1) if latest else 1
            package["revision"] = revision
            payload = json.dumps(package, ensure_ascii=False, separators=(",", ":"))
            connection.execute(
                "INSERT INTO packages(project_id, artifact_id, revision, brief_revision, payload) VALUES(?,?,?,?,?)",
                (project_id, artifact_id, revision, brief_revision, payload),
            )
        return package

    def get_package(self, project_id: str, artifact_id: str, *, revision: int | None = None) -> dict[str, Any] | None:
        with self._connection() as connection:
            if revision is None:
                row = connection.execute(
                    "SELECT payload FROM packages WHERE project_id=? AND artifact_id=? ORDER BY revision DESC LIMIT 1",
                    (project_id, artifact_id),
                ).fetchone()
            else:
                row = connection.execute(
                    "SELECT payload FROM packages WHERE project_id=? AND artifact_id=? AND revision=?",
                    (project_id, artifact_id, revision),
                ).fetchone()
        return json.loads(row["payload"]) if row else None

    def search_claims(
        self,
        question: str,
        filters: dict[str, Any] | None = None,
        *,
        project_id: str,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        if not 1 <= limit <= 100:
            raise ValueError("claim search limit must be between 1 and 100")
        filters = filters or {}
        allowed_filters = {"status", "provenance"}
        if set(filters) - allowed_filters:
            raise ValueError("unsupported claim search filter")
        query = "SELECT payload FROM claims WHERE project_id=?"
        args: list[Any] = [project_id]
        for field in ("status", "provenance"):
            if field in filters:
                value = filters[field]
                values = [value] if isinstance(value, str) else list(value)
                if not values:
                    return []
                query += f" AND {field} IN ({','.join('?' for _ in values)})"
                args.extend(values)
        with self._connection() as connection:
            rows = connection.execute(query, args).fetchall()
            record_rows = [json.loads(row["payload"]) for row in rows]
        terms = _query_terms(question)
        if not terms:
            return []
        ranked: list[tuple[int, dict[str, Any]]] = []
        for item in record_rows:
            text = " ".join(
                [item["content"], item.get("explanation", ""), *item.get("conditions", []), *item.get("related_concepts", [])]
            ).casefold()
            score = sum(text.count(term) for term in terms)
            if score:
                evidence = self.list_evidence(project_id, claim_id=item["id"])
                ranked.append((score, {"claim": Claim.model_validate(item), "evidence": evidence}))
        ranked.sort(key=lambda row: row[0], reverse=True)
        return [value for _, value in ranked[:limit]]

    def get_related_claims(self, claim_id: str, *, project_id: str) -> list[Claim]:
        initial = self.get_claim(project_id, claim_id)
        if initial is None:
            return []
        found: dict[str, Claim] = {}
        pending = list(initial.depends_on)
        while pending:
            related_id = pending.pop()
            if related_id in found:
                continue
            related = self.get_claim(project_id, related_id)
            if related is None:
                continue
            found[related_id] = related
            pending.extend(related.depends_on)
        return list(found.values())


def normalize_url(value: str | None) -> str | None:
    if not value:
        return None
    parsed = urlsplit(value.strip())
    if parsed.scheme.casefold() not in {"http", "https"} or not parsed.hostname:
        return value.strip()
    scheme = parsed.scheme.casefold()
    hostname = parsed.hostname.casefold()
    port = parsed.port
    netloc = hostname if port is None or (scheme == "https" and port == 443) or (scheme == "http" and port == 80) else f"{hostname}:{port}"
    path = re.sub(r"/{2,}", "/", parsed.path or "/")
    if path != "/":
        path = path.rstrip("/")
    query = [
        (key, value)
        for key, value in parse_qsl(parsed.query, keep_blank_values=True)
        if not key.casefold().startswith("utm_") and key.casefold() not in _TRACKING_PARAMETERS
    ]
    query.sort()
    return urlunsplit((scheme, netloc, path, urlencode(query, doseq=True), ""))


def _model(model_type: type[Record], payload: str) -> Record:
    return model_type.model_validate_json(payload)


def _normalize_task(question: str) -> str:
    return " ".join(question.casefold().split())


def _query_terms(question: str) -> list[str]:
    text = question.casefold().strip()
    terms = set(re.findall(r"[a-z0-9_]+", text))
    for run in re.findall(r"[\u3400-\u9fff]+", text):
        if len(run) <= 5:
            terms.add(run)
        else:
            terms.update(run[index : index + 2] for index in range(len(run) - 1))
    return sorted(terms, key=lambda value: (-len(value), value))


def _same_package_content(left: dict[str, Any], right: dict[str, Any]) -> bool:
    ignored = {"revision", "created_at", "updated_at"}
    return {key: value for key, value in left.items() if key not in ignored} == {
        key: value for key, value in right.items() if key not in ignored
    }
