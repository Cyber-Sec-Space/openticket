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
