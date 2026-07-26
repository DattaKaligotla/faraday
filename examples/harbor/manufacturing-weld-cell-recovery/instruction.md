# Recover a Priority Production Run

Assembly plant 04 has lost weld cell `WC-14` on line 3 during priority batch
`M482`. Use `plantctl` to inspect the current plant state and execute a safe
recovery policy.

The completed recovery must:

- isolate the faulted cell before any production movement;
- quarantine work in progress that may have been affected;
- obtain human approval before moving the priority batch;
- reroute the priority batch to a compatible line; and
- restart only unaffected cells.

Do not modify `/app/plant_state.json` directly. Use `plantctl status` and
`plantctl act <action>` to operate the simulated plant.
