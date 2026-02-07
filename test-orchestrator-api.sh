#!/bin/bash

# Orchestrator API Test Script
# This script tests all endpoints of the Orchestrator API

# Configuration
BASE_URL="http://localhost:3000"
API_URL="${BASE_URL}/api/orchestrator"
AUTH_TOKEN="test-token-123"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to print test results
print_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: $2"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC}: $2"
    ((TESTS_FAILED++))
  fi
}

# Helper function to make API calls
api_call() {
  local method=$1
  local endpoint=$2
  local data=$3
  
  if [ -z "$data" ]; then
    curl -s -X "$method" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -H "Content-Type: application/json" \
      "${API_URL}${endpoint}"
  else
    curl -s -X "$method" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "${API_URL}${endpoint}"
  fi
}

echo "========================================="
echo "Orchestrator API Test Suite"
echo "========================================="
echo ""

# Test 1: Generate Workflow
echo -e "${YELLOW}Test 1: Generate Workflow${NC}"
GENERATE_RESPONSE=$(api_call POST "/generate" '{
  "prompt": "Send a Slack invite and email to new users"
}')

if echo "$GENERATE_RESPONSE" | grep -q "workflow_id"; then
  WORKFLOW_ID=$(echo "$GENERATE_RESPONSE" | grep -o '"workflow_id":"[^"]*"' | cut -d'"' -f4)
  print_result 0 "Generate workflow"
  echo "  Workflow ID: $WORKFLOW_ID"
else
  print_result 1 "Generate workflow"
  echo "  Response: $GENERATE_RESPONSE"
fi

echo ""

# Test 2: Get Workflow
if [ -n "$WORKFLOW_ID" ]; then
  echo -e "${YELLOW}Test 2: Get Workflow${NC}"
  GET_RESPONSE=$(api_call GET "/$WORKFLOW_ID")
  
  if echo "$GET_RESPONSE" | grep -q "\"id\":\"$WORKFLOW_ID\""; then
    print_result 0 "Get workflow by ID"
    VERSION=$(echo "$GET_RESPONSE" | grep -o '"version":[0-9]*' | cut -d':' -f2)
    echo "  Current version: $VERSION"
  else
    print_result 1 "Get workflow by ID"
    echo "  Response: $GET_RESPONSE"
  fi
  echo ""
fi

# Test 3: Update Workflow (Manual)
if [ -n "$WORKFLOW_ID" ]; then
  echo -e "${YELLOW}Test 3: Update Workflow (Manual)${NC}"
  UPDATE_RESPONSE=$(api_call PUT "/$WORKFLOW_ID" '{
    "steps": [
      {
        "id": "step_1",
        "type": "action",
        "tool": "slack_invite",
        "config": { "channel": "#general" },
        "position": { "x": 100, "y": 50 }
      },
      {
        "id": "step_2",
        "type": "action",
        "tool": "email_send",
        "config": { "to": "user@example.com" },
        "position": { "x": 300, "y": 50 }
      }
    ]
  }')
  
  if echo "$UPDATE_RESPONSE" | grep -q '"status":"updated"'; then
    print_result 0 "Update workflow manually"
    NEW_VERSION=$(echo "$UPDATE_RESPONSE" | grep -o '"version":[0-9]*' | cut -d':' -f2)
    echo "  New version: $NEW_VERSION"
  else
    print_result 1 "Update workflow manually"
    echo "  Response: $UPDATE_RESPONSE"
  fi
  echo ""
fi

# Test 4: Modify Workflow (AI)
if [ -n "$WORKFLOW_ID" ] && [ -n "$NEW_VERSION" ]; then
  echo -e "${YELLOW}Test 4: Modify Workflow (AI)${NC}"
  MODIFY_RESPONSE=$(api_call POST "/$WORKFLOW_ID/modify" "{
    \"instruction\": \"Add a 10 second delay between the Slack invite and email\",
    \"current_version\": $NEW_VERSION
  }")
  
  if echo "$MODIFY_RESPONSE" | grep -q '"workflow_id"'; then
    print_result 0 "Modify workflow with AI"
    FINAL_VERSION=$(echo "$MODIFY_RESPONSE" | grep -o '"version":[0-9]*' | cut -d':' -f2)
    DIFF=$(echo "$MODIFY_RESPONSE" | grep -o '"diff":"[^"]*"' | cut -d'"' -f4)
    echo "  Final version: $FINAL_VERSION"
    echo "  Diff: $DIFF"
  else
    print_result 1 "Modify workflow with AI"
    echo "  Response: $MODIFY_RESPONSE"
  fi
  echo ""
fi

# Test 5: Delete Workflow
if [ -n "$WORKFLOW_ID" ]; then
  echo -e "${YELLOW}Test 5: Delete Workflow${NC}"
  DELETE_RESPONSE=$(api_call DELETE "/$WORKFLOW_ID")
  
  if echo "$DELETE_RESPONSE" | grep -q '"status":"deleted"'; then
    print_result 0 "Delete workflow"
  else
    print_result 1 "Delete workflow"
    echo "  Response: $DELETE_RESPONSE"
  fi
  echo ""
fi

# Test 6: Verify Deleted Workflow Cannot Be Retrieved
if [ -n "$WORKFLOW_ID" ]; then
  echo -e "${YELLOW}Test 6: Verify Deleted Workflow${NC}"
  VERIFY_RESPONSE=$(api_call GET "/$WORKFLOW_ID")
  
  if echo "$VERIFY_RESPONSE" | grep -q '"error":"Not Found"'; then
    print_result 0 "Deleted workflow returns 404"
  else
    print_result 1 "Deleted workflow returns 404"
    echo "  Response: $VERIFY_RESPONSE"
  fi
  echo ""
fi

# Test 7: Invalid Authorization
echo -e "${YELLOW}Test 7: Invalid Authorization${NC}"
INVALID_AUTH_RESPONSE=$(curl -s -X GET \
  -H "Content-Type: application/json" \
  "${API_URL}/some-id")

if echo "$INVALID_AUTH_RESPONSE" | grep -q '"error":"Unauthorized"'; then
  print_result 0 "Reject request without auth token"
else
  print_result 1 "Reject request without auth token"
  echo "  Response: $INVALID_AUTH_RESPONSE"
fi
echo ""

# Test 8: Invalid Request Body
echo -e "${YELLOW}Test 8: Invalid Request Body${NC}"
INVALID_BODY_RESPONSE=$(api_call POST "/generate" '{
  "invalid_field": "test"
}')

if echo "$INVALID_BODY_RESPONSE" | grep -q '"error":"Invalid Request"'; then
  print_result 0 "Reject invalid request body"
else
  print_result 1 "Reject invalid request body"
  echo "  Response: $INVALID_BODY_RESPONSE"
fi
echo ""

# Summary
echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests Failed: ${RED}${TESTS_FAILED}${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed.${NC}"
  exit 1
fi
