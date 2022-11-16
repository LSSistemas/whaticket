import { WALegacySocket, WAMessage, MessageGenerationOptions, WAUrlInfo, MessageContentGenerationOptions, computeChallengeResponse } from "@adiwajshing/baileys";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import { getUrlInfo } from "../../helpers/link-preview";

import formatBody from "../../helpers/Mustache";


export const URL_REGEX = /[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)?/gi
export const URL_EXCLUDE_REGEX = /.*@.*/

export const extractUrlFromText = (text: string) => (
	!URL_EXCLUDE_REGEX.test(text) ? text.match(URL_REGEX)?.[0] : undefined
)

export const generateLinkPreviewIfRequired = async(text: string) => {
	const url = extractUrlFromText(text)
	if(url) {
		try {
			const urlInfo = await getUrlInfo(url)
			return urlInfo
		} catch(error) { // ignore if fails
			
		}
	}
}

interface Request {
  body: string;
  ticket: Ticket;
  quotedMsg?: Message;
}

const SendWhatsAppMessage = async ({
  body,
  ticket,
  quotedMsg
}: Request): Promise<WAMessage> => {
  let options = {};
  const wbot = await GetTicketWbot(ticket);
  const number = `${ticket.contact.number}@${
    ticket.isGroup ? "g.us" : "s.whatsapp.net"
  }`;
  if (quotedMsg) {
    if (wbot.type === "legacy") {
      const chatMessages = await (wbot as WALegacySocket).loadMessageFromWA(
        number,
        quotedMsg.id
      );

      options = {
        quoted: chatMessages
      };
    }

    if (wbot.type === "md") {
      const chatMessages = await Message.findOne({
        where: {
          id: quotedMsg.id
        }
      });

      const msgFound = JSON.parse(chatMessages.dataJson);

      if (msgFound.key.fromMe)
      {
          options = {
            quoted: {
              key: msgFound.key,
              message: {
                extendedTextMessage: msgFound.message.extendedTextMessage
              },
            }
          };
      } else {
          options = {
            quoted: {
              key: msgFound.key,
              message: msgFound.message
            },
          };
      }
      
    }
  }

  // let l: WAUrlInfo;

  // if(body.indexOf('http://') || body.indexOf('https://')) 
  // {
  //   let opt: MessageContentGenerationOptions;
  //   l = await generateLinkPreviewIfRequired(body)
  // } 

  try {
      const sentMessage = await wbot.sendMessage(
      number,
      {        
        text: formatBody(body, ticket.contact),    
        // linkPreview: l    
      },
      {
        ...options
      }
    );
    await ticket.update({ lastMessage: formatBody(body, ticket.contact) });
    return sentMessage;
  } catch (err) {
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMessage;
