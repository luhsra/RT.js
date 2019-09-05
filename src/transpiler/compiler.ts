import * as ts from "typescript"
import { parse } from "./parser"
import { transform, TransformConfig, DEFAULT_TRANSFORM_CONFIG } from "./transforms"
import * as fs from "fs"
import { promisify } from "util"
import { map, find } from "lodash"

export interface CompilerConfig {
    transformConfig: TransformConfig
}

export const DEFAULT_COMPILER_CONFIG: Readonly<CompilerConfig> = Object.freeze({
    transformConfig: DEFAULT_TRANSFORM_CONFIG
})


let writeFile = promisify(fs.writeFile)

async function writeFileCallback(fileName: string, data: string, writeByteOrderMark: boolean, onError: ((message: string) => void) | undefined, sourceFiles?: ReadonlyArray<ts.SourceFile>) {
    try {
        await writeFile(fileName, data)
    } catch (e) {
        console.error(e)
    }
}

function snapFor(path: string, files: ReadonlyArray<ts.SourceFile>): ts.IScriptSnapshot | undefined {
    if (path === "lib.d.ts") {
        return ts.ScriptSnapshot.fromString("");
    }
    const result = find(files, f => f.fileName === path);
    return result && ts.ScriptSnapshot.fromString(result.text);
}

function programFiles(program: ts.Program): string[] {
    return map(program.getSourceFiles(), f => {
        if (f.fileName.startsWith("/")) {
            return f.fileName
        }
        return process.cwd() + "/" + f.fileName
    })
}

export async function compile(config: CompilerConfig = DEFAULT_COMPILER_CONFIG, sourceFiles: string[], compilerOptions?: ts.CompilerOptions, writeCallback = writeFileCallback): Promise<ts.Diagnostic[]> {
    let program = parse(sourceFiles, compilerOptions)
    let emitResult = program.emit(undefined, writeFileCallback, undefined, undefined, {
        before: [
            transform(config.transformConfig)
        ]
    })

    return ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics)
}
