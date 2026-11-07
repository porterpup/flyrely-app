#!/bin/sh
# Usage: check-copilot-sentinel.sh present|absent
# Greps the production build output for the copilot sentinel string.
set -eu
mode="${1:?usage: $0 present|absent}"
dir=".output"
[ -d "$dir" ] || { echo "build output $dir not found" >&2; exit 2; }
if grep -rqF "__flyrely_copilot__" "$dir"; then found=1; else found=0; fi
case "$mode" in
  absent)  [ "$found" -eq 0 ] || { echo "FAIL: sentinel found in flag-off build" >&2; exit 1; }; echo "OK: sentinel absent" ;;
  present) [ "$found" -eq 1 ] || { echo "FAIL: sentinel missing in flag-on build" >&2; exit 1; }; echo "OK: sentinel present" ;;
  *) echo "unknown mode $mode" >&2; exit 2 ;;
esac
