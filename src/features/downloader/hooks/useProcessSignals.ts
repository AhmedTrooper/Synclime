import { useState } from "react";

export function useProcessSignals(initialStatus: "downloading" | "paused" | "completed" | "error" = "downloading") {
  const [status, setStatus] = useState(initialStatus);

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
