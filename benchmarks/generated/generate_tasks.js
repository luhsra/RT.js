const fs = require("fs")
const util = require("util")
const _ = require("lodash")
const crypto = require("crypto")
const { Rand } = require("./rand")

let unlink = util.promisify(fs.unlink)
let mkdir = util.promisify(fs.mkdir)
let read = util.promisify(fs.readFile)
let write = util.promisify(fs.writeFile)

let rng

function RAND_INT(fragment) {
    let content = fragment
    let pattern = /__RAND_INT\((\d+),\s*(\d+)\)__/

    let matches = pattern.exec(content)

    while (matches) {
        let min = Number(matches[1])
        let max = Number(matches[2])

        content = content.replace(pattern, rng.nextInRange(min, max))
        matches = pattern.exec(content)
    }

    return content
}

let lastRandId = undefined
function RAND_ID(fragment) {
    let content = fragment
    let pattern = /__RAND_ID\((true|false)?\)__/

    let matches = pattern.exec(content)

    while (matches) {
        let reuseLast = Boolean(matches[1])
        if (!reuseLast || !lastRandId) {
            lastRandId = "_" + crypto.randomBytes(4).toString("hex")
        }
        content = content.replace(pattern, lastRandId)
        matches = pattern.exec(content)
    }

    return content
}

function VAR(fragment, vars) {
    if (!vars) { return fragment }

    let content = fragment
    let pattern = /__VAR\((.*?)\)__/

    let matches = pattern.exec(content)

    while (matches) {
        let name = matches[1]

        content = content.replace(pattern, vars[name])
        matches = pattern.exec(content)
    }

    return content
}


async function readFragment(name, vars) {
    let content = await read(`./fragments/${name}.fragment.js`, "utf8")
    content = RAND_INT(content)
    content = RAND_ID(content)
    content = VAR(content, vars)
    return content
}


const OUTPUT_FOLDER = "_generated"

async function generateSchedcatTasks(schedcatDefs) {
    rng = new Rand(0)
    try { await mkdir(OUTPUT_FOLDER) } catch (e) { }
    await Promise.all(fs.readdirSync(OUTPUT_FOLDER).map((f) => unlink(`${OUTPUT_FOLDER}/${f}`)))

    benchmarks = {}

    for (let i = 0; i < schedcatDefs.length; i++) {
        let header = await readFragment("header")
        let footer = await readFragment("footer")
        let task = await readFragment("schedcat", {
            SCHEDCAT: JSON.stringify(schedcatDefs[i])
        })

        let content = header + task + footer
        await write(`${OUTPUT_FOLDER}/schedcat_set_${i}.js`, content)
        benchmarks[`schedcat_set_${i}.js`] = schedcatDefs[i]
    }
    return benchmarks
}

module.exports = {
    generateSchedcatTasks: async (schedcatDefs) => {
        let ret = await generateSchedcatTasks(schedcatDefs)

        if (!process.env.JSON_OUTPUT) {
            console.log(`Generated ${schedcatDefs.length} task sets in '${OUTPUT_FOLDER}'.`)
        }
        return ret
    },
    OUTPUT_FOLDER
}
