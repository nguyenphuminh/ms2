
import { Enviourment } from "./Enviourment";
import { MSFunction } from "./structs/MSFunction";
import { PropertyAlias } from "../util/default_property_alias";

export const enum OP_CODES {
    PUSH_32,
    PUSH_16,
    PUSH_8,
    PUSH_BOOL,
    PUSH_UNDEFINED,
    PUSH_STR,
    PUSH_ARR,
    PUSH_VAR,
    PUSH_ARG,
    ADD,
    DIV,
    MUL,
    SUB,
    INC,
    INC_POP,
    DEC,
    DEC_POP,
    ACCESS,
    ACCESS_STR,
    ACCESS_ALIAS,
    LET,
    LET_POP,
    ASSIGN,
    ASSIGN_POP,
    FN_START,
    FN_START_INNER,
    FN_END,
    FN_END_INNER,
    JUMP_TRUE,
    JUMP_FALSE,
    JUMP,
    GOTO,
    RETURN,
    ELSE,
    CALL,
    CALL_POP,
    EXPORT,
    OR,
    AND,
    EQUAL,
    NOT,
    GREATER_THAN,
    LESS_THAN,
    GREATER_OR_EQUAL,
    LESS_OR_EQUAL,
    BREAKPOINT,
    END
}

export class Interpreter {
    stack: Array<any>
    exports: Record<string, any>
    global: Enviourment
    code?: Buffer
    returnValue: any
    private pausedAt: number
    onBreakpoint?: () => boolean; 
    constructor() {
        this.stack = [];
        this.exports = {};
        this.global = new Enviourment();
        this.pausedAt = 0;
    }

