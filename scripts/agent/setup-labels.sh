#!/usr/bin/env bash
# Creates the pipeline labels (= Kanban columns). Safe to re-run. Usage: scripts/agent/setup-labels.sh
set -euo pipefail
mk() { gh label create "$1" --color "$2" --description "$3" --force >/dev/null && echo "label $1"; }
mk status:backlog            ededed "Queued for the agent pipeline (add this to enqueue)"
mk status:triage             c5def5 "Haiku is triaging"
mk status:planning           bfd4f2 "Opus is planning"
mk status:needs-plan-approval fbca04 "Waiting for you: /approve or /reject <why>"
mk status:building           1d76db "Sonnet is building or fixing"
mk status:e2e-review         5319e7 "CI, E2E and Opus review"
mk status:needs-human        d93f0b "Blocked: needs your input"
mk status:ready-to-merge     0e8a16 "Verified: waiting for your merge"
mk status:done-already       cccccc "Triage found it already fixed: close if you agree"
mk hitl:paused               000000 "Pipeline ignores this ticket"
for s in S M L; do mk "size:$s" f9d0c4 "Triage size estimate"; done
for n in 1 2 3 4; do mk "retry:$n" fef2c0 "Fix attempts so far"; done
