#!/usr/bin/env bash
set -euo pipefail

cd /home/ubuntu/projects/Synapse-Project
mkdir -p research

OUT="research/embedding_endpoint_probe_results_2026-03-30.md"
PROD_ENV=".env.production.local"

if [[ ! -f "$PROD_ENV" ]]; then
  echo "missing $PROD_ENV" >&2
  exit 1
fi

extract_quoted() {
  local key="$1"
  grep -E "^${key}=" "$PROD_ENV" | head -n1 | sed -E 's/^[^=]+=//; s/^"//; s/"$//'
}

PROJECT_KEY="$(extract_quoted OPENAI_API_KEY || true)"
PROJECT_BASE_URL="$(extract_quoted OPENAI_BASE_URL || true)"

sanitize_file() {
  local file="$1"
  tr '\n' ' ' < "$file" \
    | sed -E 's/[A-Za-z0-9_\-]{20,}/[REDACTED]/g' \
    | sed -E 's/[[:space:]]+/ /g' \
    | cut -c1-500
}

probe_post() {
  local name="$1"
  local url="$2"
  local auth_header="$3"
  local body="$4"
  local resp
  resp="$(mktemp)"
  local status

  if [[ -n "$auth_header" ]]; then
    status="$(curl -sS -o "$resp" -w '%{http_code}' -X POST "$url" \
      -H 'Content-Type: application/json' \
      -H "$auth_header" \
      --data "$body" || true)"
  else
    status="$(curl -sS -o "$resp" -w '%{http_code}' -X POST "$url" \
      -H 'Content-Type: application/json' \
      --data "$body" || true)"
  fi

  {
    echo "### $name"
    echo
    echo "- URL: \`$url\`"
    echo "- HTTP Status: \`$status\`"
    echo "- Response Snippet: \`$(sanitize_file "$resp")\`"
    echo
  } >> "$OUT"

  rm -f "$resp"
}

{
  echo "# Embedding Endpoint Probe Results (2026-03-30)"
  echo
  echo "本文件仅记录 **状态码与脱敏响应摘要**，不写入任何明文密钥。"
  echo
} > "$OUT"

probe_post \
  "项目当前 OpenAI 兼容代理 /embeddings" \
  "${PROJECT_BASE_URL%/}/embeddings" \
  "Authorization: Bearer ${PROJECT_KEY}" \
  '{"model":"text-embedding-3-small","input":"semantic retrieval quality test"}'

probe_post \
  "使用项目现有 KEY 直连 OpenAI 官方 /v1/embeddings" \
  "https://api.openai.com/v1/embeddings" \
  "Authorization: Bearer ${PROJECT_KEY}" \
  '{"model":"text-embedding-3-small","input":"semantic retrieval quality test"}'

probe_post \
  "Hugging Face router 免费推理端点（未带 token）" \
  "https://router.huggingface.co/hf-inference/models/intfloat/multilingual-e5-large" \
  "" \
  '{"inputs":"semantic retrieval quality test","normalize":true}'

probe_post \
  "Hugging Face 经典 Inference API（未带 token）" \
  "https://api-inference.huggingface.co/models/intfloat/multilingual-e5-large" \
  "" \
  '{"inputs":"semantic retrieval quality test","options":{"wait_for_model":true}}'

echo "Probe results written to $OUT"
