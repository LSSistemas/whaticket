import { WASocket } from "baileys";
import { Store } from "../libs/store";
import { getWbot } from "../libs/wbot";
import Whatsapp from "../models/Whatsapp";
type Session = WASocket & {
  id?: number;
  store?: Store;
};
const GetWhatsappWbot = async (whatsapp: Whatsapp): Promise<Session> => {
  const wbot = await getWbot(whatsapp.id);
  return wbot;
};

export default GetWhatsappWbot;
