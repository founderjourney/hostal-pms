#!/bin/bash
# ============================================================
# ALMANIK PMS - Test Scripts for Day 12 Modules
# ============================================================
# Run: bash scripts/test-modules.sh
# ============================================================

BASE_URL="http://localhost:3000"
echo "============================================================"
echo "  ALMANIK PMS - Module Testing Script"
echo "============================================================"
echo ""

# Login and get token
echo "🔐 Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('sessionId', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Error: Could not login. Is the server running?"
  echo "   Run: npm start"
  exit 1
fi

echo "✅ Logged in. Token: $TOKEN"
echo ""

# ============================================================
# STAFF MODULE TESTS
# ============================================================
echo "============================================================"
echo "  👥 STAFF MODULE TESTS"
echo "============================================================"

echo ""
echo "1. GET /api/staff/stats"
curl -s "$BASE_URL/api/staff/stats" -H "Session-ID: $TOKEN" | python3 -m json.tool

echo ""
echo "2. GET /api/staff (list all)"
curl -s "$BASE_URL/api/staff?limit=5" -H "Session-ID: $TOKEN" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f\"   Count: {data.get('count', 0)} staff members\")
print(f\"   Roles: {', '.join(data.get('roles', []))}\")
"

echo ""
echo "3. POST /api/staff (create test staff)"
CREATE_STAFF=$(curl -s -X POST "$BASE_URL/api/staff" \
  -H "Session-ID: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Staff Member",
    "role": "aseo",
    "phone": "+57 300 111 2222",
    "salary": 1200000
  }')
STAFF_ID=$(echo $CREATE_STAFF | python3 -c "import sys, json; print(json.load(sys.stdin).get('staff', {}).get('id', ''))" 2>/dev/null)
echo "   Created staff ID: $STAFF_ID"

echo ""
echo "4. POST /api/staff/:id/clock-in"
curl -s -X POST "$BASE_URL/api/staff/$STAFF_ID/clock-in" \
  -H "Session-ID: $TOKEN" \
  -H "Content-Type: application/json" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f\"   {data.get('message', 'Error')}\")
"

echo ""
echo "5. GET /api/staff/attendance/today"
curl -s "$BASE_URL/api/staff/attendance/today" -H "Session-ID: $TOKEN" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f\"   On duty: {data.get('total_on_duty', 0)}\")
"

# ============================================================
# TASKS MODULE TESTS
# ============================================================
echo ""
echo "============================================================"
echo "  📋 TASKS MODULE TESTS"
echo "============================================================"

echo ""
echo "1. GET /api/tasks/stats"
curl -s "$BASE_URL/api/tasks/stats" -H "Session-ID: $TOKEN" | python3 -m json.tool

echo ""
echo "2. POST /api/tasks (create test task)"
CREATE_TASK=$(curl -s -X POST "$BASE_URL/api/tasks" \
  -H "Session-ID: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Task - Limpieza habitacion",
    "task_type": "cleaning",
    "priority": "high",
    "description": "Tarea de prueba creada por script"
  }')
TASK_ID=$(echo $CREATE_TASK | python3 -c "import sys, json; print(json.load(sys.stdin).get('task', {}).get('id', ''))" 2>/dev/null)
echo "   Created task ID: $TASK_ID"

echo ""
echo "3. POST /api/tasks/:id/start"
curl -s -X POST "$BASE_URL/api/tasks/$TASK_ID/start" \
  -H "Session-ID: $TOKEN" \
  -H "Content-Type: application/json" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f\"   {data.get('message', 'Error')}\")
"

echo ""
echo "4. POST /api/tasks/:id/complete"
curl -s -X POST "$BASE_URL/api/tasks/$TASK_ID/complete" \
  -H "Session-ID: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"completion_notes": "Completada por script de prueba"}' | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f\"   {data.get('message', 'Error')}\")
"

echo ""
echo "5. GET /api/tasks (list all)"
curl -s "$BASE_URL/api/tasks?limit=5" -H "Session-ID: $TOKEN" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f\"   Count: {data.get('count', 0)} tasks\")
"

# ============================================================
# CASHBOX MODULE TESTS
# ============================================================
echo ""
echo "============================================================"
echo "  💰 CASHBOX MODULE TESTS"
echo "============================================================"

echo ""
echo "1. GET /api/cashbox/stats"
curl -s "$BASE_URL/api/cashbox/stats" -H "Session-ID: $TOKEN" | python3 -m json.tool

echo ""
echo "2. GET /api/cashbox/sessions/current"
CURRENT_SESSION=$(curl -s "$BASE_URL/api/cashbox/sessions/current" -H "Session-ID: $TOKEN")
HAS_SESSION=$(echo $CURRENT_SESSION | python3 -c "import sys, json; print(json.load(sys.stdin).get('has_open_session', False))" 2>/dev/null)

if [ "$HAS_SESSION" = "False" ]; then
  echo "   No open session. Opening new session..."
  echo ""
  echo "3. POST /api/cashbox/sessions/open"
  curl -s -X POST "$BASE_URL/api/cashbox/sessions/open" \
    -H "Session-ID: $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"opening_amount": 100000, "notes": "Apertura de prueba"}' | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f\"   {data.get('message', 'Error')}\")
"
else
  echo "   Session already open"
fi

echo ""
echo "4. POST /api/cashbox/transactions (income)"
curl -s -X POST "$BASE_URL/api/cashbox/transactions" \
  -H "Session-ID: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_type": "income",
    "category": "reservation_payment",
    "amount": 50000,
    "payment_method": "cash",
    "description": "Pago de prueba"
  }' | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f\"   {data.get('message', 'Error')}\")
"

echo ""
echo "5. POST /api/cashbox/transactions (expense)"
curl -s -X POST "$BASE_URL/api/cashbox/transactions" \
  -H "Session-ID: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_type": "expense",
    "category": "supplies",
    "amount": 15000,
    "payment_method": "cash",
    "description": "Compra de prueba"
  }' | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f\"   {data.get('message', 'Error')}\")
"

echo ""
echo "6. GET /api/cashbox/transactions (list)"
curl -s "$BASE_URL/api/cashbox/transactions?limit=5" -H "Session-ID: $TOKEN" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f\"   Count: {data.get('count', 0)} transactions\")
"

echo ""
echo "7. GET /api/cashbox/daily-report"
curl -s "$BASE_URL/api/cashbox/daily-report" -H "Session-ID: $TOKEN" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f\"   Date: {data.get('report_date', 'N/A')}\")
print(f\"   Transactions: {data.get('transactions_count', 0)}\")
print(f\"   Net Result: {data.get('net_result', 0)}\")
"

# ============================================================
# SUMMARY
# ============================================================
echo ""
echo "============================================================"
echo "  ✅ ALL TESTS COMPLETED"
echo "============================================================"
echo ""
echo "Frontend URLs:"
echo "  - Staff:   $BASE_URL/staff.html"
echo "  - Tasks:   $BASE_URL/tasks.html"
echo "  - Cashbox: $BASE_URL/cashbox.html"
echo ""
echo "============================================================"
