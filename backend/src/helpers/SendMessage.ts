import Whatsapp from "../models/Whatsapp";
import GetWhatsappWbot from "./GetWhatsappWbot";
import SendWhatsAppMedia, { processAudio, processAudioFile } from "../services/WbotServices/SendWhatsAppMedia";
import mime from "mime-types";
import fs from "fs";
import { AnyMessageContent, WAUrlInfo, 
    WATextMessage,
    delay,
    MessageContentGenerationOptions,
    MessageGenerationOptions } from "@WhiskeysSockets/baileys";

export type MessageData = {
  number: number | string;
  body: string;
  mediaPath?: string;
};

export const SendMessage = async (
  whatsapp: Whatsapp,
  messageData: MessageData
): Promise<any> => {
  try {
    const wbot = await GetWhatsappWbot(whatsapp);
    const jid = `${messageData.number}@s.whatsapp.net`;
    let message: any;
    const body = `\u200e${messageData.body}`;
    //console.log("envio de mensagem");
    if (messageData.mediaPath) {

      const media = {
        path: messageData.mediaPath,
        mimetype: mime.lookup(messageData.mediaPath)
      } as Express.Multer.File;

      const pathMedia = messageData.mediaPath;
      const typeMessage = media.mimetype.split("/")[0];
      let options: AnyMessageContent;

      if (typeMessage === "video") {
        options = {
          video: fs.readFileSync(pathMedia),
          caption: body,
          fileName: media.originalname
          // gifPlayback: true
        };
      } else if (typeMessage === "audio") {
        const typeAudio = media.originalname.includes("audio-record-site");
        if (typeAudio) {
          const convert = await processAudio(media.path);
          options = {
            audio: fs.readFileSync(convert),
            mimetype: typeAudio ? "audio/mp4" : media.mimetype,
            ptt: true
          };
        } else {
          const convert = await processAudioFile(media.path);
          options = {
            audio: fs.readFileSync(convert),
            mimetype: typeAudio ? "audio/mp4" : media.mimetype
          };
        }
      } else if (typeMessage === "document") {
        options = {
          document: fs.readFileSync(pathMedia),
          caption: body,
          fileName: media.originalname,
          mimetype: media.mimetype
        };
      } else if (typeMessage === "application") {
        options = {
          document: fs.readFileSync(pathMedia),
          caption: body,
          fileName: media.originalname,
          mimetype: media.mimetype
        };
      } else {
        options = {
          image: fs.readFileSync(pathMedia),
          caption: body
        };
      }

      await wbot.presenceSubscribe(jid);
		  await delay(500);

		  await wbot.sendPresenceUpdate('composing', jid)
		  await delay(2000);

      await wbot.sendPresenceUpdate('paused', jid)

       message = await wbot.sendMessage(
        jid,
        {
          ...options
        }
      );

    } else {


      await wbot.presenceSubscribe(jid);
		  await delay(500);

		  await wbot.sendPresenceUpdate('composing', jid)
		  await delay(2000);

      await wbot.sendPresenceUpdate('paused', jid)

      message = await wbot.sendMessage(jid, {
        text: body
      });

      wbot.sendPresenceUpdate('available');
    }

    return message;
  } catch (err: any) {
    console.log(err)
    throw new Error(err);
  }
};
