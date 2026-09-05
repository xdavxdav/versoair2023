#!/bin/bash
# Test all 4 login endpoints for needsDisplayName + name field

echo "=== 1. General Login (/auth/login) ==="
curl -s -X POST http://localhost:5003/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"superadmin@versoair.test","password":"JoeyD000"}' \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
u = d.get('user', {})
print(f'  needsDisplayName: {d.get(\"needsDisplayName\")}')
print(f'  name: {u.get(\"name\")}')
print(f'  role: {u.get(\"role\")}')
print(f'  id type: {type(u.get(\"id\")).__name__}')
print(f'  portals: {u.get(\"portals\")}')
"

echo ""
echo "=== 2. Artist Login (/auth/artist/login) ==="
curl -s -X POST http://localhost:5003/auth/artist/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"superadmin@versoair.test","password":"JoeyD000"}' \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
u = d.get('user', {})
print(f'  needsDisplayName: {d.get(\"needsDisplayName\")}')
print(f'  name: {u.get(\"name\")}')
print(f'  role: {u.get(\"role\")}')
print(f'  id type: {type(u.get(\"id\")).__name__}')
print(f'  portals: {u.get(\"portals\")}')
print(f'  stageName: {u.get(\"stageName\")}')
"

echo ""
echo "=== 3. Subscriber Login (/auth/subscriber/login) ==="
curl -s -X POST http://localhost:5003/auth/subscriber/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"superadmin@versoair.test","password":"JoeyD000"}' \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
u = d.get('user', {})
print(f'  needsDisplayName: {d.get(\"needsDisplayName\")}')
print(f'  name: {u.get(\"name\")}')
print(f'  role: {u.get(\"role\")}')
print(f'  id type: {type(u.get(\"id\")).__name__}')
print(f'  portals: {u.get(\"portals\")}')
"

echo ""
echo "=== 4. Community Login (/auth/community/login) ==="
curl -s -X POST http://localhost:5003/auth/community/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"superadmin@versoair.test","password":"JoeyD000"}' \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
u = d.get('user', {})
print(f'  needsDisplayName: {d.get(\"needsDisplayName\")}')
print(f'  name: {u.get(\"name\")}')
print(f'  role: {u.get(\"role\")}')
print(f'  id type: {type(u.get(\"id\")).__name__}')
print(f'  portals: {u.get(\"portals\")}')
"

echo ""
echo "=== DONE ==="
