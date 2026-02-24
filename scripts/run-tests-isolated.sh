#!/usr/bin/env bash
# Run bun test files in isolated processes to avoid cross-file state pollution.
# Usage: scripts/run-tests-isolated.sh <pattern>
# Example: scripts/run-tests-isolated.sh "unit.test"

set -euo pipefail

pattern="${1:-.test.}"
failed=0
passed=0
total_files=0

# Find test files matching pattern, excluding node_modules and e2e-tests
files=$(find . -name "*.test.ts" -o -name "*.test.tsx" | grep -v node_modules | grep -v e2e-tests | grep "$pattern" | sort)

for f in $files; do
  total_files=$((total_files + 1))
  if ! bun test "$f" 2>&1; then
    failed=$((failed + 1))
  else
    passed=$((passed + 1))
  fi
done

echo ""
echo "=== Test Summary ==="
echo "Files: $total_files total, $passed passed, $failed failed"

if [ "$failed" -gt 0 ]; then
  exit 1
fi
