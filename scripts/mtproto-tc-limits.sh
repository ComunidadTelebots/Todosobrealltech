#!/bin/bash
# Límites de ancho de banda SOLO en los contenedores mtproto (en su propio netns):
#   - 1 Gbps agregado por proxy (htb)
#   - 10 Mbps por conexión (fq maxrate)
# Idempotente: reaplica solo si falta (p.ej. tras recrear un contenedor). No toca el host.
set -u

# Lee variables concretas de scripts/.env (sin sourcing, seguro con espacios/JSON).
_ENVF="$(dirname "$(readlink -f "$0")")/.env"
_env() { [ -f "$_ENVF" ] && grep -E "^$1=" "$_ENVF" | head -1 | cut -d= -f2- || true; }

RATE_AGG="${MTPROTO_RATE_AGG:-$(_env MTPROTO_RATE_AGG)}"; : "${RATE_AGG:=1gbit}"
RATE_CONN="${MTPROTO_RATE_CONN:-$(_env MTPROTO_RATE_CONN)}"; : "${RATE_CONN:=10mbit}"
CONTAINERS="${MTPROTO_CONTAINER_NAMES:-$(_env MTPROTO_CONTAINER_NAMES)}"

for c in $CONTAINERS; do
  pid=$(docker inspect -f '{{.State.Pid}}' "$c" 2>/dev/null) || continue
  [ -z "$pid" ] || [ "$pid" = "0" ] && continue
  # ¿ya está aplicado?
  if nsenter -t "$pid" -n tc qdisc show dev eth0 2>/dev/null | grep -q 'htb 1:'; then
    continue
  fi
  nsenter -t "$pid" -n tc qdisc replace dev eth0 root handle 1: htb default 10 r2q 1000 2>/dev/null
  nsenter -t "$pid" -n tc class replace dev eth0 parent 1: classid 1:10 htb \
    rate "$RATE_AGG" ceil "$RATE_AGG" quantum 200000 2>/dev/null
  nsenter -t "$pid" -n tc qdisc replace dev eth0 parent 1:10 handle 10: fq maxrate "$RATE_CONN" 2>/dev/null
  echo "$(date '+%F %T') aplicado tc a $c (agg=$RATE_AGG, conn=$RATE_CONN)"
done
