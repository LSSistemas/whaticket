import {
  downloadContentFromMessage,
  extractMessageContent,
  getContentType,
  jidNormalizedUser,
  MediaType,
  MessageUpsertType,
  proto,
  WAMessage,
  WAMessageStubType,
  WAMessageUpdate,
  WASocket,
} from "@WhiskeysSockets/baileys";
import * as Sentry from "@sentry/node";
import { v4 as uuidv4 } from 'uuid';
import { writeFile } from "fs"; import { join } from "path";
import { promisify } from "util";
import { debounce } from "../../helpers/Debounce";
import formatBody from "../../helpers/Mustache";
import { getIO } from "../../libs/socket";
import { Store } from "../../libs/store";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Setting from "../../models/Setting";
import Ticket from "../../models/Ticket";
import { logger } from "../../utils/logger";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import CreateMessageService from "../MessageServices/CreateMessageService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import { sayChatbot } from "./ChatBotListener";
import hourExpedient from "./hourExpedient";

type Session = WASocket & {
  id?: number;
  store?: Store;
};

interface ImessageUpsert {
  messages: proto.IWebMessageInfo[];
  type: MessageUpsertType;
}

interface IMe {
  name: string;
  id: string;
}

interface IMessage {
  messages: WAMessage[];
  isLatest: boolean;
}

const writeFileAsync = promisify(writeFile);

const getTypeMessage = (msg: proto.IWebMessageInfo): string => {
  return getContentType(msg.message);
};

const getBodyButton = (msg: proto.IWebMessageInfo): string => {
  if (msg.key.fromMe && msg?.message?.buttonsMessage?.contentText) {
    let bodyMessage = `*${msg?.message?.buttonsMessage?.contentText}*`;
    // eslint-disable-next-line no-restricted-syntax
    for (const buton of msg.message?.buttonsMessage?.buttons) {
      //console.log(buton);
      bodyMessage += `\n\n${buton.buttonText?.displayText}`;
    }
    return bodyMessage;
  }

  if (msg.key.fromMe && msg?.message?.listMessage) {
    let bodyMessage = `*${msg?.message?.listMessage?.description}*`;
    // eslint-disable-next-line no-restricted-syntax
    for (const buton of msg.message?.listMessage?.sections) {
      // eslint-disable-next-line no-restricted-syntax
      for (const rows of buton.rows) {
        bodyMessage += `\n\n${rows.title}`;
      }
    }

    return bodyMessage;
  }
};

const getAd = (msg: proto.IWebMessageInfo): string => {
  if (msg.key.fromMe && msg.message?.listResponseMessage?.contextInfo?.externalAdReply) {
    let bodyMessage = `*${msg.message?.listResponseMessage?.contextInfo?.externalAdReply?.title}*`;
    
      bodyMessage += `\n\n${msg.message?.listResponseMessage?.contextInfo?.externalAdReply?.body}`;

      return bodyMessage;
  }    
};

const getViewOnceMessage = (msg: proto.IWebMessageInfo): string => {
  if (msg.key.fromMe && msg?.message?.viewOnceMessage?.message?.buttonsMessage?.contentText) {
    let bodyMessage = `*${msg?.message?.viewOnceMessage?.message?.buttonsMessage?.contentText}*`;
    // eslint-disable-next-line no-restricted-syntax
    for (const buton of msg.message?.viewOnceMessage?.message?.buttonsMessage?.buttons) {
      //console.log(buton);
      bodyMessage += `\n\n${buton.buttonText?.displayText}`;
    }
    return bodyMessage;
  }

  if (msg.key.fromMe && msg?.message?.viewOnceMessage?.message?.listMessage) {
    let bodyMessage = `*${msg?.message?.viewOnceMessage?.message?.listMessage?.description}*`;
    // eslint-disable-next-line no-restricted-syntax
    for (const buton of msg.message?.viewOnceMessage?.message?.listMessage?.sections) {
      // eslint-disable-next-line no-restricted-syntax
      for (const rows of buton.rows) {
        bodyMessage += `\n\n${rows.title}`;
      }
    }

    return bodyMessage;
  }
};

