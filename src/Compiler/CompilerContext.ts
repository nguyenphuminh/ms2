
import { IParserSettings, IParserTyping, IParserTypingType } from ".";
import { OP_CODES } from "../Interpreter";


export class CompilerContext {
    currentBlockSize: number
    offset: number
    lastVariableAddress: number
    variableIndexes: Record<string, number>
    variableTypes: Record<number, IParserTyping>
    functionLevel: number
    settings: IParserSettings
    result: Buffer
    lastOpCode?: number
    constructor(settings: IParserSettings) {
        this.currentBlockSize = 0;
        this.offset = 0;
        this.lastVariableAddress = 0;
        this.variableIndexes = {};
        this.variableTypes = {};
        this.functionLevel = 0;
        this.settings = settings;
        this.result = Buffer.alloc(settings.bufferSize as number);
    }

    addNumber(num: number, push = false) : void {
        if (num % 1 !== 0) {
            if (push) this.addOpCode(OP_CODES.PUSH_32);
            this.result.writeFloatBE(num, this.offset);
            this.offset += 4;
            this.currentBlockSize += 5;
            return;
        }
        if (num > -129 && num < 128) {
            if (push) this.addOpCode(OP_CODES.PUSH_8);
            this.result.writeUInt8(num, this.offset++);
            this.currentBlockSize += 2;
        } else if (num > -32_768 && num < 32_767) {
            if (push) this.addOpCode(OP_CODES.PUSH_16);
            this.result.writeUInt16BE(num, this.offset);
            this.offset += 2;
            this.currentBlockSize += 3;
        } else {
            if (push) this.addOpCode(OP_CODES.PUSH_32);
            this.result.writeFloatBE(num, this.offset);
            this.offset += 4;
            this.currentBlockSize += 5;
        }
    }

    addBoolOp(val: boolean) : void {
        this.result.writeUInt8(OP_CODES.PUSH_BOOL, this.offset++);
        this.result.writeUInt8(Number(val), this.offset++);
        this.currentBlockSize += 2;
    }

    addUndefinedOp() : void {
        this.result.writeUInt8(OP_CODES.PUSH_UNDEFINED, this.offset++);
        this.currentBlockSize++;
    }

    addString(str: string, push = false) : void {
        if (push) this.addOpCode(OP_CODES.PUSH_STR);
        const strLen = str.length;
        this.result.writeUInt16BE(strLen, this.offset);
        this.offset += 2;
        this.result.write(str, this.offset, "utf-8");
        this.offset += strLen;
        this.currentBlockSize += strLen + 2;
    }

    addOpCode(op: OP_CODES) : void {
        this.lastOpCode = op;
        this.result.writeUInt8(op, this.offset++);
        this.currentBlockSize++;
    }
    
    addArrayOp(arr: Array<any>) : void {
        for (const item of arr) {
            if (typeof item === "string") this.addString(item, true);
            else if (typeof item === "number") this.addNumber(item, true);
            else if (typeof item === "boolean") this.addBoolOp(item);
            else if (item === undefined || item === null) this.addUndefinedOp();
            else if (item instanceof Array) this.addArrayOp(item);
            else if (typeof item === "object") this.addObjectOp(item);
        }
        this.addOpCode(OP_CODES.PUSH_ARR);
        this.result.writeUInt16BE(arr.length, this.offset);
        this.offset += 2;
        this.currentBlockSize += 2;
    }

    addObjectOp(obj: Record<string, any>) : IParserTyping {
        const typing: IParserTyping = {type: IParserTypingType.OBJECT_AS_ARRAY, arrProps: []};
        const resArr = [];
        for (const prop in obj) {
            typing.arrProps!.push(prop);
            resArr.push(obj[prop]);
        }
        this.addArrayOp(resArr);
        return typing;
    }

    erase(bytes: number) : void {
        this.result.fill(0, this.offset - bytes, this.offset);
        this.offset -= bytes;
        this.currentBlockSize -= bytes;
    }

    resolveType(name: string|number) : IParserTyping|undefined {
        if (typeof name === "string") return this.variableTypes[this.variableIndexes[name]];
        return this.variableTypes[name];
    }

}

