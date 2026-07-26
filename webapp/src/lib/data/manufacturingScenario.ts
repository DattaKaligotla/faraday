export const manufacturingScenario = {
  plant: "Assembly plant 04",
  evaluation: "Harbor evaluation",
  scenarioId: "MF-047",
  scenario: "Weld-cell outage",
  detail: "Line 3 · priority batch M482",
  sources: [
    { label: "Work orders", detail: "production schedule", position: "source-a" },
    { label: "Line state", detail: "WIP + cycle time", position: "source-b" },
    { label: "Quality", detail: "inspection signals", position: "source-c" },
  ],
  policy: {
    label: "Recovery policy",
    action: "Reroute approved · line 4",
  },
  evidence: [
    { label: "Safety", value: "Passed" },
    { label: "Throughput", value: "Recovered" },
    { label: "Quality", value: "Protected" },
  ],
} as const;
