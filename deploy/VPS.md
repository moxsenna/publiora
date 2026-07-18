# Publiora VPS Deploy

## Target
- Host: `43.228.213.148`
- Path: `/opt/publiora`
- Port: `5300` → Caddy → `publiora.appvibe.biz.id`
- Network: `wacrm_edge`

## Deploy / update

From PC (Git Bash):

```bash
# package (exclude heavy/local)
rsync -az --delete \
  --exclude node_modules --exclude .next --exclude .git \
  --exclude .wrangler --exclude .zcode --exclude .kiro \
  --exclude .env.local --exclude 'nul' \
  -e "ssh -i $HOME/.ssh/id_ed25519" \
  ./ root@43.228.213.148:/opt/publiora/

ssh -i ~/.ssh/id_ed25519 root@43.228.213.148 '
  cd /opt/publiora
  # ensure .env exists
  test -f .env || cp deploy/env.production.example .env
  docker compose build --no-cache
  docker compose up -d
  # merge Caddy snippet if missing
  if ! docker exec wacrm-caddy-1 cat /etc/caddy/Caddyfile | grep -q publiora.appvibe.biz.id; then
    cat deploy/Caddyfile.snippet >> /opt/wacrm/deploy/Caddyfile.publiora
    # append into running config
    docker exec wacrm-caddy-1 sh -c "cat >> /etc/caddy/Caddyfile" < deploy/Caddyfile.snippet
    docker exec wacrm-caddy-1 caddy reload --config /etc/caddy/Caddyfile
  fi
  docker compose ps
  curl -sI http://127.0.0.1:5300/ | head -5
'
```

## DNS
A record `publiora.appvibe.biz.id` → `43.228.213.148` (DNS only until cert green).

## Rollback
```bash
cd /opt/publiora && docker compose down
# restore previous image/tag if tagged
```
