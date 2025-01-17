import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";
import { deleteDevice } from "../../database/mysql/repositories/device-repository";

const DeleteWhatsAppService = async (id: string): Promise<void> => {
  const whatsapp = await Whatsapp.findOne({
    where: { id }
  });

  if (!whatsapp) {
    throw new AppError("ERR_NO_WAPP_FOUND", 404);
  }

  await whatsapp.destroy();
  await deleteDevice(whatsapp.id);
};

export default DeleteWhatsAppService;
