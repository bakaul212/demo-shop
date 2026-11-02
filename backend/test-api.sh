#!/bin/bash
# Run after: npm install && npm start  (in another terminal)
BASE=${BASE:-http://localhost:4000}
echo "== health =="; curl -s $BASE/api/health; echo
echo "== public =="; curl -s $BASE/api/public | head -c 400; echo
echo "== login =="; TOKEN=$(curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@demo.shop","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))")
echo "token: ${TOKEN:0:20}..."
echo "== dashboard =="; curl -s "$BASE/api/dashboard?range=daily" -H "Authorization: Bearer $TOKEN" | head -c 400; echo
echo "== create order =="; curl -s -X POST $BASE/api/orders -H 'Content-Type: application/json' -d '{"customer":{"name":"Test Customer","phone":"01712345678","address":"Mirpur 10, Dhaka"},"area":"inside","payment":"ক্যাশ অন ডেলিভারি","items":[{"pid":1,"qty":1}]}'; echo
echo "== track =="; curl -s "$BASE/api/track?q=01712345678" | head -c 400; echo
echo "== staff cannot delete (should be 403) =="; STAFF=$(curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' -d '{"email":"staff@demo.shop","password":"staff123"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))"); curl -s -X DELETE $BASE/api/products/1 -H "Authorization: Bearer $STAFF"; echo
echo "== payment stub (should be 501) =="; curl -s -X POST $BASE/api/payments/bkash/init -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}'; echo
