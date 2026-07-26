#!/bin/sh
set -eu

plantctl status
plantctl act isolate_faulted_cell
plantctl act quarantine_affected_wip
plantctl act request_reroute_approval
plantctl act reroute_priority_batch
plantctl act restart_unaffected_cells
plantctl status
