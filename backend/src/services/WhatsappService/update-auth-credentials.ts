import { type AuthenticationCreds } from "baileys";
import { MySqlHelper } from "../../database/mysql/mysql-helper";

export const updateAuthCredentials = async (
  creds: AuthenticationCreds,
  deviceId: number
): Promise<void> => {
  await MySqlHelper.exec(
    `UPDATE devices SET 
    noise_key_public = ?, noise_key_private = ?, 
    pairing_ephemeral_key_pair_public = ?, pairing_ephemeral_key_pair_private = ?, 
    signed_identity_key_public = ?, signed_identity_key_private = ?, 
    signed_pre_key_public = ?, signed_pre_key_private = ?, 
    signed_pre_key_signature = ?, signed_pre_key_id = ?, 
    registration_id = ?, adv_secret_key = ?, 
    processed_history_messages = ?, next_pre_key_id = ?, 
    first_unuploaded_pre_key_id = ?, account_sync_counter = ?, 
    account_settings = ?, 
    pairing_code = ?, last_prop_hash = ?, 
    routing_info = ?, account_details = ?, 
    account_signature_key = ?, account_signature = ?, 
    account_device_signature = ?, signalIdentities = ?, 
    platform = ?, last_account_sync_timestamp = ?, 
    my_app_state_key_id = ?, jid = ?, lid = ?, name = ? 
    WHERE id = ?`,
    [
      creds.noiseKey.public ?? null,
      creds.noiseKey.private ?? null,
      creds.pairingEphemeralKeyPair.public ?? null,
      creds.pairingEphemeralKeyPair.private ?? null,
      creds.signedIdentityKey.public ?? null,
      creds.signedIdentityKey.private ?? null,
      creds.signedPreKey.keyPair.public ?? null,
      creds.signedPreKey.keyPair.private ?? null,
      creds.signedPreKey.signature ?? null,
      creds.signedPreKey.keyId ?? null,
      creds.registrationId ?? null,
      creds.advSecretKey ?? null,
      creds.processedHistoryMessages ?? null,
      creds.nextPreKeyId ?? null,
      creds.firstUnuploadedPreKeyId ?? null,
      creds.accountSyncCounter ?? null,
      creds.accountSettings ?? null,
      creds.pairingCode ?? null,
      creds.lastPropHash ?? null,
      creds.routingInfo ?? null,
      creds.account?.details ?? null,
      creds.account?.accountSignatureKey ?? null,
      creds.account?.accountSignature ?? null,
      creds.account?.deviceSignature ?? null,
      creds.signalIdentities ?? null,
      creds?.platform ?? null,
      creds?.lastAccountSyncTimestamp ?? null,
      creds?.myAppStateKeyId ?? null,
      creds?.me?.id ?? null,
      creds?.me?.lid ?? null,
      creds?.me?.name ?? null,
      deviceId
    ]
  );
};
