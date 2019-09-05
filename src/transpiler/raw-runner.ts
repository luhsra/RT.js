#!/usr/bin/env node

import { drop, last, filter } from "lodash"

async function main(useAsyncAwait: boolean, files: string[]) {
    let cwd = process.cwd()
    let tasks = files.map(file => [file, require(cwd + "/" + file).run])

    if (useAsyncAwait) {
        tasks.forEach(async ([file, run]: [string, Function]) => {
            let name = last(file.split("/"))!.replace(".js", "")
            console.time(name)
            console.log(name, await run())
            console.timeEnd(name)
            console.log(" ")
        })
    } else {
        tasks.forEach(([file, run]: [string, Function]) => {
            let name = last(file.split("/"))!.replace(".js", "")
            console.time(name)
            console.log(name, run())
            console.timeEnd(name)
        })
    }
}

let args: string[] = drop(process.argv, 2)
let asyncAwaitIndex = args.indexOf("--await")
let useAsyncAwait = asyncAwaitIndex !== -1
let files = filter(args, a => a !== "--await")

main(useAsyncAwait, files)
    .catch(e => console.log(e))

