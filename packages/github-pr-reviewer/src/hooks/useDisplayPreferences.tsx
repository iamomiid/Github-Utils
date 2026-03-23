import { createContext, useContext, ReactNode } from "react";
import { getPreferenceValues } from "@raycast/api";

interface DisplayPreferences {
  showRepository: boolean;
  showAuthor: boolean;
  showLastUpdated: boolean;
  showLineDiff: boolean;
  showApprovals: boolean;
}

const DisplayPreferencesContext = createContext<DisplayPreferences>({
  showRepository: true,
  showAuthor: true,
  showLastUpdated: true,
  showLineDiff: true,
  showApprovals: false,
});

export function DisplayPreferencesProvider({ children }: { children: ReactNode }) {
  const prefs = getPreferenceValues<DisplayPreferences>();
  
  return (
    <DisplayPreferencesContext.Provider value={prefs}>
      {children}
    </DisplayPreferencesContext.Provider>
  );
}

export function useDisplayPreferences() {
  return useContext(DisplayPreferencesContext);
}
