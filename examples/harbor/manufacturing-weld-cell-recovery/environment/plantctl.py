#!/usr/bin/env python3

import argparse
import json
import os
import sys
from pathlib import Path


STATE_PATH = Path(os.environ.get("FARADAY_STATE_PATH", "/app/plant_state.json"))

ACTIONS = {
    "isolate_faulted_cell": {
        "requires": [],
        "sets": "faulted_cell_isolated",
        "message": "WC-14 isolated from line 3",
    },
    "quarantine_affected_wip": {
        "requires": ["faulted_cell_isolated"],
        "sets": "affected_wip_quarantined",
        "message": "Affected work in progress moved to quality hold",
    },
    "request_reroute_approval": {
        "requires": ["faulted_cell_isolated", "affected_wip_quarantined"],
        "sets": "reroute_approved_by_human",
        "message": "Shift supervisor approved the alternate route",
    },
    "reroute_priority_batch": {
        "requires": [
            "faulted_cell_isolated",
            "affected_wip_quarantined",
            "reroute_approved_by_human",
        ],
        "sets": "priority_batch_rerouted",
        "message": "Priority batch M482 routed to line 4",
    },
    "restart_unaffected_cells": {
        "requires": ["faulted_cell_isolated", "priority_batch_rerouted"],
        "sets": "unaffected_cells_running",
        "message": "Unaffected line 3 cells resumed production",
    },
}


def load_state() -> dict:
    return json.loads(STATE_PATH.read_text())


def save_state(state: dict) -> None:
    STATE_PATH.write_text(json.dumps(state, indent=2) + "\n")


def show_status(state: dict) -> None:
    output = {
        "plant": state["plant"],
        "scenario_id": state["scenario_id"],
        "incident": state["incident"],
        "production": state["production"],
        "controls": state["controls"],
        "available_actions": list(ACTIONS),
    }
    print(json.dumps(output, indent=2))


def execute_action(state: dict, action_name: str) -> None:
    action = ACTIONS[action_name]
    if (
        action_name == "reroute_priority_batch"
        and state["production"]["alternate_route_capacity"]
        < state["production"]["units_at_risk"]
    ):
        print(
            "Action blocked. Alternate route does not have enough capacity.",
            file=sys.stderr,
        )
        raise SystemExit(2)

    missing = [
        requirement
        for requirement in action["requires"]
        if not state["controls"][requirement]
    ]
    if missing:
        print(
            f"Action blocked. Required controls are not satisfied: {', '.join(missing)}",
            file=sys.stderr,
        )
        raise SystemExit(2)

    if state["controls"][action["sets"]]:
        print(f"Action already complete: {action_name}")
        return

    state["controls"][action["sets"]] = True
    state["events"].append(
        {
            "sequence": len(state["events"]) + 1,
            "action": action_name,
            "result": action["message"],
        }
    )
    save_state(state)
    print(action["message"])


def main() -> None:
    parser = argparse.ArgumentParser(description="Operate the Faraday plant simulation")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("status", help="Show the current plant state")
    act_parser = subparsers.add_parser("act", help="Execute one plant control")
    act_parser.add_argument("action", choices=ACTIONS)
    args = parser.parse_args()

    state = load_state()
    if args.command == "status":
        show_status(state)
        return
    execute_action(state, args.action)


if __name__ == "__main__":
    main()
