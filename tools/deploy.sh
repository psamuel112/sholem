#!/usr/bin/env bash
#
# TPI Homes — deployment helper
#
# Pushes the repo to GitHub and deploys the Next.js frontend to Vercel.
# Strapi is deployed separately via the Render Blueprint (see README) because it
# needs a long-running process and persistent storage.
#
# Usage:
#   ./tools/deploy.sh github <github-username>   # create repo + push
#   ./tools/deploy.sh vercel                     # link + deploy frontend
#   ./tools/deploy.sh check <strapi-url>         # verify a deployed Strapi
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

die()  { printf '\033[31merror:\033[0m %s\n' "$1" >&2; exit 1; }
info() { printf '\033[36m==>\033[0m %s\n' "$1"; }
ok()   { printf '\033[32m ok\033[0m %s\n' "$1"; }

# ---------------------------------------------------------------- github

deploy_github() {
  local user="${1:-}"
  [ -n "$user" ] || die "usage: ./tools/deploy.sh github <github-username>"

  command -v gh >/dev/null 2>&1 || die "GitHub CLI not found. Install with: brew install gh"

  gh auth status >/dev/null 2>&1 || {
    info "Not authenticated — starting GitHub login"
    gh auth login
  }

  if gh repo view "$user/tpi-homes" >/dev/null 2>&1; then
    ok "repo $user/tpi-homes already exists"
  else
    info "Creating private repo $user/tpi-homes"
    gh repo create "$user/tpi-homes" --private \
      --description "TPI Homes and Properties — Next.js frontend with Strapi CMS"
  fi

  git remote get-url origin >/dev/null 2>&1 \
    && git remote set-url origin "https://github.com/$user/tpi-homes.git" \
    || git remote add origin "https://github.com/$user/tpi-homes.git"

  git branch -M main 2>/dev/null || true

  info "Pushing to GitHub"
  git push -u origin main
  ok "pushed → https://github.com/$user/tpi-homes"

  cat <<EOF

Next: deploy Strapi on Render before the frontend.

  1. https://dashboard.render.com  →  New  →  Blueprint
  2. Select $user/tpi-homes  (Render reads render.yaml)
  3. Set the manual env vars: CORS_ORIGINS, INQUIRY_NOTIFICATION_EMAIL,
     CLOUDINARY_NAME, CLOUDINARY_KEY, CLOUDINARY_SECRET
  4. When live, open /admin and create the first admin user
  5. Then run:  ./tools/deploy.sh vercel

EOF
}

# ---------------------------------------------------------------- vercel

deploy_vercel() {
  command -v vercel >/dev/null 2>&1 || die "Vercel CLI not found. Install with: npm i -g vercel"

  vercel whoami >/dev/null 2>&1 || {
    info "Not authenticated — starting Vercel login"
    vercel login
  }

  cd "$ROOT/frontend"

  [ -d .vercel ] || { info "Linking project"; vercel link; }

  # Strapi must exist first; the build reads content from it.
  local strapi_url site_url
  read -r -p "Strapi URL (e.g. https://tpi-homes-cms.onrender.com): " strapi_url
  [ -n "$strapi_url" ] || die "Strapi URL is required — deploy Render first"

  info "Checking Strapi is reachable"
  if curl -sf --max-time 45 "$strapi_url/_health" >/dev/null 2>&1; then
    ok "Strapi is up"
  else
    printf '\033[33mwarn:\033[0m could not reach %s/_health\n' "$strapi_url"
    printf '      On Render free tier the first request can take ~60s to wake.\n'
    read -r -p "      Continue anyway? [y/N] " yn
    [[ "$yn" =~ ^[Yy]$ ]] || exit 1
  fi

  read -r -p "Public site URL (blank = use the Vercel default domain): " site_url

  info "Setting production environment variables"
  printf '%s' "$strapi_url" | vercel env add NEXT_PUBLIC_STRAPI_URL production --force >/dev/null
  [ -n "$site_url" ] && printf '%s' "$site_url" | vercel env add NEXT_PUBLIC_SITE_URL production --force >/dev/null

  info "Deploying to production"
  vercel --prod

  cat <<EOF

Deployed. Two follow-ups:

  1. Set CORS_ORIGINS on Render to the live Vercel URL, then redeploy the CMS —
     otherwise browser requests from the site will be blocked.
  2. If you skipped the site URL above, add NEXT_PUBLIC_SITE_URL once you know the
     final domain so canonical tags and the sitemap are correct.

EOF
}

# ---------------------------------------------------------------- check

check_strapi() {
  local url="${1:-}"
  [ -n "$url" ] || die "usage: ./tools/deploy.sh check <strapi-url>"
  url="${url%/}"

  info "Probing $url"

  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 60 "$url/_health" || echo "000")
  if [ "$code" = "204" ] || [ "$code" = "200" ]; then
    ok "health $code"
  else
    printf '\033[33mwarn:\033[0m health returned %s\n' "$code"
  fi

  for ep in properties services cities property-types; do
    local n
    n=$(curl -s --max-time 30 "$url/api/$ep" \
      | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);console.log(Array.isArray(j.data)?j.data.length:(j.error?('ERR '+j.error.status):'?'))}catch(e){console.log('?')}})" 2>/dev/null || echo '?')
    printf '  %-16s %s\n' "$ep" "$n entries"
  done

  cat <<'EOF'

If an endpoint reports "ERR 403", the Public role lacks read access:
  Strapi admin → Settings → Users & Permissions → Roles → Public
  Enable find + findOne on the content types, and create on Inquiry only.

If counts are 0, seed the database — see the README.
EOF
}

case "${1:-}" in
  github) shift; deploy_github "$@" ;;
  vercel) shift; deploy_vercel "$@" ;;
  check)  shift; check_strapi  "$@" ;;
  *) cat <<'EOF'
TPI Homes deployment helper

  ./tools/deploy.sh github <username>   Create the GitHub repo and push
  ./tools/deploy.sh vercel              Link and deploy the frontend to Vercel
  ./tools/deploy.sh check <strapi-url>  Verify a deployed Strapi instance

Order matters: GitHub → Render (Strapi) → Vercel (frontend).
The frontend reads content from Strapi at build time, so the CMS must exist first.
EOF
     exit 1 ;;
esac
