
import {defaultParserSettings} from "./Compiler";
import {CompilerContext} from "./Compiler/CompilerContext";
import {Interpreter, OP_CODES} from "./Interpreter";

const Eval = new Interpreter();

const ctx = new CompilerContext(defaultParserSettings);
ctx.addArrayOp([1, 2, 3, 4, 5, {a: 1, b: 2, c: 3}, "hello"]);
ctx.addOpCode(OP_CODES.END);
Eval.interpret(ctx.result);
console.log(Eval.stack, ctx.currentBlockSize);
//compile("let a = 5;", defaultParserSettings);
