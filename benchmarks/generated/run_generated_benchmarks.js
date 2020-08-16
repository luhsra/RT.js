const { generateSchedcatTasks, OUTPUT_FOLDER } = require("./generate_tasks")
const { Rand } = require("./rand")
const { compile, DEFAULT_COMPILER_CONFIG }  = require("../../build/transpiler/compiler")
const fs = require("fs")
const util = require("util")
const ts = require("typescript")
const child = require("child_process")
const { basename } = require("path")
const _ = require("lodash")
const os = require("os")
require('console.table')


const MUTE = process.env.JSON_OUTPUT && JSON.parse(process.env.JSON_OUTPUT)
function print(format, ...args) {
    if (!MUTE) {
        console.log(format, ...args)
    }
}

let mkdir = util.promisify(fs.mkdir)
let unlink = util.promisify(fs.unlink)
let read = util.promisify(fs.readFile)
let write = util.promisify(fs.writeFile)
let spawn = child.spawn


let envCompConfig = {}
try {
    envCompConfig = JSON.parse(process.env.COMPILER_CONFIG)
} catch (error) { }

const COMPILER_CONFIG = _.defaults(
    {}, envCompConfig, DEFAULT_COMPILER_CONFIG)
const BUILD_FOLDER = "_generated_build"

let taskSetups

async function compileTasks() {
    print("Compiling tasks...")

    try { await mkdir(BUILD_FOLDER) } catch (e) { }

    let keepTasks = process.env.KEEP_TASKS && JSON.parse(process.env.KEEP_TASKS)
    if (!keepTasks) {
        await Promise.all(fs.readdirSync(BUILD_FOLDER).map((f) => unlink(`${BUILD_FOLDER}/${f}`)))
    }

    let namePrefix = process.env.TASK_PREFIX || ""
    let files = fs.readdirSync(OUTPUT_FOLDER).map(f => `${OUTPUT_FOLDER}/${f}`).filter(f => basename(f).startsWith(namePrefix))
    let diagnostics = await compile(COMPILER_CONFIG, files, {
        outDir: BUILD_FOLDER,
        noResolve: true,
        files: files
    })

    diagnostics.forEach(diagnostic => {
        if (!diagnostic.file) {
            console.error(diagnostic)
            return
        }
        let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
        let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
        console.error(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`)
    })

    print("Compiled tasks")
}

async function runTasks(files, rtjs, policy) {
    let simulateInteraction = process.env.SIMULATE_INTERACTION && JSON.parse(process.env.SIMULATE_INTERACTION)
    let maxRunTime = Number(process.env.MAX_RUN_TIME) || 10 * 1000
    let namePrefix = process.env.TASK_PREFIX || ""

    let results = []

    for (let i = 0 ; i < files.length; i++) {
    //for (let i = 0; i < 1; i++) { // For debugging
        let file = files[i]

        if (!basename(file).startsWith(namePrefix)) { continue }

        await new Promise((resolve, reject) => {
            let stdout = []
            let stderr = []

            print("\tSpawning task %s", file)

            let TRACE_FILE = file + "." + policy + ".trace.json"
            console.log(TRACE_FILE)

            let proc = spawn("node", [file], {
                env: {
                    PATH: process.env.PATH,
                    IS_OSEK: rtjs,
                    MAX_RUN_TIME: maxRunTime,
                    SCHEDULE_POLICY: policy,
                    TRACE_FILE: TRACE_FILE,
                }
            })

            proc.stdout.on("data", (d) => {
                stdout.push(d)
            })

            proc.stderr.on("data", (d) => {
                process.stderr.write(d.toString())
                stderr.push(d)
            })


            proc.on("error", (error) => {
                print(error)
                resolve()
            })

            proc.on("exit", (code) => {

                print("\tExited task %s with code %i", file, code)

                stderr = Buffer.concat(stderr).toString()
                stdout = Buffer.concat(stdout).toString()

                if (code !== 0) {
                    reject(new Error(`Exit code is ${code}.\n${stderr}`))
                    return
                }

                let output = {}
                try {
                    let rawdata = fs.readFileSync(TRACE_FILE);
                    output = JSON.parse(rawdata);
                } catch (e) {
                    console.error(stdout)
                    console.error("Failed to parse JSON: " + e)
                    process.exit(-1)
                }

                summary = summarizeResults(policy, file, output)
                console.table([summary])
                output = null // delete json data
                results.push(summary)
                resolve()
            })
        })
    }

    return results
}


async function runCompiledTasks(taskSet, policy) {
    print("--- Running comiled tasks ---")

    // _generated_build
    let files = taskSet.map(f => `${BUILD_FOLDER}/${f}`)

    return runTasks(files, true, policy)
}


async function runRawTasks(taskSet) {
    print("--- Running raw tasks ---");

    // _generated
    let files = taskSet.map(f => `${OUTPUT_FOLDER}/${f}`)

    await Promise.all(files.map(async (file) => {
        let c = await read(file, "utf8")
        return write(file, c.replace(/@rtjs/gi, ""))
    }))
    return runTasks(files, false, 'raw')
}

function summarizeResults(variant, file, output) {
    // Global: taskSetups
    let fn = basename(file)

    let missedDeadline = 0
    let taskTime = 0
    output.jobs.forEach(j => {
        if (j.endTime > j.absoluteDeadline) {
            missedDeadline += 1
        }
        // Add up the elapsed time
        taskTime += j.elapsedTime
    })

    let utilization = taskSetups[fn].map(t => t.utilization)

    return {
        file: fn,
        variant: variant,
        jobs: output.jobs.length,
        utilization: utilization.reduce((a,b) => a+b, 0),
        totalTime: output.totalTime,
        missedDeadline: missedDeadline,
        taskTime: taskTime,
        schedulerTime: output.schedulerTime,
    }
}

async function setupSchedcatBenchmarks(path) {
    let schedcatDefs = JSON.parse(await read(path, "utf8")).map(t => t.tasks)
    return await generateSchedcatTasks(schedcatDefs)
}

async function main() {
    try {
        os.setPriority(os.constants.priority.PRIORITY_HIGHEST)
    } catch (e) {
        print("Couln't set set priorty")
    }

    let schedcatJSONPath = process.argv[2]
    if (!schedcatJSONPath) {
        throw new Error("Only Generate SCHEDCAT Benchmarks")
    }
    // Read Task Setups to global
    taskSetups = await setupSchedcatBenchmarks(schedcatJSONPath)
    let taskSets = Object.keys(taskSetups)

    await compileTasks()

    // Run the benchmarks
    let summary = []
    let rawResults = await runRawTasks(taskSets)
    summary = summary.concat(rawResults)

    let fpResults = await runCompiledTasks(taskSets, 'FP')
    summary = summary.concat(fpResults)

    let edfResults = await runCompiledTasks(taskSets, 'EDF')
    summary = summary.concat(edfResults)

    /// Produce some output
    summary = _.sortBy(summary, c => [c.file, c.variant])

    let output = JSON.stringify({
        summary: summary,
        taskSetups: taskSetups,
    }, undefined, 4)
    fs.writeFileSync("benchmark_output.json", output)

    console.table(summary)

    let fields = Object.keys(summary[0])
    CSV = fields.join(",") + "\n"
    for (let idx in summary) {
        let result = summary[idx]
        let line = _.map(fields, (field) => result[field])
        CSV += line.join(",") + "\n"
    }
    fs.writeFileSync("benchmark_output.csv", CSV)
}

main()
    .catch(e => console.error(e))
