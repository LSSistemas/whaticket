import Whatsapp from "../models/Whatsapp";
import GetWhatsappWbot from "./GetWhatsappWbot";
import SendWhatsAppMedia, { processAudio, processAudioFile } from "../services/WbotServices/SendWhatsAppMedia";
import mime from "mime-types";
import fs from "fs";
import { AnyMessageContent, WAUrlInfo, 
    WATextMessage,
    MessageContentGenerationOptions,
    MessageGenerationOptions } from "@adiwajshing/baileys";

export type MessageData = {
  number: number | string;
  body: string;
  mediaPath?: string;
};

export const URL_REGEX = /[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)?/gi
export const URL_EXCLUDE_REGEX = /.*@.*/

export const extractUrlFromText = (text: string) => (
	!URL_EXCLUDE_REGEX.test(text) ? text.match(URL_REGEX)?.[0] : undefined
)

export const generateLinkPreviewIfRequired = async(text: string, getUrlInfo: MessageGenerationOptions['getUrlInfo'], logger: MessageGenerationOptions['logger']) => {
	const url = extractUrlFromText(text)
	if(!!getUrlInfo && url) {
		try {
			const urlInfo = await getUrlInfo(url)
			return urlInfo
		} catch(error) { // ignore if fails
			logger?.warn({ trace: error.stack }, 'url generation failed')
		}
	}
}

export const SendMessage = async (
  whatsapp: Whatsapp,
  messageData: MessageData
): Promise<any> => {
  try {
    const wbot = await GetWhatsappWbot(whatsapp);
    const jid = `${messageData.number}@s.whatsapp.net`;
    let message: any;
    const body = `\u200e${messageData.body}`;
    console.log("envio de mensagem");
    if (messageData.mediaPath) {

      const media = {
        path: messageData.mediaPath,
        mimetype: mime.lookup(messageData.mediaPath)
      } as Express.Multer.File;

      console.log(media)
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

       message = await wbot.sendMessage(
        jid,
        {
          ...options
        }
      );

      console.log(message);
    } else {

      
      let l: WAUrlInfo;
      let urlInfo = message.linkPreview
      let options: MessageContentGenerationOptions;

      if(body.indexOf('http://') || body.indexOf('https://')) 
      {
        l = await generateLinkPreviewIfRequired(message.text, options.getUrlInfo, options.logger)
        urlInfo.canonicalUrl = l['canonical-url']
        urlInfo.matchedText = l['matched-text']
        urlInfo.jpegThumbnail = l.jpegThumbnail
        urlInfo.description = l.description
        urlInfo.title = l.title
        urlInfo.previewType = 0
      }

      message = await wbot.sendMessage(jid, {
        text: body,
        linkPreview: urlInfo
      });
    }

    return message;
  } catch (err: any) {
    console.log(err)
    throw new Error(err);
  }
};
