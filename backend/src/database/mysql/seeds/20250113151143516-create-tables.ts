/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
// src/database/mysql/seeds/20250113151143516-create-tables.ts

import dotenv from "dotenv";
import { MySqlHelper } from "../mysql-helper";

dotenv.config();

function extractTableName(query: string): string {
  const match = query.match(/CREATE TABLE IF NOT EXISTS\s+`(\w+)`/i);
  return match ? match[1] : "Desconhecida";
}

(async () => {
  try {
    await MySqlHelper.connect();

    const createDevicesTable = `
      CREATE TABLE IF NOT EXISTS \`devices\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`noise_key_private\` longblob NOT NULL,
        \`noise_key_public\` longblob NOT NULL,
        \`pairing_ephemeral_key_pair_private\` longblob NOT NULL,
        \`pairing_ephemeral_key_pair_public\` longblob NOT NULL,
        \`signed_identity_key_private\` longblob NOT NULL,
        \`signed_identity_key_public\` longblob NOT NULL,
        \`signed_pre_key_private\` longblob NOT NULL,
        \`signed_pre_key_public\` longblob NOT NULL,
        \`signed_pre_key_signature\` longblob NOT NULL,
        \`signed_pre_key_id\` int NOT NULL,
        \`registration_id\` int NOT NULL,
        \`adv_secret_key\` text COLLATE utf8mb4_unicode_ci NOT NULL,
        \`processed_history_messages\` json NOT NULL,
        \`next_pre_key_id\` int NOT NULL,
        \`first_unuploaded_pre_key_id\` int NOT NULL,
        \`account_sync_counter\` int NOT NULL,
        \`account_settings\` json NOT NULL,
        \`pairing_code\` text COLLATE utf8mb4_unicode_ci,
        \`last_prop_hash\` text COLLATE utf8mb4_unicode_ci,
        \`routing_info\` longblob,
        \`jid\` text COLLATE utf8mb4_unicode_ci,
        \`lid\` text COLLATE utf8mb4_unicode_ci,
        \`name\` text COLLATE utf8mb4_unicode_ci,
        \`account_details\` longblob,
        \`account_signature_key\` longblob,
        \`account_signature\` longblob,
        \`account_device_signature\` longblob,
        \`signalIdentities\` json DEFAULT NULL,
        \`platform\` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`last_account_sync_timestamp\` bigint DEFAULT NULL,
        \`my_app_state_key_id\` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`whatsapp_id\` int NOT NULL,
        \`status\` int NOT NULL DEFAULT '0',
        \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` datetime(3) NOT NULL,
        PRIMARY KEY (\`id\`)
      );
    `;

    const createSenderKeysTable = `
      CREATE TABLE IF NOT EXISTS \`sender_keys\` (
        \`key\` varchar(255) NOT NULL,
        \`value\` text NOT NULL,
        \`device_id\` int NOT NULL,
        PRIMARY KEY (\`key\`),
        KEY \`idx_sender_keys_key\` (\`key\`),
        KEY \`sender_keys_device_id_fkey\` (\`device_id\`),
        CONSTRAINT \`sender_keys_device_id_fkey\` FOREIGN KEY (\`device_id\`) REFERENCES \`devices\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `;

    const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS \`sessions\` (
        \`key\` varchar(255) NOT NULL,
        \`value\` text NOT NULL,
        \`device_id\` int NOT NULL,
        PRIMARY KEY (\`key\`),
        KEY \`idx_sessions_key\` (\`key\`),
        KEY \`sessions_device_id_fkey\` (\`device_id\`),
        CONSTRAINT \`sessions_device_id_fkey\` FOREIGN KEY (\`device_id\`) REFERENCES \`devices\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `;

    const createSenderKeyMemoryTable = `
      CREATE TABLE IF NOT EXISTS \`sender_key_memory\` (
        \`key\` varchar(255) NOT NULL,
        \`value\` text NOT NULL,
        \`device_id\` int NOT NULL,
        PRIMARY KEY (\`key\`),
        KEY \`idx_sender_key_memory_key\` (\`key\`),
        KEY \`sender_key_memory_device_id_fkey\` (\`device_id\`),
        CONSTRAINT \`sender_key_memory_device_id_fkey\` FOREIGN KEY (\`device_id\`) REFERENCES \`devices\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `;

    const createPreKeysTable = `
      CREATE TABLE IF NOT EXISTS \`pre_keys\` (
        \`key\` varchar(255) NOT NULL,
        \`value\` text NOT NULL,
        \`device_id\` int NOT NULL,
        PRIMARY KEY (\`key\`),
        KEY \`idx_pre_keys_key\` (\`key\`),
        KEY \`pre_keys_device_id_fkey\` (\`device_id\`),
        CONSTRAINT \`pre_keys_device_id_fkey\` FOREIGN KEY (\`device_id\`) REFERENCES \`devices\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `;

    const createAppStateSyncVersionTable = `
      CREATE TABLE IF NOT EXISTS \`app_state_sync_version\` (
        \`key\` varchar(255) NOT NULL,
        \`value\` text NOT NULL,
        \`device_id\` int NOT NULL,
        PRIMARY KEY (\`key\`),
        KEY \`idx_app_state_sync_version_key\` (\`key\`),
        KEY \`app_state_sync_version_device_id_fkey\` (\`device_id\`),
        CONSTRAINT \`app_state_sync_version_device_id_fkey\` FOREIGN KEY (\`device_id\`) REFERENCES \`devices\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `;

    const createAppStateSyncKeysTable = `
      CREATE TABLE IF NOT EXISTS \`app_state_sync_keys\` (
        \`key\` varchar(255) NOT NULL,
        \`value\` text NOT NULL,
        \`device_id\` int NOT NULL,
        PRIMARY KEY (\`key\`),
        KEY \`idx_app_state_sync_keys_key\` (\`key\`),
        KEY \`app_state_sync_keys_device_id_fkey\` (\`device_id\`),
        CONSTRAINT \`app_state_sync_keys_device_id_fkey\` FOREIGN KEY (\`device_id\`) REFERENCES \`devices\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `;

    const createTables = [
      createDevicesTable,
      createSenderKeysTable,
      createSessionsTable,
      createSenderKeyMemoryTable,
      createPreKeysTable,
      createAppStateSyncVersionTable,
      createAppStateSyncKeysTable
    ];

    for (const tableQuery of createTables) {
      await MySqlHelper.exec(tableQuery);
      console.log(`tabela criada com sucesso: ${extractTableName(tableQuery)}`);
    }
  } catch (error) {
    console.error("erro ao criar as tabelas:", error);
  } finally {
    await MySqlHelper.disconnect();
  }
})();
