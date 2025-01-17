import gracefulShutdown from "http-graceful-shutdown";
import app from "./app";
import { initIO } from "./libs/socket";
import { logger } from "./utils/logger";
import { StartAllWhatsAppsSessions } from "./services/WbotServices/StartAllWhatsAppsSessions";
import { MySqlHelper } from "./database/mysql/mysql-helper";

(async () => {
  await MySqlHelper.connect();
  const server = app.listen(process.env.PORT, () => {
    logger.info(`Server started on port: ${process.env.PORT}`);
  });

  initIO(server);
  StartAllWhatsAppsSessions();
  gracefulShutdown(server);
})();
