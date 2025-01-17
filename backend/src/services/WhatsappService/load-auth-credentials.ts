import { type AuthenticationCreds } from "baileys";

export const loadAuthCredentials = (device: any): AuthenticationCreds => {
  const toBuffer = (array: Uint8Array | Buffer | string): Buffer => {
    if (array instanceof Buffer) {
      return array;
    }
    return Buffer.from(array);
  };

  const creds: AuthenticationCreds = {
    noiseKey: {
      public: toBuffer(device.noise_key_public),
      private: toBuffer(device.noise_key_private)
    },
    pairingEphemeralKeyPair: {
      public: toBuffer(device.pairing_ephemeral_key_pair_public),
      private: toBuffer(device.pairing_ephemeral_key_pair_private)
    },
    signedIdentityKey: {
      public: toBuffer(device.signed_identity_key_public),
      private: toBuffer(device.signed_identity_key_private)
    },
    signedPreKey: {
      keyPair: {
        public: toBuffer(device.signed_pre_key_public),
        private: toBuffer(device.signed_pre_key_private)
      },
      signature: toBuffer(device.signed_pre_key_signature),
      keyId: device.signed_pre_key_id
    },
    registrationId: device.registration_id,
    advSecretKey: device.adv_secret_key,
    processedHistoryMessages: device.processed_history_messages,
    nextPreKeyId: device.next_pre_key_id,
    firstUnuploadedPreKeyId: device.first_unuploaded_pre_key_id,
    accountSyncCounter: device.account_sync_counter,
    accountSettings: device.account_settings,
    registered: device.registered,
    pairingCode: device.pairing_code,
    lastPropHash: device.last_prop_hash ?? undefined,
    routingInfo: device.routing_info,
    signalIdentities: device.signalIdentities,
    platform: device?.platform ?? undefined,
    lastAccountSyncTimestamp: device?.last_account_sync_timestamp ?? undefined,
    myAppStateKeyId: device?.my_app_state_key_id ?? undefined
  };

  if (device.jid) {
    creds.me = { id: device.jid };
    if (device.lid) creds.me.lid = device.lid;
    if (device.name) creds.me.name = device.name;
  }

  if (
    device.account_details &&
    device.account_signature_key &&
    device.account_signature &&
    device.account_device_signature
  ) {
    creds.account = {
      details: toBuffer(device.account_details),
      accountSignatureKey: toBuffer(device.account_signature_key),
      accountSignature: toBuffer(device.account_signature),
      deviceSignature: toBuffer(device.account_device_signature)
    };
  }

  return creds;
};
