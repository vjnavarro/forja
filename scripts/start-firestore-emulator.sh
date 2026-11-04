#!/usr/bin/env bash
set -euo pipefail
FORJA_CHECKOUT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
exec env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH \
  docker --host=unix:///var/run/docker.sock run --rm --name forja-firestore-emulator \
  -p 127.0.0.1:8080:8080 \
  --mount "type=bind,src=$FORJA_CHECKOUT/firestore.rules,dst=/app/firestore.rules,readonly" \
  --entrypoint /google-cloud-sdk/platform/cloud-firestore-emulator/cloud_firestore_emulator \
  gcr.io/google.com/cloudsdktool/google-cloud-cli@sha256:c3b114528245d315af73d92d95d8e2fed9747ce29003ad46232f22b4542da036 \
  --host 0.0.0.0 --port 8080 --project_id demo-forja --rules /app/firestore.rules \
  --single_project_mode --single_project_mode_error