export const getBodyMessage = (msg: proto.IWebMessageInfo): string | null => {
  try {
    const type = getTypeMessage(msg);

    const types = {
      viewOnceMessage:
        getViewOnceMessage(msg) || msg.message.listResponseMessage?.title,
      conversation: msg.message.conversation,
      imageMessage: msg.message.imageMessage?.caption ||
                    msg.message?.ephemeralMessage?.message?.imageMessage?.caption,
      videoMessage: msg.message.videoMessage?.caption ||
                    msg.message?.ephemeralMessage?.message?.videoMessage?.caption,
      extendedTextMessage: msg.message.extendedTextMessage?.text,
      reactionMessage: msg.message?.reactionMessage?.text,
      ephemeralMessage:
        msg.message?.ephemeralMessage?.message?.extendedTextMessage?.text,
      buttonsResponseMessage:
        msg.message.buttonsResponseMessage?.selectedDisplayText,
      listResponseMessage:
        msg.message.listResponseMessage?.singleSelectReply?.selectedRowId,
      templateButtonReplyMessage:
        msg.message?.templateButtonReplyMessage?.selectedId,
      messageContextInfo:
        msg.message.buttonsResponseMessage?.selectedButtonId ||
        msg.message.listResponseMessage?.title,
      buttonsMessage:
        getBodyButton(msg) || msg.message.listResponseMessage?.title,
      stickerMessage: "sticker",
      contactMessage: msg.message.contactMessage?.vcard,
      contactsArrayMessage: "varios contatos",
      locationMessage: `Latitude: ${msg.message.locationMessage?.degreesLatitude} - Longitude: ${msg.message.locationMessage?.degreesLongitude}`,
      liveLocationMessage: `Latitude: ${msg.message.liveLocationMessage?.degreesLatitude} - Longitude: ${msg.message.liveLocationMessage?.degreesLongitude}`,
      documentMessage: msg.message.documentMessage?.title,
      documentWithCaptionMessage: msg.message.documentWithCaptionMessage?.message?.documentMessage?.title,
      audioMessage: "Áudio",
      listMessage: getBodyButton(msg) || msg.message.listResponseMessage?.title,
      advertising: getAd(msg) || msg.message?.listResponseMessage?.contextInfo?.externalAdReply?.title,
    };

    const objKey = Object.keys(types).find(key => key === type);

    if (!objKey) {
      logger.warn(`#### Nao achou o type: ${type} ${JSON.stringify(msg?.message)}`);
      Sentry.setExtra("Mensagem", { BodyMsg: msg.message, msg, type });
      Sentry.captureException(
        new Error("Novo Tipo de Mensagem em getTypeMessage")
      );
    }
    return types[type];
  } catch (error) {
    Sentry.setExtra("Error getTypeMessage", { msg, BodyMsg: msg.message });
    Sentry.captureException(error);
    console.log(error);
  }
};

export const getQuotedMessage = (msg: proto.IWebMessageInfo): any => {
  const body = extractMessageContent(msg.message)[
    Object.keys(msg?.message).values().next().value
  ];

  if (!body?.contextInfo?.quotedMessage) return;
  const quoted = extractMessageContent(
    body?.contextInfo?.quotedMessage[
    Object.keys(body?.contextInfo?.quotedMessage).values().next().value
    ]
  );

  return quoted;
};

const getMeSocket = (wbot: Session): IMe => {
  return {
    id: jidNormalizedUser((wbot as WASocket).user.id),
    name: (wbot as WASocket).user.name
  };
};

const getSenderMessage = (
  msg: proto.IWebMessageInfo,
  wbot: Session
): string => {
  const me = getMeSocket(wbot);
  if (msg.key.fromMe) return me.id;

  const senderId =
    msg.participant || msg.key.participant || msg.key.remoteJid || undefined;

  return senderId && jidNormalizedUser(senderId);
};

