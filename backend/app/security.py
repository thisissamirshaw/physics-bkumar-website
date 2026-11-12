import base64
import hashlib
import hmac
import secrets
import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import get_settings
from .db import get_db
from .models import AdminUser

_bearer = HTTPBearer(auto_error=False)

# ---------- Passwords: scrypt from the standard library, salted per account ----------

_N, _R, _P = 2**14, 8, 1


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=_N, r=_R, p=_P, dklen=32)
    return f"scrypt${_N}${_R}${_P}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, n, r, p, salt, digest = stored.split("$")
        if scheme != "scrypt":
            return False
        expected = bytes.fromhex(digest)
        got = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=int(n), r=int(r), p=int(p), dklen=len(expected))
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(got, expected)


# Verified when the email is unknown, so a wrong email takes as long as a wrong password.
_DUMMY_HASH = hash_password(secrets.token_urlsafe(16))


def check_login(user: AdminUser | None, password: str) -> bool:
    if user is None:
        verify_password(password, _DUMMY_HASH)
        return False
    return verify_password(password, user.password_hash)


# ---------- Session tokens: "<user id>:<token version>:<expiry>" signed with SECRET_KEY ----------

def _sign(payload: str) -> str:
    key = get_settings().secret_key.encode()
    return hmac.new(key, payload.encode(), hashlib.sha256).hexdigest()


def create_token(user: AdminUser) -> tuple[str, int]:
    exp = int(time.time()) + get_settings().token_ttl_hours * 3600
    payload = f"{user.id}:{user.token_version}:{exp}"
    raw = f"{payload}:{_sign(payload)}".encode()
    return base64.urlsafe_b64encode(raw).decode().rstrip("="), exp


def read_token(token: str) -> tuple[int, int] | None:
    """Return (user id, token version) if the signature and expiry are good."""
    try:
        padded = token + "=" * (-len(token) % 4)
        raw = base64.urlsafe_b64decode(padded.encode()).decode()
        payload, sig = raw.rsplit(":", 1)
        uid, version, exp = (int(x) for x in payload.split(":"))
    except (ValueError, UnicodeDecodeError):
        return None
    if not hmac.compare_digest(sig, _sign(payload)) or exp <= time.time():
        return None
    return uid, version


def require_admin(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> AdminUser:
    claims = read_token(creds.credentials) if creds else None
    user = db.get(AdminUser, claims[0]) if claims else None
    if user is None or claims is None or user.token_version != claims[1]:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail="Sign in again to continue.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


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
