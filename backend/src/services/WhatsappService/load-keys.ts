/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */

import { BufferJSON, proto, type SignalDataTypeMap } from "baileys";
import { deviceModelMapping } from "../../database/mysql/mappers/device-model-mapping";
import { MySqlHelper } from "../../database/mysql/mysql-helper";

export const loadKeys = async (
  type: string,
  ids: string[],
  deviceId: number
): Promise<any> => {
  const model = deviceModelMapping[type];
  if (!model) throw new Error(`unknown key type: ${type}`);

  const data: Record<string, SignalDataTypeMap> | any = {};
  for (const id of ids) {
    const key = `${id}key${deviceId}`;
    const rows = await MySqlHelper.query(
      `SELECT value FROM ${model} WHERE \`key\` = ?`,
      [key]
    );
    const row = rows[0][0] as any;
    if (!row?.value) continue;
    const parsedValue = JSON.parse(row.value, BufferJSON.reviver);

    if (type === "app-state-sync-key") {
      data[id] = proto.Message.AppStateSyncKeyData.fromObject(parsedValue);
    } else {
      data[id] = parsedValue;
    }
  }
  return data;
};