const getContactMessage = async (msg: proto.IWebMessageInfo, wbot: Session) => {
  const isGroup = msg.key.remoteJid.includes("g.us");
  const rawNumber = msg.key.remoteJid.replace(/\D/g, "");
  return isGroup
    ? {
      id: getSenderMessage(msg, wbot),
      name: msg.pushName
    }
    : {
      id: msg.key.remoteJid,
      name: msg.key.fromMe ? rawNumber : msg.pushName
    };
};

const downloadMedia = async (msg: proto.IWebMessageInfo) => {
  const mineType =
    msg.message?.imageMessage ||
    msg.message?.viewOnceMessageV2?.message?.imageMessage ||
    msg.message?.viewOnceMessage?.message?.imageMessage ||
    msg.message?.ephemeralMessage?.message?.imageMessage ||
    msg.message?.audioMessage ||
    msg.message?.ephemeralMessage?.message?.audioMessage ||
    msg.message?.viewOnceMessageV2?.message?.audioMessage ||
    msg.message?.viewOnceMessage?.message?.audioMessage ||
    msg.message?.videoMessage ||
    msg.message?.ephemeralMessage?.message?.videoMessage ||
    msg.message?.viewOnceMessageV2?.message?.videoMessage ||
    msg.message?.viewOnceMessage?.message?.videoMessage ||
    msg.message?.stickerMessage ||
    msg.message?.ephemeralMessage?.message?.stickerMessage ||
    msg.message?.viewOnceMessageV2?.message?.stickerMessage ||
    msg.message?.viewOnceMessage?.message?.stickerMessage ||
    msg.message?.documentMessage ||
    msg.message?.documentWithCaptionMessage?.message?.documentMessage ||
    msg.message?.ephemeralMessage?.message?.documentMessage ||
    msg.message?.viewOnceMessageV2?.message?.documentMessage ||
    msg.message?.viewOnceMessage?.message?.documentMessage ||
    msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;

  const messageType = mineType.mimetype
    .split("/")[0]
    .replace("application", "document")
    ? (mineType.mimetype
      .split("/")[0]
      .replace("application", "document") as MediaType)
    : (mineType.mimetype.split("/")[0] as MediaType);

  const stream = await downloadContentFromMessage(
    msg.message.audioMessage ||
    msg.message.ephemeralMessage?.message?.audioMessage ||
    msg.message.viewOnceMessageV2?.message?.audioMessage ||
    msg.message.viewOnceMessage?.message?.audioMessage ||

    msg.message.videoMessage ||
    msg.message.ephemeralMessage?.message?.videoMessage ||
    msg.message.viewOnceMessageV2?.message?.videoMessage ||
    msg.message.viewOnceMessage?.message?.videoMessage ||

    msg.message.documentMessage ||
    msg.message.documentWithCaptionMessage?.message?.documentMessage ||
    msg.message.ephemeralMessage?.message?.documentMessage ||
    msg.message.viewOnceMessageV2?.message?.documentMessage ||
    msg.message.viewOnceMessage?.message?.documentMessage ||

    msg.message.imageMessage ||
    msg.message.viewOnceMessageV2?.message?.imageMessage ||
    msg.message.viewOnceMessage?.message?.imageMessage ||
    msg.message.ephemeralMessage?.message?.imageMessage ||

    msg.message.stickerMessage ||
    msg.message.ephemeralMessage?.message?.stickerMessage ||
    msg.message.viewOnceMessageV2?.message?.stickerMessage ||
    msg.message.viewOnceMessage?.message?.stickerMessage ||

    msg.message.extendedTextMessage?.contextInfo.quotedMessage.imageMessage,
    messageType
  );

  let buffer = Buffer.from([]);

  // eslint-disable-next-line no-restricted-syntax
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }

  if (!buffer) {
    throw new Error("ERR_WAPP_DOWNLOAD_MEDIA");
  }

  const ext = mineType.mimetype.split("/")[1].split(";")[0];
  let filename = `${uuidv4()}.${ext}`;

  const media = {
    data: buffer,
    mimetype: mineType.mimetype,
    filename
  };

  return media;
};

