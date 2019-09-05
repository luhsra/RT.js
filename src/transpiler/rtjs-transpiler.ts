#!/usr/bin/env node

import { compile } from "./compiler"
import * as globCB from "glob"
import * as ts from "typescript"
import { drop } from "lodash"
import { promisify } from "util"

let glob = promisify(globCB)

async function main(pattern: string) {
    let files = await glob(pattern)
    let diagnostics = await compile(undefined, files)

    diagnostics.forEach(diagnostic => {
        if (!diagnostic.file) {
            console.log(diagnostic)
            return
        }
        let { line, character } = diagnostic.file!.getLineAndCharacterOfPosition(diagnostic.start!)
        let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
        console.log(`${diagnostic.file!.fileName} (${line + 1},${character + 1}): ${message}`)
    })
}

main(drop(process.argv, 2).join("|"))
    .catch(e => console.log(e))
