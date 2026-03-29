from __future__ import annotations

import json
import sys
from typing import Any

import requests

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8000'
TIMEOUT = 12


def fetch(method: str, path: str, **kwargs: Any) -> tuple[int, Any]:
    response = requests.request(method, f"{BASE_URL}{path}", timeout=TIMEOUT, **kwargs)
    try:
        payload = response.json()
    except Exception:
        payload = response.text
    return response.status_code, payload


checks = [
    ('GET', '/health', {}),
    ('GET', '/api/memory?limit=3', {}),
    ('GET', '/api/workflows/templates', {}),
    ('POST', '/api/workflows/templates/official_expert_roundtable/apply', {}),
    ('POST', '/api/workflows/templates/official_deep_research/apply', {}),
    ('POST', '/api/workflows/templates/official_code_audit/apply', {}),
]

results: list[dict[str, Any]] = []
for method, path, kwargs in checks:
    try:
        status, payload = fetch(method, path, **kwargs)
        results.append({
            'method': method,
            'path': path,
            'status_code': status,
            'ok': 200 <= status < 300,
            'payload': payload,
        })
    except Exception as exc:
        results.append({
            'method': method,
            'path': path,
            'status_code': None,
            'ok': False,
            'payload': f'{type(exc).__name__}: {exc}',
        })

print(json.dumps({'base_url': BASE_URL, 'results': results}, ensure_ascii=False, indent=2))