const verifyContact = async (
  msgContact: IMe,
  wbot: Session
): Promise<Contact> => {
  let profilePicUrl: string;
  try {
    profilePicUrl = await wbot.profilePictureUrl(msgContact.id);
  } catch {
    profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
  }

  const contactData = {
    name: msgContact?.name || msgContact.id.replace(/\D/g, ""),
    number: msgContact.id.replace(/\D/g, ""),
    profilePicUrl,
    isGroup: msgContact.id.includes("g.us")
  };

  const contact = CreateOrUpdateContactService(contactData);

  return contact;
};

export const getQuotedMessageId = (msg: proto.IWebMessageInfo): string => {
  const body = extractMessageContent(msg.message)[
    Object.keys(msg?.message).values().next().value
  ];

  return body?.contextInfo?.stanzaId;
};

const verifyQuotedMessage = async (
  msg: proto.IWebMessageInfo
): Promise<Message | null> => {
  if (!msg) return null;
  const quoted = getQuotedMessageId(msg);

  if (!quoted) return null;

  const quotedMsg = await Message.findOne({
    where: { id: quoted }
  });

  if (!quotedMsg) return null;

  return quotedMsg;
};

const verifyMediaMessage = async (
  msg: proto.IWebMessageInfo,
  ticket: Ticket,
  contact: Contact
): Promise<Message> => {

  const quotedMsg = await verifyQuotedMessage(msg);

  const media = await downloadMedia(msg);

  if (!media) {
    throw new Error("ERR_WAPP_DOWNLOAD_MEDIA");
  }

  if (!media.filename) {
    const ext = media.mimetype.split("/")[1].split(";")[0];
    media.filename = `${new Date().getTime()}.${ext}`;
  }

  try {
    await writeFileAsync(
      join(__dirname, "..", "..", "..", "public", media.filename),
      media.data,
      "base64"
    );
  } catch (err) {
    Sentry.captureException(err);
    logger.error(err);
  }

  const body = getBodyMessage(msg);
  const messageData = {
    id: msg.key.id,
    ticketId: ticket.id,
    contactId: msg.key.fromMe ? undefined : contact.id,
    body: body || media.filename,
    fromMe: msg.key.fromMe,
    read: msg.key.fromMe,
    mediaUrl: media.filename,
    mediaType: media.mimetype.split("/")[0],
    quotedMsgId: quotedMsg?.id,
    ack: msg.status,
    remoteJid: msg.key.remoteJid,
    participant: msg.key.participant,
    dataJson: JSON.stringify(msg)
  };

  await ticket.update({
    lastMessage: body || media.filename
  });

  const newMessage = await CreateMessageService({ messageData });

  return newMessage;
};

export const verifyMessage = async (
  msg: proto.IWebMessageInfo,
  ticket: Ticket,
  contact: Contact,
  textMassMessage?: string
): Promise<Message> => {
  const quotedMsg = await verifyQuotedMessage(msg);
  const body = getBodyMessage(msg);

  const messageData = {
    id: msg.key.id,
    ticketId: ticket.id,
    contactId: msg.key.fromMe ? undefined : contact.id,
    body,
    fromMe: msg.key.fromMe,
    mediaType: getTypeMessage(msg),
    read: msg.key.fromMe,
    quotedMsgId: quotedMsg?.id,
    ack: msg.status,
    remoteJid: msg.key.remoteJid,
    participant: msg.key.participant,
    dataJson: JSON.stringify(msg),
    textMassMessage
  };

  await ticket.update({
    lastMessage: body
  });

  return CreateMessageService({ messageData });
};

