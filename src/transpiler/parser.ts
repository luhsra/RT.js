import * as ts from "typescript"
import { flatMap, defaults } from "lodash"

export const TSCONFIG = {
    allowJs: true,
    allowUnreachableCode: true,
    allowUnusedLabels: true,
    checkJs: false,
    extendedDiagnostics: false,
    experimentalDecorators: true,
    jsx: ts.JsxEmit.React,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    noEmitOnError: false,
    noUnusedLocals: true,
    noUnusedParameters: true,
    stripInternal: true,
    target: ts.ScriptTarget.ES2016,
    outDir: "build",
    skipLibCheck: true,
    traceResolution: false
}

export function parse(sourceFiles: string[], config: ts.CompilerOptions = TSCONFIG): ts.Program {
    let c = defaults({}, config, TSCONFIG)
    let compilerHost = ts.createCompilerHost(c)
    return ts.createProgram(sourceFiles, c, compilerHost)
}
