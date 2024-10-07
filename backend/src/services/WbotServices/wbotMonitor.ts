import {
  WASocket,
  BinaryNode,
  Contact as BContact
} from "@WhiskeysSockets/baileys";
import * as Sentry from "@sentry/node";

import { Op } from "sequelize";
import { Store } from "../../libs/store";
import Contact from "../../models/Contact";
import Setting from "../../models/Setting";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import { logger } from "../../utils/logger";
import createOrUpdateBaileysService from "../BaileysServices/CreateOrUpdateBaileysService";
import CreateMessageService from "../MessageServices/CreateMessageService";

type Session = WASocket & {
  id?: number;
  store?: Store;
};

interface IContact {
  contacts: BContact[];
}

async function handleCallOffer(node: BinaryNode) {
  const { from, id } = node.attrs;
  console.log(`${from} is calling you with id ${id}`);
}

async function handleCallTerminate(wbot: Session, node: BinaryNode, content: any) {
  const sendMsgCall = await Setting.findOne({
    where: { key: "call" }
  });

  if (sendMsgCall?.value === "disabled") {
    //console.log("Mensagem Automática");
    await wbot.sendMessage(node.attrs.from, {
      text: "*Mensagem Automática:*\nAs chamadas de voz e vídeo estão desabilitadas para esse WhatsApp, favor enviar uma mensagem de texto. Obrigado"
    });

    const number = node.attrs.from.replace(/\D/g, "");

    const contact = await Contact.findOne({
      where: { number }
    });

    if (!contact) return;

    const ticket = await Ticket.findOne({
      where: {
        contactId: contact.id,
        whatsappId: wbot.id,
        status: { [Op.or]: ["open", "pending"] }
      }
    });

    if (!ticket) return;

    const date = new Date();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const body = `Chamada de voz/vídeo perdida às ${hours}:${minutes}`;

    const messageData = {
      id: content.attrs["call-id"],
      ticketId: ticket.id,
      contactId: contact.id,
      body,
      fromMe: false,
      mediaType: "call_log",
      read: true,
      quotedMsgId: null,
      ack: 1
    };

    await ticket.update({
      lastMessage: body
    });

    return CreateMessageService({ messageData });
  }
}

function handleCBCall(wbot: Session, node: BinaryNode) {
  const content = node.content[0] as any;
  //console.log(content);

  if (content.tag === "offer") {
    return handleCallOffer(node);
  }

  if (content.tag === "terminate") {
    return handleCallTerminate(wbot, node, content);
  }
}

function handleCall(wbot: Session, call: any) {
  console.log(call);
}

const wbotMonitor = async (
  wbot: Session,
  whatsapp: Whatsapp
): Promise<void> => {
  try {
    // Aplicar o tratamento tanto no evento "CB:call" quanto no "call"
    wbot.ws.on("CB:call", (node: BinaryNode) => handleCBCall(wbot, node));    
	
	  wbot.ev.on('call', ([ call ]) =>  handleCall(wbot, call));
   
    	
    wbot.ev.on("contacts.upsert", async (contacts: BContact[]) => {
      await createOrUpdateBaileysService({
        whatsappId: whatsapp.id,
        contacts
      });
    });

  } catch (err) {
    Sentry.captureException(err);
    logger.error(err);
  }
};

export default wbotMonitor;
