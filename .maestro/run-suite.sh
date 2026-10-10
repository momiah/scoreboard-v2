#!/bin/zsh
# Runs every flow (or those matching a glob fragment) one at a time and retries a
# failed flow once, so a timing blip in a long run is reported as "flaky" instead of
# failing the suite. Exits non-zero only when a flow fails twice.
#   .maestro/run-suite.sh            # everything
#   .maestro/run-suite.sh team-      # flows whose name contains "team-"
cd "$(dirname "$0")/.."
set -a; source .maestro/.env; set +a
pattern="${1:-}"
pass=0; flaky=(); failed=()
for flow in .maestro/flows/*${pattern}*.yaml; do
  name="$(basename "$flow" .yaml)"
  if maestro test "$flow" >"/tmp/maestro-$name.log" 2>&1; then
    echo "PASS  $name"; pass=$((pass + 1))
  elif maestro test "$flow" >"/tmp/maestro-$name.retry.log" 2>&1; then
    echo "FLAKY $name (passed on retry)"; flaky+=("$name")
  else
    echo "FAIL  $name"; failed+=("$name")
    grep -E "FAILED|Assertion is|not found|Seed failed" "/tmp/maestro-$name.retry.log" | head -3
  fi
done
echo "passed: $pass, flaky: ${#flaky[@]}, failed: ${#failed[@]}"
[ ${#flaky[@]} -gt 0 ] && printf 'flaky: %s\n' "${flaky[@]}"
[ ${#failed[@]} -eq 0 ]
