import pino from "pino";

export const logger = pino({
  prettyPrint: {
    ignore: "pid,hostname"
  },
  level: "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      colorizeObjects: true
    }
  }
});
