import definitions from './profiles.json';
export type StyleProfile = {
  id: string; name: string; intent: string;
  palette: { background: string; ink: string; muted: string; red: string; blue: string; material: string; shade: string; gold: string };
  typography: { display: string; body: string };
  materials: string[]; spatialLanguage: string; lighting: string; motionCharacter: string;
  decorativeGuidance: string[]; consistencyRules: string[]; avoid: string[];
};
export const profiles = definitions as StyleProfile[];
