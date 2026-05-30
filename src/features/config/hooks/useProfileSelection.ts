import { createSignal } from "solid-js";

export function useProfileSelection() {
  const [selectedProfile, setSelectedProfile] = createSignal("default");
  return {
    selectedProfile,
    selectProfile: setSelectedProfile,
  };
}
