#!/bin/zsh
# Runs every flow (or those matching a glob fragment) one at a time and retries a
# failed flow once, so a timing blip in a long run is reported as "flaky" instead of
# failing the suite. Exits non-zero only when a flow fails twice.
#   .maestro/run-suite.sh            # everything
#   .maestro/run-suite.sh team-      # flows whose name contains "team-"
#   .maestro/run-suite.sh =team-disband-open   # exactly that flow
#   MAESTRO_DEVICE=emulator-5554 .maestro/run-suite.sh   # a specific device (needed with more than one booted)
cd "$(dirname "$0")/.."
set -a; source .maestro/.env; set +a
export MAESTRO_PLAYOFF_TIE_DAYS="$(node -p "require('courtchamps-shared').LADDER_PLAYOFF_TIE_DAYS")"
export MAESTRO_LADDER_HOST_ARRANGE_HOURS="$(node -p "require('courtchamps-shared').LADDER_PLAYOFF_HOST_ARRANGE_HOURS")"
export MAESTRO_LADDER_AUTO_ACCEPT_HOURS="$(node -p "require('courtchamps-shared').LADDER_PLAYOFF_MATCH_AUTO_ACCEPT_HOURS")"
pattern="${1:-}"
device=(); [ -n "${MAESTRO_DEVICE:-}" ] && device=(--device "$MAESTRO_DEVICE")
forward() { [[ "${MAESTRO_DEVICE:-}" == emulator-* ]] && adb -s "$MAESTRO_DEVICE" reverse tcp:8090 tcp:8090 >/dev/null; true; }
pass=0; flaky=(); failed=()
if [[ "$pattern" == "="* ]]; then flows=(".maestro/flows/${pattern#=}.yaml"); else flows=(.maestro/flows/*${pattern}*.yaml); fi
for flow in "${flows[@]}"; do
  name="$(basename "$flow" .yaml)"
  forward
  if maestro "${device[@]}" test "$flow" >"/tmp/maestro-$name.log" 2>&1; then
    echo "PASS  $name"; pass=$((pass + 1))
  elif forward; maestro "${device[@]}" test "$flow" >"/tmp/maestro-$name.retry.log" 2>&1; then
    echo "FLAKY $name (passed on retry)"; flaky+=("$name")
  else
    echo "FAIL  $name"; failed+=("$name")
    grep -E "FAILED|Assertion is|not found|Seed failed" "/tmp/maestro-$name.retry.log" | head -3
  fi
done
echo "passed: $pass, flaky: ${#flaky[@]}, failed: ${#failed[@]}"
[ ${#flaky[@]} -gt 0 ] && printf 'flaky: %s\n' "${flaky[@]}"
[ ${#failed[@]} -eq 0 ]
