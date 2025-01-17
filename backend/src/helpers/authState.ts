/* eslint-disable no-return-await */
import { type AuthenticationState } from "baileys";
import {
  loadAuthCredentials,
  loadKeys,
  updateKeys,
  updateAuthCredentials
} from "../services/WhatsappService";
import { getDevice } from "../database/mysql/repositories/device-repository";

export const authState = async (
  whatsappId: number
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> => {
  const device = await getDevice(whatsappId);
  const creds = loadAuthCredentials(device);

  return {
    state: {
      creds,
      keys: {
        get: async (type: string, ids: string[]) =>
          await loadKeys(type, ids, device.id),
        set: async (data: Record<string, Record<string, unknown>>) => {
          await updateKeys(data, device.id);
        }
      }
    },
    saveCreds: async () => updateAuthCredentials(creds, device.id)
  };
};
