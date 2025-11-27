#!/bin/bash
# ============================================================
# ALMANIK PMS - FULL SYSTEM AUDIT
# ============================================================
# Tests ALL endpoints and generates comprehensive report
# ============================================================

BASE_URL="http://localhost:3000"
REPORT_FILE="AUDIT-REPORT-$(date +%Y%m%d-%H%M%S).md"

echo "# ALMANIK PMS - AUDITORÍA COMPLETA" > $REPORT_FILE
echo "**Fecha:** $(date)" >> $REPORT_FILE
echo "**Servidor:** $BASE_URL" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Counters
TOTAL=0
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected=$4
    local description=$5

    TOTAL=$((TOTAL + 1))

    if [ "$method" == "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint" -H "Session-ID: $TOKEN" 2>/dev/null)
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" -H "Session-ID: $TOKEN" -H "Content-Type: application/json" -d "$data" 2>/dev/null)
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [[ "$http_code" =~ ^(200|201|204)$ ]]; then
        PASSED=$((PASSED + 1))
        echo "| $method | $endpoint | ✅ $http_code | $description |" >> $REPORT_FILE
        echo "✅ $method $endpoint ($http_code)"
    else
        FAILED=$((FAILED + 1))
        echo "| $method | $endpoint | ❌ $http_code | $description |" >> $REPORT_FILE
        echo "❌ $method $endpoint ($http_code)"
    fi
}

echo "============================================================"
echo "  ALMANIK PMS - FULL SYSTEM AUDIT"
echo "============================================================"
echo ""

# Check server health
echo "🔍 Checking server health..."
health=$(curl -s "$BASE_URL/health" 2>/dev/null)
if echo "$health" | grep -q "healthy"; then
    echo "✅ Server is healthy"
else
    echo "❌ Server not responding. Is it running?"
    exit 1
fi

# Login
echo "🔐 Authenticating..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('sessionId', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo "❌ Login failed"
    exit 1
fi
echo "✅ Authenticated (Token: $TOKEN)"
echo ""

# Generate unique dates for testing (30 days from now)
FUTURE_DATE=$(date -d "+30 days" +%Y-%m-%d 2>/dev/null || date -v+30d +%Y-%m-%d)
FUTURE_DATE2=$(date -d "+32 days" +%Y-%m-%d 2>/dev/null || date -v+32d +%Y-%m-%d)

# ============================================================
# CORE SERVER ENDPOINTS
# ============================================================
echo "## 1. CORE SERVER ENDPOINTS (server-simple.js)" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "| Method | Endpoint | Status | Description |" >> $REPORT_FILE
echo "|--------|----------|--------|-------------|" >> $REPORT_FILE

echo "📋 Testing Core Server Endpoints..."
test_endpoint "GET" "/health" "" "200" "Health check"
test_endpoint "GET" "/api/dashboard" "" "200" "Dashboard data"
test_endpoint "GET" "/api/guests" "" "200" "List guests"
test_endpoint "GET" "/api/beds" "" "200" "List beds"
test_endpoint "GET" "/api/beds/by-room" "" "200" "Beds by room"
test_endpoint "GET" "/api/products" "" "200" "List products"
test_endpoint "GET" "/api/tours" "" "200" "List tours"
test_endpoint "GET" "/api/tours/stats" "" "200" "Tours stats"
test_endpoint "GET" "/api/users" "" "200" "List users"
test_endpoint "GET" "/api/roles" "" "200" "List roles"
test_endpoint "GET" "/api/reports?start=2025-01-01&end=2025-12-31&type=overview" "" "200" "Reports (with date params)"
test_endpoint "GET" "/api/reports/financial" "" "200" "Financial reports"
test_endpoint "GET" "/api/reports/forecast" "" "200" "Forecast reports"
test_endpoint "GET" "/api/reports/insights" "" "200" "Insights"
test_endpoint "GET" "/api/metrics/performance" "" "200" "Performance metrics"
test_endpoint "GET" "/api/metrics/queries" "" "200" "Query metrics"

# ============================================================
# RESERVATIONS MODULE
# ============================================================
echo "" >> $REPORT_FILE
echo "## 2. RESERVATIONS MODULE (/api/reservations)" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "| Method | Endpoint | Status | Description |" >> $REPORT_FILE
echo "|--------|----------|--------|-------------|" >> $REPORT_FILE

echo ""
echo "📋 Testing Reservations Module..."
test_endpoint "GET" "/api/reservations" "" "200" "List reservations"
test_endpoint "GET" "/api/reservations/availability/check?bed_id=1&check_in=$FUTURE_DATE&check_out=$FUTURE_DATE2" "" "200" "Check availability"
RESERVATION_DATA="{\"guest_id\":1,\"bed_id\":2,\"check_in\":\"$FUTURE_DATE\",\"check_out\":\"$FUTURE_DATE2\",\"price_per_night\":50000}"
test_endpoint "POST" "/api/reservations" "$RESERVATION_DATA" "201" "Create reservation"

