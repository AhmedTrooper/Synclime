import { createSignal } from "solid-js";

export function useProcessSignals(initialStatus: "downloading" | "paused" | "completed" | "error" = "downloading") {
  const [status, setStatus] = createSignal(initialStatus);

  const togglePause = () => {
    setStatus((current) => (current === "downloading" ? "paused" : "downloading"));
  };

  const complete = () => {
    setStatus("completed");
  };

  const fail = () => {
    setStatus("error");
  };

  return {
    status,
    togglePause,
    complete,
    fail,
  };
}
