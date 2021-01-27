

export interface IParserSettings {
    ecmaVersion?: string,
    bufferSize?: number
}

export function parse(settings: IParserSettings) : Buffer {
    const code = Buffer.alloc(settings.bufferSize || 5000);
    return code;
}