const isValidMsg = (msg: proto.IWebMessageInfo): boolean => {
  if (msg.key.remoteJid === "status@broadcast") return false;
  const msgType = getTypeMessage(msg);
  const ifType =
    msgType === "conversation" ||
    msgType === "extendedTextMessage" ||
    msgType === "audioMessage" ||
    msgType === "videoMessage" ||
    msgType === "imageMessage" ||
    msgType === "documentMessage" ||
    msgType === "documentWithCaptionMessage" ||
    msgType === "stickerMessage" ||
    msgType === "buttonsResponseMessage" ||
    msgType === "buttonsMessage" ||
    msgType === "messageContextInfo" ||
    msgType === "locationMessage" ||
    msgType === "liveLocationMessage" ||
    msgType === "contactMessage" ||
    msgType === "voiceMessage" ||
    msgType === "mediaMessage" ||
    msgType === "contactsArrayMessage" ||
    msgType === "reactionMessage" ||
    msgType === "ephemeralMessage" ||
    msgType === "protocolMessage" ||
    msgType === "listResponseMessage" ||
    msgType === "listMessage" ||
    msgType === "viewOnceMessage" ||
    msgType === "advertising";

  return !!ifType;
};

const verifyQueue = async (
  wbot: Session,
  msg: proto.IWebMessageInfo,
  ticket: Ticket,
  contact: Contact
) => {
  const { queues, greetingMessage } = await ShowWhatsAppService(wbot.id!);

  if (queues.length === 0) {
    return;
  }
  if (queues.length === 1) {
    await UpdateTicketService({
      ticketData: { queueId: queues[0].id },
      ticketId: ticket.id
    });
  }

  const selectedOption =
    msg?.message?.buttonsResponseMessage?.selectedButtonId ||
    msg?.message?.listResponseMessage?.singleSelectReply.selectedRowId ||
    getBodyMessage(msg);

  const choosenQueue = queues[+selectedOption - 1];

  const buttonActive = await Setting.findOne({
    where: {
      key: "chatBotType"
    }
  });

  const botText = async () => {
    if (choosenQueue && queues.length > 1) {
      await UpdateTicketService({
        ticketData: { queueId: choosenQueue.id },
        ticketId: ticket.id
      });

      if (choosenQueue.chatbots.length > 0) {
        let options = "";
        choosenQueue.chatbots.forEach((chatbot, index) => {
          options += `*${index + 1}* - ${chatbot.name}\n`;
        });

        const body = formatBody(
          `\u200e${choosenQueue.greetingMessage}\n\n${options}\n*#* Voltar para o menu principal`,
          contact
        );
        const sentMessage = await wbot.sendMessage(
          `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          {
            text: body
          }
        );

        await verifyMessage(sentMessage, ticket, contact);
      }

      if ((!choosenQueue.chatbots.length || choosenQueue.chatbots.length == 0) && choosenQueue.greetingMessage !== undefined && choosenQueue.greetingMessage.length > 0) {
        const body = formatBody(
          `\u200e${choosenQueue.greetingMessage}`,
          contact
        );
        const sentMessage = await wbot.sendMessage(
          `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          {
            text: body
          }
        );

        await verifyMessage(sentMessage, ticket, contact);
      }
    } else {

      if (greetingMessage !== null && greetingMessage !== undefined && greetingMessage.length > 0) {
        let options = "";

        if (queues.length > 1) {
          queues.forEach((queue, index) => {
            options += `*${index + 1}* - ${queue.name}\n`;
          });
        }

        var body = formatBody(
          `\u200e${greetingMessage}` + (options != "" ? `\n\n${options}` : ``),
          contact
        );

        const debouncedSentMessage = debounce(
          async () => {
            const sentMessage = await wbot.sendMessage(
              `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
              {
                text: body
              }
            );

            verifyMessage(sentMessage, ticket, contact);
          },
          3000,
          ticket.id
        );

        debouncedSentMessage();
      }
    }
  };

  const botButton = async () => {
    if (choosenQueue) {
      await UpdateTicketService({
        ticketData: { queueId: choosenQueue.id },
        ticketId: ticket.id
      });

      if (choosenQueue.chatbots.length > 0) {
        const buttons = [];
        choosenQueue.chatbots.forEach((queue, index) => {
          buttons.push({
            buttonId: `${index + 1}`,
            buttonText: { displayText: queue.name },
            type: 1
          });
        });

        const buttonMessage = {
          text: formatBody(`\u200e${choosenQueue.greetingMessage}`, contact),
          buttons,
          footer: 'OW NET',
          headerType: 1
        };

        const sendMsg = await wbot.sendMessage(
          `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          buttonMessage
        );

        await verifyMessage(sendMsg, ticket, contact);
      }

      if (!choosenQueue.chatbots.length && choosenQueue.greetingMessage !== null && choosenQueue.greetingMessage !== undefined && choosenQueue.greetingMessage.length > 0) {
        const body = formatBody(
          `\u200e${choosenQueue.greetingMessage}`,
          contact
        );
        const sentMessage = await wbot.sendMessage(
          `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          {
            text: body
          }
        );

        await verifyMessage(sentMessage, ticket, contact);
      }
    } else {
      if (greetingMessage !== null && greetingMessage !== undefined && greetingMessage.length > 0) {
        const buttons = [];
        queues.forEach((queue, index) => {
          buttons.push({
            buttonId: `${index + 1}`,
            buttonText: { displayText: queue.name },
            type: 4
          });
        });

        const buttonMessage = {
          text: formatBody(`\u200e${greetingMessage}`, contact),
          buttons,
          footer: 'OW NET',
          headerType: 1
        };

        const sendMsg = await wbot.sendMessage(
          `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          buttonMessage
        );

        await verifyMessage(sendMsg, ticket, contact);
      }
    }
  };

  const botList = async () => {
    if (choosenQueue) {
      await UpdateTicketService({
        ticketData: { queueId: choosenQueue.id },
        ticketId: ticket.id
      });

      if (choosenQueue.chatbots.length > 0) {
        const sectionsRows = [];
        choosenQueue.chatbots.forEach((queue, index) => {
          sectionsRows.push({
            title: queue.name,
            rowId: `${index + 1}`
          });
        });

        const sections = [
          {
            title: "Menu",
            rows: sectionsRows
          }
        ];

        const listMessage = {
          text: formatBody(`\u200e${choosenQueue.greetingMessage}`, contact),
          buttonText: "Escolha uma opção",
          footer: 'OW NET',
          title: 'OW NET',
          sections
        };

        const sendMsg = await wbot.sendMessage(
          `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          listMessage
        );

        await verifyMessage(sendMsg, ticket, contact);
      }

      if (!choosenQueue.chatbots.length) {
        const body = formatBody(
          `\u200e${choosenQueue.greetingMessage}`,
          contact
        );

        const sentMessage = await wbot.sendMessage(
          `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          {
            text: body
          }
        );

        await verifyMessage(sentMessage, ticket, contact);
      }
    } else {
      if (greetingMessage !== null && greetingMessage !== undefined && greetingMessage.length > 0) {
        const sectionsRows = [];

        queues.forEach((queue, index) => {
          sectionsRows.push({
            title: queue.name,
            rowId: `${index + 1}`
          });
        });

        const sections = [
          {
            title: "Menu",
            rows: sectionsRows
          }
        ];

        const listMessage = {
          text: formatBody(`\u200e${greetingMessage}`, contact),
          buttonText: "Escolha uma opção",
          sections
        };

        const sendMsg = await wbot.sendMessage(
          `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          listMessage
        );

        await verifyMessage(sendMsg, ticket, contact);
      }
    }
  };

  if (buttonActive.value === "text") {
    return botText();
  }

  if (buttonActive.value === "button" && queues.length > 4) {
    return botText();
  }

  if (buttonActive.value === "button" && queues.length <= 4) {
    return botButton();
  }

  if (buttonActive.value === "list") {
    return botList();
  }
};

const handleMessage = async (
  msg: proto.IWebMessageInfo,
  wbot: Session
): Promise<void> => {

  if (!isValidMsg(msg)) { return; }
  try {
    let msgContact: IMe;
    let groupContact: Contact | undefined;

    const isGroup = msg.key.remoteJid?.endsWith("@g.us");

    const msgIsGroupBlock = await Setting.findOne({
      where: { key: "CheckMsgIsGroup" }
    });

    var bodyMessage = getBodyMessage(msg);
    const msgType = getTypeMessage(msg);

    const hasMedia =
      msg.message?.imageMessage ||
      msg.message?.viewOnceMessageV2?.message?.imageMessage ||
      msg.message?.viewOnceMessage?.message?.imageMessage ||
      msg.message?.ephemeralMessage?.message?.imageMessage ||
      msg.message?.audioMessage ||
      msg.message?.ephemeralMessage?.message?.audioMessage ||
      msg.message?.viewOnceMessageV2?.message?.audioMessage ||
      msg.message?.viewOnceMessage?.message?.audioMessage ||
      msg.message?.videoMessage ||
      msg.message?.ephemeralMessage?.message?.videoMessage ||
      msg.message?.viewOnceMessageV2?.message?.videoMessage ||
      msg.message?.viewOnceMessage?.message?.videoMessage ||
      msg.message?.stickerMessage ||
      msg.message?.ephemeralMessage?.message?.stickerMessage ||
      msg.message?.viewOnceMessageV2?.message?.stickerMessage ||
      msg.message?.viewOnceMessage?.message?.stickerMessage ||
      msg.message?.documentMessage ||
      msg.message?.documentWithCaptionMessage?.message?.documentMessage ||
      msg.message?.ephemeralMessage?.message?.documentMessage ||
      msg.message?.viewOnceMessageV2?.message?.documentMessage ||
      msg.message?.viewOnceMessage?.message?.documentMessage ||
      msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
        ?.imageMessage;
    if (msg.key.fromMe) {
      if (/\u200e/.test(bodyMessage)) {
        bodyMessage = bodyMessage.replace(/\u200e/, '');
      };
      if (
        !hasMedia &&
        msgType !== "conversation" &&
        msgType !== "extendedTextMessage" &&
        msgType !== "ephemeralMessage" &&
        msgType !== "vcard" &&
        msgType !== "reactionMessage" &&
        msgType !== "protocolMessage" &&
        msgType !== "advertising"
      )
        return;

      msgContact = await getContactMessage(msg, wbot);
    } else {
      msgContact = await getContactMessage(msg, wbot);
    }

    if (msgIsGroupBlock?.value === "enabled" && isGroup) return;

    if (isGroup) {
      const grupoMeta = await wbot.groupMetadata(msg.key.remoteJid);
      const msgGroupContact = {
        id: grupoMeta.id,
        name: grupoMeta.subject
      };
      groupContact = await verifyContact(msgGroupContact, wbot);
    }
    const whatsapp = await ShowWhatsAppService(wbot.id!);
    const count = wbot.store.chats.get(
      msg.key.remoteJid || msg.key.participant
    );

    const unreadMessages = msg.key.fromMe ? 0 : count?.unreadCount || 1;
    const contact = await verifyContact(msgContact, wbot);

    if (
      unreadMessages === 0 &&
      whatsapp.farewellMessage &&
      formatBody(whatsapp.farewellMessage, contact) === bodyMessage
    )
      return;

    const ticket = await FindOrCreateTicketService({
      contact,
      whatsappId: wbot.id!,
      unreadMessages,
      groupContact,
      channel: "whatsapp"
    });

    if (hasMedia) {
      await verifyMediaMessage(msg, ticket, contact);
    } else {
      await verifyMessage(msg, ticket, contact);
    }
    const checkExpedient = await hourExpedient();
    if (checkExpedient) {
      if (
        !ticket.queue &&
        !isGroup &&
        !msg.key.fromMe &&
        !ticket.userId
      ) {
        await verifyQueue(wbot, msg, ticket, contact);
      }

      if (ticket.queue && ticket.queueId) {
        if (!ticket.user) {
          await sayChatbot(ticket.queueId, wbot, ticket, contact, msg);
        }
      }
    } else {
      if (!msg.key.fromMe) {
        const getLastMessageFromMe = await Message.findOne({
          where: {
            ticketId: ticket.id,
            fromMe: true
          },
          order: [["createdAt", "DESC"]]
        });

        if (
          getLastMessageFromMe?.body ===
          formatBody(`\u200e${whatsapp.outOfWorkMessage}`, contact)
        )
          return;

        const body = formatBody(`\u200e${whatsapp.outOfWorkMessage}`, contact);
        const sentMessage = await wbot.sendMessage(
          `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          {
            text: body
          }
        );
        await verifyMessage(sentMessage, ticket, contact);
      }
    }
  } catch (err) {
    console.log(err);
    Sentry.captureException(err);
    logger.error(`Error handling whatsapp message: Err: ${err}`);
  }
};

const handleMsgAck = async (
  msg: WAMessage,
  chat: number | null | undefined
) => {
  await new Promise(r => setTimeout(r, 500));
  const io = getIO();
  try {
    const messageToUpdate = await Message.findByPk(msg.key.id, {
      include: [
        "contact",
        {
          model: Message,
          as: "quotedMsg",
          include: ["contact"]
        }
      ]
    });

    if (!messageToUpdate) return;
    await messageToUpdate.update({ ack: chat });
    io.to(messageToUpdate.ticketId.toString()).emit("appMessage", {
      action: "update",
      message: messageToUpdate
    });
  } catch (err) {
    Sentry.captureException(err);
    logger.error(`Error handling message ack. Err: ${err}`);
  }
};

const filterMessages = (msg: WAMessage): boolean => {
  if (msg.message?.protocolMessage) return false;

  if (
    [
      WAMessageStubType.REVOKE,
      WAMessageStubType.E2E_DEVICE_CHANGED,
      WAMessageStubType.E2E_IDENTITY_CHANGED,
      WAMessageStubType.CIPHERTEXT
    ].includes(msg.messageStubType as WAMessageStubType)
  )
    return false;

  return true;
};

const wbotMessageListener = async (wbot: Session): Promise<void> => {
  try {
    wbot.ev.process(
      async (events) => {

        if (events['messages.upsert']) {
          const messageUpsert = events['messages.upsert'];
          const messages = messageUpsert.messages
            .filter(filterMessages).map(msg => msg);
       
          if (!messages) return;

          messages.forEach(async (message: proto.IWebMessageInfo) => {
            if (wbot.type === "md" && !message.key.fromMe && messageUpsert.type === "notify") {
              (wbot as WASocket)!.readMessages([message.key]);
            }            
            handleMessage(message, wbot);
          });

        } else if (events['messages.update']) {
          const messageUpdate = events['messages.update'];
          if (messageUpdate.length != 0) {
            messageUpdate.forEach(async (message: WAMessageUpdate) => {
              handleMsgAck(message, message.update.status);
            });
          }
        } else if (events['messaging-history.set']) {
          const { chats, contacts, messages, isLatest } = events['messaging-history.set']
          if (messages.length != 0) {
            messages.filter(filterMessages).map(msg => msg);
          }
        } else {
          console.log(events);
        }
      }
    );

  } catch (error) {
    Sentry.captureException(error);
    logger.error(`Error handling wbot message listener. Err: ${error}`);
  }
};

export { wbotMessageListener, handleMessage };