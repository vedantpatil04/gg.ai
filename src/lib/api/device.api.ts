import client from "./client";

export type DevicePlatform = "android" | "ios" | "web";

export interface RegisteredDevice {
  platform: DevicePlatform;
  appId?: string;
  createdAt: string;
  lastSeenAt: string;
}

export const deviceApi = {
  register: async (token: string, platform: DevicePlatform = "android", appId?: string): Promise<void> => {
    await client.post("/notifications/devices", { token, platform, appId });
  },

  deactivate: async (token: string): Promise<void> => {
    await client.delete(`/notifications/devices/${encodeURIComponent(token)}`);
  },

  list: async (): Promise<RegisteredDevice[]> => {
    const res = await client.get("/notifications/devices");
    return res.data.data.devices as RegisteredDevice[];
  },
};
