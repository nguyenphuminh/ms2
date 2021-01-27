
import * as Acorn from "acorn";
import { CompilerContext } from "./CompilerContext";

export const enum IParserTypingType {
    STRING,
    NUMBER,
    BOOLEAN,
    UNDEFINED,
    NULL,
    FUNCTION,
    ARRAY,
    OBJECT,
    OBJECT_AS_ARRAY
}

export interface IParserSettings {
    ecmaVersion: 3 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | "latest",
    bufferSize: number,
    typings: Record<string, IParserTyping>,
    expectedExports: Record<string, IParserTyping>
}

export interface IParserTyping {
    type: IParserTypingType,
    params?: Array<IParserTyping>,
    props?: Record<string, IParserTyping>,
    only?: IParserTypingType,
    address?: number,
    required?: boolean,
    isConst?: boolean
    arrProps?: Array<string>
}

export const defaultParserSettings: IParserSettings = {
    ecmaVersion: 6,
    bufferSize: 5000,
    typings: {},
    expectedExports: {}
};


export function compileBlock() : void {
    return;
}

export function compile(code: string, settings: IParserSettings) : Buffer {
    const res = Buffer.alloc(settings.bufferSize as number);
    const parsed = Acorn.parse(code, {ecmaVersion: settings.ecmaVersion, sourceType: "module", locations: true});
    const ctx = new CompilerContext(settings);
    for (const variable in settings.typings) {
        const varType = settings.typings[variable];
        if (!varType.address) continue;
        ctx.variableIndexes[variable] = varType.address;
        ctx.variableTypes[varType.address] = varType;
        ctx.lastVariableAddress = varType.address; 
    }
    console.dir(parsed, {depth: 5});
    return res;
}