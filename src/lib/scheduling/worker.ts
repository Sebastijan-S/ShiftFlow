import { generate, type ScheduleInput } from "./engine";
self.onmessage = (event: MessageEvent<ScheduleInput>) => {
  try { self.postMessage({ type: "result", result: generate(event.data, { maxNodes: 25000, onProgress: (nodes) => self.postMessage({ type: "progress", nodes }) }) }); }
  catch (error) { self.postMessage({ type: "error", message: error instanceof Error ? error.message : "Generation failed" }); }
};
