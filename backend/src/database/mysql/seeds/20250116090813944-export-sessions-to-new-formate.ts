/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-use-before-define */
/* eslint-disable no-await-in-loop */
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { AuthenticationCreds, BufferJSON, Buffer } from "baileys";
import { MySqlHelper } from "../mysql-helper";
import { createDevice } from "../repositories/device-repository";

dotenv.config();

export const exportSessionsToNewFormate = async () => {
  try {
    MySqlHelper.connect();
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST ?? "0.0.0.0",
      user: process.env.MYSQL_USER ?? "root",
      password: process.env.MYSQL_PASSWORD ?? "password",
      database: process.env.DB_NAME ?? "database",
      charset: "utf8mb4_0900_ai_ci"
    });
    const [Whatsapps] = await connection.query("SELECT * FROM Whatsapps");
    for (const whatsapp of Whatsapps as any) {
      const { session } = whatsapp;
      if (session === "") {
        console.error(
          "credenciais não encontradas, criando dispositivo sem credenciais."
        );
        await createDevice(whatsapp.id);
        continue;
      }
      const { creds } = JSON.parse(session, BufferJSON.reviver);

      console.log("Creds", JSON.stringify(creds));
      if (!creds) {
        console.error(`
          credenciais não encontradas para o whatsapp ${whatsapp.id}`
        );
        continue;
      }
      await importeDevice(creds, whatsapp.id);
    }
    connection.end();
    MySqlHelper.disconnect();
  } catch (error) {
    console.error(error);
  }
};

exportSessionsToNewFormate();

export async function importeDevice(
  creds: AuthenticationCreds,
  whatsappId: number
): Promise<void> {
  const values = [
    whatsappId,
    Buffer.from(creds.noiseKey.public || "", "utf-8"),
    Buffer.from(creds.noiseKey.private || "", "utf-8"),
    Buffer.from(creds.pairingEphemeralKeyPair.public || "", "utf-8"),
    Buffer.from(creds.pairingEphemeralKeyPair.private || "", "utf-8"),
    Buffer.from(creds.signedIdentityKey.public || "", "utf-8"),
    Buffer.from(creds.signedIdentityKey.private || "", "utf-8"),
    Buffer.from(creds.signedPreKey.keyPair.public || "", "utf-8"),
    Buffer.from(creds.signedPreKey.keyPair.private || "", "utf-8"),
    Buffer.from(creds.signedPreKey.signature || "", "utf-8"),
    creds.signedPreKey.keyId || null,
    creds.registrationId || null,
    creds.advSecretKey || null,
    JSON.stringify(creds.processedHistoryMessages) || null,
    creds.nextPreKeyId || null,
    creds.firstUnuploadedPreKeyId || null,
    creds.accountSyncCounter || null,
    JSON.stringify(creds.accountSettings) || null,
    creds.pairingCode || null,
    creds.lastPropHash || null,
    creds.routingInfo ? Buffer.from(creds.routingInfo, "utf-8") : null,
    creds.me?.id || null,
    creds.me?.lid || null,
    creds.me?.name || null,
    Buffer.from(creds.account?.details || "", "utf-8"),
    Buffer.from(creds.account?.accountSignatureKey || "", "utf-8"),
    Buffer.from(creds.account?.accountSignature || "", "utf-8"),
    Buffer.from(creds.account?.deviceSignature || "", "utf-8"),
    JSON.stringify(creds.signalIdentities) || null,
    creds.platform || null,
    creds.lastAccountSyncTimestamp || null,
    creds.myAppStateKeyId || null,
    1,
    new Date().toISOString().slice(0, 19).replace("T", " "),
    new Date().toISOString().slice(0, 19).replace("T", " ")
  ];

  console.log("Values", values);

  try {
    await MySqlHelper.query(
      `
      INSERT INTO devices (
        whatsapp_id,
        noise_key_public,
        noise_key_private,
        pairing_ephemeral_key_pair_public,
        pairing_ephemeral_key_pair_private,
        signed_identity_key_public,
        signed_identity_key_private,
        signed_pre_key_public,
        signed_pre_key_private,
        signed_pre_key_signature,
        signed_pre_key_id,
        registration_id,
        adv_secret_key,
        processed_history_messages,
        next_pre_key_id,
        first_unuploaded_pre_key_id,
        account_sync_counter,
        account_settings,
        pairing_code,
        last_prop_hash,
        routing_info,
        jid,
        lid,
        name,
        account_details,
        account_signature_key,
        account_signature,
        account_device_signature,
        signalIdentities,
        platform,
        last_account_sync_timestamp,
        my_app_state_key_id,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      values
    );
    console.log("dispositivo criado com sucesso.");
  } catch (error) {
    console.error("erro ao criar o dispositivo:", error);
  }
}