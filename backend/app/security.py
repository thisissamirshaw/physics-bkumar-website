import base64
import hashlib
import hmac
import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import get_settings

_bearer = HTTPBearer(auto_error=False)


def _sign(payload: str) -> str:
    key = get_settings().secret_key.encode()
    return hmac.new(key, payload.encode(), hashlib.sha256).hexdigest()


def create_token() -> tuple[str, int]:
    exp = int(time.time()) + get_settings().token_ttl_hours * 3600
    payload = f"admin:{exp}"
    raw = f"{payload}:{_sign(payload)}".encode()
    return base64.urlsafe_b64encode(raw).decode().rstrip("="), exp


def verify_token(token: str) -> bool:
    try:
        padded = token + "=" * (-len(token) % 4)
        raw = base64.urlsafe_b64decode(padded.encode()).decode()
        payload, sig = raw.rsplit(":", 1)
        role, exp = payload.split(":")
    except (ValueError, UnicodeDecodeError):
        return False
    if role != "admin" or not hmac.compare_digest(sig, _sign(payload)):
        return False
    return int(exp) > time.time()


def check_password(password: str) -> bool:
    return hmac.compare_digest(password.encode(), get_settings().admin_password.encode())


def require_admin(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> None:
    if creds is None or not verify_token(creds.credentials):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail="Sign in again to continue.",
            headers={"WWW-Authenticate": "Bearer"},
        )


class RateLimiter:
    """Small in-memory sliding-window limiter. Good enough for a single server."""

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def hit(self, key: str, limit: int, window: int) -> bool:
        now = time.monotonic()
        with self._lock:
            q = self._hits[key]
            while q and now - q[0] > window:
                q.popleft()
            if len(q) >= limit:
                return False
            q.append(now)
            return True

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


limiter = RateLimiter()


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"