    clear() : this {
        this.global.entries = {};
        this.stack.length = 0;
        return this;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    /**
     * 
     * @param code - The buffer from the compiler
     * @param env - The current enviourment. Default is global
     * @param offset - Where to start interpreting the code
     * @param endByte - Where to stop interpreting the code
     * @param args - Args for the PUSH_ARG op code
     * @param endByteArg - An extra byte 
     */
    interpret(code: Buffer, env = this.global, offset = this.pausedAt, endByte = OP_CODES.END, args?: Array<any>, endByteArg?: number) : number {
        this.code = code;
        let address = offset;
        for(;;) {
            switch(code[address++]) {
            case OP_CODES.PUSH_32:
                this.stack.push(code.readFloatBE(address));
                address += 4;
                break;
            case OP_CODES.PUSH_16:
                this.stack.push(code.readInt16BE(address));
                address += 2;
                break;
            case OP_CODES.PUSH_8:
                this.stack.push(code.readInt8(address++));
                break;
            case OP_CODES.PUSH_BOOL:
                this.stack.push(Boolean(code.readInt8(address++)));
                break;
            case OP_CODES.PUSH_UNDEFINED:
                this.stack.push(undefined);
                break;
            case OP_CODES.PUSH_STR: {
                const size = code.readUInt16BE(address);
                this.stack.push(code.toString("utf-8", address += 2, address += size));
                break;
            }
            case OP_CODES.PUSH_ARR: {
                const size = code.readInt16BE(address);
                address += 2;
                const arr = [];
                for (let i=0; i < size; i++) {
                    arr.push(this.stack.pop());
                }
                arr.reverse();
                this.stack.push(arr);
                break;
            }
            case OP_CODES.PUSH_VAR: 
                this.stack.push(env.get(code.readUInt16BE(address)));
                address += 2;
                break;
            case OP_CODES.PUSH_ARG:
                this.stack.push(args?.[code.readUInt8(address++)]);
                break;
            case OP_CODES.ADD: {
                const first = this.stack.pop();
                const second = this.stack.pop();
                this.stack.push(second + first);
                break;
            }
            case OP_CODES.SUB: {
                const first = this.stack.pop();
                const second = this.stack.pop();
                this.stack.push(second - first);
                break;
            }
            case OP_CODES.DIV: {
                const first = this.stack.pop();
                const second = this.stack.pop();
                this.stack.push(second / first);
                break;
            }
            case OP_CODES.MUL:
                this.stack.push(this.stack.pop() * this.stack.pop());
                break;
            case OP_CODES.INC:
                this.stack.push(env.inc(code.readUInt16BE(address)));
                address += 2;
                break;
            case OP_CODES.DEC:
                this.stack.push(env.dec(code.readUInt16BE(address)));
                address += 2;
                break;
            case OP_CODES.INC_POP:
                env.inc(code.readUInt16BE(address));
                address += 2;
                break;
            case OP_CODES.DEC_POP:
                env.dec(code.readUInt16BE(address));
                address += 2;
                break;
            case OP_CODES.EQUAL: 
                this.stack.push(this.stack.pop() === this.stack.pop());
                break;
            case OP_CODES.LESS_THAN: {
                const first = this.stack.pop();
                const second = this.stack.pop();
                this.stack.push(second < first);
                break;
            }
            case OP_CODES.LESS_OR_EQUAL: {
                const first = this.stack.pop();
                const second = this.stack.pop();
                this.stack.push(second <= first);
                break;
            }
            case OP_CODES.GREATER_THAN: {
                const first = this.stack.pop();
                const second = this.stack.pop();
                this.stack.push(second > first);
                break;
            }
            case OP_CODES.GREATER_OR_EQUAL: {
                const first = this.stack.pop();
                const second = this.stack.pop();
                this.stack.push(second >= first);
                break;
            }
            case OP_CODES.AND: {
                const first = this.stack.pop();
                const second = this.stack.pop();
                this.stack.push(second && first);
                break;
            }
            case OP_CODES.OR: {
                const first = this.stack.pop();
                const second = this.stack.pop();
                this.stack.push(second || first);
                break;
            }
            case OP_CODES.NOT:
                this.stack.push(!this.stack.pop());
                break;
            case OP_CODES.ACCESS: {
                const item = this.stack.pop();
                this.stack.push(item[code.readUInt16BE(address)]);
                address += 2;
                break;
            }
            case OP_CODES.ACCESS_STR: {
                const item = this.stack.pop();
                const size = code.readUInt16BE(address);
                let res = item[code.toString("utf-8", address += 2, address += size)];
                if (typeof res === "function") res = res.bind(item);
                this.stack.push(res);
                break;
            }
            case OP_CODES.ACCESS_ALIAS: {
                const item = this.stack.pop();
                let res = item[PropertyAlias[code.readUInt8(address++) as 0]];
                if (typeof res === "function") res = res.bind(item);
                this.stack.push(res);
                break;
            }
            case OP_CODES.LET: 
                env.define(code.readUInt16BE(address), this.stack[this.stack.length - 1]);
                address += 2;
                break;
            case OP_CODES.LET_POP:
                env.define(code.readUInt16BE(address), this.stack.pop());
                address += 2;
                break;
            case OP_CODES.ASSIGN:
                env.set(code.readUInt16BE(address), this.stack[this.stack.length - 1]);
                address += 2;
                break;
            case OP_CODES.ASSIGN_POP:
                env.set(code.readUInt16BE(address), this.stack.pop());
                address += 2;
                break;
            case OP_CODES.FN_START: {
                const size = code.readUInt16BE(address);
                address += 2;
                this.stack.push(new MSFunction(address, this));
                address += size + 1; // Account for the FN_END code
                break;
            }
            case OP_CODES.FN_START_INNER: {
                const size = code.readUInt16BE(address);
                const id = code.readUInt8(address += 2);
                this.stack.push(new MSFunction(++address, this, id));
                address += size + 2; // Account for the FN_END_INNER
                break;
            }
            case OP_CODES.RETURN:
                this.returnValue = this.stack.pop();
                break;
            case OP_CODES.CALL: {
                const argCount = code.readUInt8(address++) + 1; // Account for the function object itself
                const args = [];
                for (let i=0; i < argCount; i++) args[i] = this.stack.pop();
                this.stack.push(this.returnValue = args.pop().call(undefined, ...args));
                break;
            }
            case OP_CODES.CALL_POP: {
                const argCount = code.readUInt8(address++) + 1; // Account for the function object itself
                const args = [];
                for (let i=0; i < argCount; i++) args[i] = this.stack.pop();
                this.returnValue = args.pop().call(undefined, ...args);
                break;
            }
            case OP_CODES.JUMP_FALSE:
                if (!this.stack.pop()) address += code.readUInt16BE(address);
                address += 2;
                break;
            case OP_CODES.JUMP_TRUE:
                if (this.stack.pop()) address += code.readUInt16BE(address);
                address += 2;
                break;
            case OP_CODES.JUMP:
                address += code.readUInt16BE(address) + 2;
                break;
            case OP_CODES.GOTO:
                address = code.readUInt16BE(address);
                break;
            case OP_CODES.EXPORT: {
                const item = this.stack.pop();
                const size = code.readUInt16BE(address);
                this.exports[code.toString("utf-8", address += 2, address += size)] = item;
                break;
            }
            case OP_CODES.BREAKPOINT: 
                this.pausedAt = address;
                if (this.onBreakpoint && this.onBreakpoint()) return this.interpret(code, env, this.pausedAt, endByte);
                return address;
            case endByte:
                if (endByteArg) {
                    if (code.readUInt8(address) === endByteArg) return address + 1;
                    break;
                }
                return address;
            default:
                throw `Unknown OP code at byte ${address}`;
            }
        }
    }

}