#!/bin/bash
endpoints=(/health /stores /products /orders /stock_events)
for ep in "${endpoints[@]}"; do
  echo "Checking $ep..."
  status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:4000$ep")
  if [ "$status" -eq 200 ]; then
    echo "OK"
  else
    echo "FAIL (HTTP $status)"
  fi
done
