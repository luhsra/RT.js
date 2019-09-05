#!/usr/bin/env node

import { drop, last, without } from "lodash"
import { RTJS, Task } from "../index"

async function main(keepReadding: boolean, files: string[]) {
    let cwd = process.cwd()
    let constructors = files.map(file => [file, require(cwd + "/" + file).default])
    let tasks = constructors.filter(([f, _]) => f.endsWith(".task.js"))
    let interrupts = constructors.filter(([f, _]) => f.endsWith(".interrupt.js"))
    let rtjs = new RTJS({
        scheduler: {
            debug: true,
            numOfTicksBeforeReschedule: 1000000
        },
        debug: true
    })

    tasks.forEach(([file, T]: [string, typeof Task]) => {
        let name = last(file.split("/"))!.replace(".task.js", "")
        rtjs.addTask(new T({ name }))
    })

    if (keepReadding) {
        setInterval(() => {
            tasks.forEach(([file, T]: [string, typeof Task]) => {
                let name = last(file.split("/"))!.replace(".task.js", "")
                if (Math.random() > 0.3) {
                    rtjs.addTask(new T({ name }))
                }
            })
        }, 5000)
    }

    rtjs.start()
}

let args: string[] = drop(process.argv, 2)
let patterns = without(args, "--keepReadding")
let keepReadding = args.length !== patterns.length

main(keepReadding, patterns)
    .catch(e => console.log(e))

