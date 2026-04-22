import { randomUUID } from "crypto";

type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogContext {
  traceId?: string;
  userId?: string;
  path?: string;
  [key: string]: any;
}

class Logger {
  private formatLog(level: LogLevel, message: string, context?: LogContext, error?: any) {
    const timestamp = new Date().toISOString();
    const traceId = context?.traceId || randomUUID();
    
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      traceId,
      message,
      ...(context?.userId && { userId: context.userId }),
      ...(context?.path && { path: context.path }),
      ...(error && { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
    };

    // In a production environment, this would pipe to stdout (for Datadog/CloudWatch)
    // or send via HTTP to Sentry/Logstash.
    const logString = JSON.stringify(logEntry);

    switch (level) {
      case "info":
        console.log(`[${timestamp}] [INFO] [${traceId}] ${message}`);
        break;
      case "warn":
        console.warn(`[${timestamp}] [WARN] [${traceId}] ${message}`);
        break;
      case "error":
        console.error(`[${timestamp}] [ERROR] [${traceId}] ${message}\n${logString}`);
        break;
      case "debug":
        if (process.env.NODE_ENV !== "production") {
          console.debug(`[${timestamp}] [DEBUG] [${traceId}] ${message}`);
        }
        break;
    }
  }

  info(message: string, context?: LogContext) {
    this.formatLog("info", message, context);
  }

  warn(message: string, context?: LogContext) {
    this.formatLog("warn", message, context);
  }

  error(message: string, context?: LogContext, error?: any) {
    this.formatLog("error", message, context, error);
  }

  debug(message: string, context?: LogContext) {
    this.formatLog("debug", message, context);
  }
}

export const logger = new Logger();
