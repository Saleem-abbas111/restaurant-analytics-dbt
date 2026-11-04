"""Snowflake access for the API. Credentials come from environment variables only."""

import os
import threading
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
import snowflake.connector
from snowflake.connector import DictCursor, SnowflakeConnection
from snowflake.connector.errors import Error as SnowflakeError

# Load the project-root .env file, overriding outdated Windows variables.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = PROJECT_ROOT / ".env"
load_dotenv(dotenv_path=ENV_FILE, override=True)

# Snowflake error numbers that mean "your login session has expired"
_SESSION_EXPIRED = {390111, 390114}

_lock = threading.RLock()
_connection: SnowflakeConnection | None = None

class DatabaseNotConfigured(RuntimeError):
    """Raised when the Snowflake environment variables are missing."""


def _env(name: str, default: str = "") -> str:
    # .strip() removes accidental spaces, which once broke the dashboard login
    return os.environ.get(name, default).strip()


def _connect() -> SnowflakeConnection:
    account = _env("SNOWFLAKE_ACCOUNT")
    user = _env("SNOWFLAKE_USER")
    password = _env("SNOWFLAKE_PASSWORD")
    if not (account and user and password):
        raise DatabaseNotConfigured("SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER and SNOWFLAKE_PASSWORD must be set")
    return snowflake.connector.connect(
        account=account,
        user=user,
        password=password,
        role=_env("SNOWFLAKE_ROLE", "RESTAURANT_API_ROLE"),
        warehouse=_env("SNOWFLAKE_WAREHOUSE", "RESTAURANT_COMPUTE_WH"),
        database="RESTAURANT_DB",
        schema="MARTS",
        login_timeout=90,  # a first login can take 10+ seconds
        network_timeout=60,
        enable_server_session_keep_alive_auto_detection=False,
    )


def _get_connection() -> SnowflakeConnection:
    """Reuse one connection (logging in takes about 10 seconds); reconnect if it was closed."""
    global _connection
    if _connection is None or _connection.is_closed():
        _connection = _connect()
    return _connection


def _reset_connection() -> None:
    global _connection
    if _connection is not None:
        try:
            _connection.close()
        except SnowflakeError:
            pass
    _connection = None


def run_query(sql: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    """Run one SELECT and return rows as dictionaries (column names are UPPERCASE)."""
    with _lock:  # one query at a time over the shared connection: simple and safe
        for attempt in (1, 2):
            conn = _get_connection()
            try:
                cur = conn.cursor(DictCursor)
                try:
                    cur.execute(sql, params)
                    return list(cur.fetchall())
                finally:
                    cur.close()
            except SnowflakeError as exc:
                if attempt == 1 and getattr(exc, "errno", None) in _SESSION_EXPIRED:
                    _reset_connection()
                    continue
                raise
    raise RuntimeError("unreachable")
