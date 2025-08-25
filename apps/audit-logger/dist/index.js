import pino from "pino";
const logger = pino({
    level: process.env.LOG_LEVEL || "info",
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
        },
    },
});
logger.info("Audit logger initialized");
export const audit = (event) => {
    logger.info(event, "audit_event");
};
