import { initAuthCreds } from "baileys";
import { MySqlHelper } from "../mysql-helper";

export async function createDevice(whatsappId: number): Promise<void> {
  const creds = initAuthCreds();

  const values = [
    whatsappId,
    creds.noiseKey.public,
    creds.noiseKey.private,
    creds.pairingEphemeralKeyPair.public,
    creds.pairingEphemeralKeyPair.private,
    creds.signedIdentityKey.public,
    creds.signedIdentityKey.private,
    creds.signedPreKey.keyPair.public,
    creds.signedPreKey.keyPair.private,
    creds.signedPreKey.signature,
    creds.signedPreKey.keyId,
    creds.registrationId,
    creds.advSecretKey,
    JSON.stringify(creds.processedHistoryMessages),
    creds.nextPreKeyId,
    creds.firstUnuploadedPreKeyId || null,
    creds.accountSyncCounter,
    JSON.stringify(creds.accountSettings),
    creds.pairingCode || null,
    creds.lastPropHash || null,
    creds.routingInfo ? JSON.stringify(creds.routingInfo) : null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    0,
    new Date().toISOString().replace("T", " ").slice(0, 23),
    new Date().toISOString().replace("T", " ").slice(0, 23)
  ];

  try {
    await MySqlHelper.exec(
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
    console.log("Dispositivo criado com sucesso.");
  } catch (error) {
    console.error("Erro ao criar o dispositivo:", error);
  }
}

export async function logoutDevice(whatsappId: number): Promise<void> {
  await MySqlHelper.exec(
    `UPDATE devices SET
    jid = NULL,
    lid = NULL,
    name = NULL,
    account_details = NULL,
    account_signature_key = NULL,
    account_signature = NULL,
    account_device_signature = NULL,
    signalIdentities = NULL,
    platform = NULL,
    last_account_sync_timestamp = NULL,
    my_app_state_key_id = NULL
    WHERE whatsapp_id = ?`,
    [whatsappId]
  );
}

export async function getDevice(whatsappId: number): Promise<any> {
  const rows = await MySqlHelper.query(
    "SELECT * FROM devices WHERE whatsapp_id = ?",
    [whatsappId]
  );
  return rows[0][0];
}

export async function deleteDevice(whatsappId: number): Promise<void> {
  await MySqlHelper.exec("DELETE FROM devices WHERE whatsapp_id = ?", [
    whatsappId
  ]);
}
