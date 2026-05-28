import { useState } from "react";

export function useProfileSelection() {
  const [selectedProfile, setSelectedProfile] = useState("default");
  return {
    selectedProfile,
    selectProfile: setSelectedProfile,
  };
}
