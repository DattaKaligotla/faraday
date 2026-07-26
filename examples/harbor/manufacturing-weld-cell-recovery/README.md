# Manufacturing Weld-Cell Recovery

This is a Harbor-compatible Faraday environment for a production-line recovery scenario. An agent operates a
deterministic plant replica through `plantctl`; the verifier scores the resulting trajectory across safety, quality,
human oversight, and throughput.

## Run with Harbor

Install Harbor, then run the included oracle policy:

```sh
uv tool install harbor
harbor run \
  -p ./examples/harbor/manufacturing-weld-cell-recovery \
  -a oracle \
  -e docker
```

Replace `oracle` with an agent and model to collect evaluation rollouts:

```sh
harbor run \
  -p ./examples/harbor/manufacturing-weld-cell-recovery \
  -a terminus-2 \
  -m "<provider>/<model>" \
  -e docker
```

The task is self-contained and has no network access. Harbor writes the verifier's multi-metric reward to the trial
logs.

## Run from the Faraday demo

With Docker Desktop running, start the web app:

```sh
cd webapp
npm run dev -- --host 127.0.0.1 --port 5174
```

Open `http://127.0.0.1:5174/demo` and select **Run in Harbor**. The local demo uses a locked-down server endpoint to run
this task, poll its state, and display the action trace, verifier reward, job path, and Harbor output. The endpoint does
not accept task paths or shell arguments from the browser.
