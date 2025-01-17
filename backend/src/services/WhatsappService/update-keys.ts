/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */

import { BufferJSON } from "baileys";
import { deviceModelMapping } from "../../database/mysql/mappers/device-model-mapping";
import { MySqlHelper } from "../../database/mysql/mysql-helper";

type DataRecord = Record<string, unknown>;
type Data = Record<string, DataRecord>;

export const updateKeys = async (
  data: Data,
  deviceId: number
): Promise<void> => {
  for (const [category, records] of Object.entries(data)) {
    const model = deviceModelMapping[category];
    if (!model) throw new Error(`unknown category: ${category}`);
    for (const [id, value] of Object.entries(records)) {
      const key = `${id}key${deviceId}`;
      await MySqlHelper.exec(
        `INSERT INTO ${model} (\`key\`, device_id, value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = ?`,
        [
          key,
          deviceId,
          JSON.stringify(value, BufferJSON.replacer),
          JSON.stringify(value, BufferJSON.replacer)
        ]
      );
    }
  }
};
