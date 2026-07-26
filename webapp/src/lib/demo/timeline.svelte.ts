import { getContext, setContext } from "svelte";

export class Timeline {
  time = $state(0);
}

const KEY = Symbol("faraday-demo-timeline");

export function setTimeline(t: Timeline) {
  setContext(KEY, t);
  return t;
}

export function getTimeline(): Timeline {
  const t = getContext<Timeline | undefined>(KEY);
  if (!t) throw new Error("getTimeline() called outside <Stage>");
  return t;
}
