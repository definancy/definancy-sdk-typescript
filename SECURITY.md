# Security Policy

## Reporting a vulnerability

Please report security vulnerabilities by emailing **security@definancy.com**
rather than opening a public GitHub issue.

Include:
- Description of the vulnerability and its impact
- Steps to reproduce (proof-of-concept welcome)
- Affected versions
- Any suggested mitigations

We will acknowledge receipt within 2 business days and respond with a
triage assessment + remediation plan within 7 business days. We follow
**coordinated disclosure** — please give us a reasonable window to
remediate before any public disclosure.

## Supported versions

This SDK is in pre-1.0 development. Only the latest minor's most recent
patch receives security fixes; older patches are not backported.

| Version | Supported          |
|---------|--------------------|
| 0.x.y   | Latest patch only  |

## Scope

In scope:
- Cryptographic correctness (Ed25519 signing, JWK thumbprint, JWT/DPoP
  canonicalization, body-hash derivation)
- Authentication / authorization bypass
- Supply chain integrity of the published `@definancy/sdk` package

Out of scope:
- Vulnerabilities in upstream dependencies (report to the upstream
  project; we'll mirror tracking once a fix is available)
- Theoretical attacks without a demonstrated impact path
