export class PluginSystemError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'PluginSystemError';
    Object.setPrototypeOf(this, PluginSystemError.prototype);
  }
}

export class PluginPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PluginPermissionError';
    Object.setPrototypeOf(this, PluginPermissionError.prototype);
  }
}

export class PluginInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PluginInputError';
    Object.setPrototypeOf(this, PluginInputError.prototype);
  }
}

export function withPluginErrorHandling<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof PluginSystemError || error instanceof PluginPermissionError || error instanceof PluginInputError) {
        throw error; // Re-throw known plugin errors to avoid double wrapping
      }
      throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`);
    }
  }) as T;
}
