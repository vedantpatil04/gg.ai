import client from "./client";
import type { Theme } from "@/lib/theme";

export interface AppearanceSettings {
  theme: Theme;
}

export const appearanceApi = {
  get: () =>
    client
      .get<{ success: boolean; data: { appearance: AppearanceSettings } }>("/settings/appearance")
      .then((r) => r.data),

  update: (theme: Theme) =>
    client
      .patch<{ success: boolean; data: { appearance: AppearanceSettings } }>("/settings/appearance", { theme })
      .then((r) => r.data),
};