# ============================================================
# ANALYTICS MODULE
# ============================================================
echo "" >> $REPORT_FILE
echo "## 3. ANALYTICS MODULE (/api/analytics)" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "| Method | Endpoint | Status | Description |" >> $REPORT_FILE
echo "|--------|----------|--------|-------------|" >> $REPORT_FILE

echo ""
echo "📋 Testing Analytics Module..."
test_endpoint "GET" "/api/analytics/overview" "" "200" "Analytics overview"
test_endpoint "GET" "/api/analytics/revenue" "" "200" "Revenue analytics"
test_endpoint "GET" "/api/analytics/occupancy" "" "200" "Occupancy analytics"
test_endpoint "GET" "/api/analytics/bookings" "" "200" "Bookings analytics"
test_endpoint "GET" "/api/analytics/commissions" "" "200" "Commissions analytics"

# ============================================================
# ICAL SYNC MODULE
# ============================================================
echo "" >> $REPORT_FILE
echo "## 4. ICAL SYNC MODULE (/api/ical)" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "| Method | Endpoint | Status | Description |" >> $REPORT_FILE
echo "|--------|----------|--------|-------------|" >> $REPORT_FILE

echo ""
echo "📋 Testing iCal Sync Module..."
test_endpoint "GET" "/api/ical/sources" "" "200" "List iCal sources"
test_endpoint "GET" "/api/ical/external-reservations" "" "200" "External reservations"

# ============================================================
# STAFF MODULE
# ============================================================
echo "" >> $REPORT_FILE
echo "## 5. STAFF MODULE (/api/staff)" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "| Method | Endpoint | Status | Description |" >> $REPORT_FILE
echo "|--------|----------|--------|-------------|" >> $REPORT_FILE

echo ""
echo "📋 Testing Staff Module..."
test_endpoint "GET" "/api/staff" "" "200" "List staff"
test_endpoint "GET" "/api/staff/stats" "" "200" "Staff stats"
test_endpoint "GET" "/api/staff/attendance/today" "" "200" "Today attendance"
test_endpoint "GET" "/api/staff/config/roles" "" "200" "Staff roles config"
test_endpoint "POST" "/api/staff" '{"name":"Audit Test Staff","role":"voluntario","phone":"+57 300 999 9999"}' "201" "Create staff"

# ============================================================
# TASKS MODULE
# ============================================================
echo "" >> $REPORT_FILE
echo "## 6. TASKS MODULE (/api/tasks)" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "| Method | Endpoint | Status | Description |" >> $REPORT_FILE
echo "|--------|----------|--------|-------------|" >> $REPORT_FILE

echo ""
echo "📋 Testing Tasks Module..."
test_endpoint "GET" "/api/tasks" "" "200" "List tasks"
test_endpoint "GET" "/api/tasks/stats" "" "200" "Tasks stats"
test_endpoint "GET" "/api/tasks/my?staff_id=1" "" "200" "My tasks (with staff_id)"
test_endpoint "POST" "/api/tasks" '{"title":"Audit Test Task","task_type":"cleaning","priority":"normal"}' "201" "Create task"

# ============================================================
# CASHBOX MODULE
# ============================================================
echo "" >> $REPORT_FILE
echo "## 7. CASHBOX MODULE (/api/cashbox)" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "| Method | Endpoint | Status | Description |" >> $REPORT_FILE
echo "|--------|----------|--------|-------------|" >> $REPORT_FILE

echo ""
echo "📋 Testing Cashbox Module..."
test_endpoint "GET" "/api/cashbox/sessions" "" "200" "List sessions"
test_endpoint "GET" "/api/cashbox/sessions/current" "" "200" "Current session"
test_endpoint "GET" "/api/cashbox/transactions" "" "200" "List transactions"
test_endpoint "GET" "/api/cashbox/stats" "" "200" "Cashbox stats"
test_endpoint "GET" "/api/cashbox/daily-report" "" "200" "Daily report"

# ============================================================
# SUMMARY
# ============================================================
echo "" >> $REPORT_FILE
echo "---" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "## RESUMEN" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "| Métrica | Valor |" >> $REPORT_FILE
echo "|---------|-------|" >> $REPORT_FILE
echo "| Total Endpoints Probados | $TOTAL |" >> $REPORT_FILE
echo "| Exitosos | $PASSED |" >> $REPORT_FILE
echo "| Fallidos | $FAILED |" >> $REPORT_FILE
echo "| Tasa de Éxito | $((PASSED * 100 / TOTAL))% |" >> $REPORT_FILE

echo ""
echo "============================================================"
echo "  AUDIT COMPLETE"
echo "============================================================"
echo ""
echo "📊 Results:"
echo "   Total Tested: $TOTAL"
echo "   Passed: $PASSED"
echo "   Failed: $FAILED"
echo "   Success Rate: $((PASSED * 100 / TOTAL))%"
echo ""
echo "📄 Report saved to: $REPORT_FILE"
echo ""

# Move report to docs folder
mv $REPORT_FILE docs/
echo "📁 Report moved to docs/$REPORT_FILE"
