#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <s3-bucket-name>" >&2
  exit 2
fi

bucket=$1
dist_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../frontend/dist" && pwd)"

if [[ ! -f "$dist_dir/index.html" ]]; then
  echo "Build the frontend first; $dist_dir/index.html was not found." >&2
  exit 1
fi

if [[ -d "$dist_dir/assets" ]]; then
  aws s3 sync "$dist_dir/assets/" "s3://$bucket/assets/" \
    --cache-control "public,max-age=31536000,immutable"
fi

if [[ -d "$dist_dir/images" ]]; then
  aws s3 sync "$dist_dir/images/" "s3://$bucket/images/" \
    --cache-control "public,max-age=86400"
fi

aws s3 sync "$dist_dir/" "s3://$bucket/" \
  --exclude "index.html" \
  --exclude "assets/*" \
  --exclude "images/*" \
  --cache-control "public,max-age=86400"

aws s3 cp "$dist_dir/index.html" "s3://$bucket/index.html" \
  --content-type "text/html; charset=utf-8" \
  --cache-control "no-cache"
