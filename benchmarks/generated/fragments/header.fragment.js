const { Task, RTJS } = require("../../../build/index")
const { performance } = require('perf_hooks')
const fs = require("fs")


try {
    const os = require("os")
    os.setPriority(os.constants.priority.PRIORITY_HIGHEST)
} catch (e) {}

/**
 * An Fake OSEK variant that runs every task immediately.
 */
class FakeOSEK {
    constructor() {
        this.scheduler = {
            numberOfTasks: 0,
            schedulerTime: 0 // active time of scheduler
        }

        this.promises = [] // Will always be empty

    }

    // Runs the function immediately
    _addAndRunTask(task) {
        this.currentTask = task
        this.scheduler.numberOfTasks++
        task.rtjs = this

        task.enqueuedTime = this.getTime()
        let ret = task.run()
        task.retval = ret
        task.endTime = this.getTime()
        task.elapsedTime = task.endTime - task.enqueuedTime

        // Account for the this time in the global scheduler
        this.scheduler.schedulerTime += task.elapsedTime

        task.onTerminated()

        return ret
    }

    addTask(task) {
        return this._addAndRunTask(task)

    }

    addTaskFromFn(fn) {
        return this._addAndRunTask(this.taskFromFn(fn, name || fn.name, priority || 0))
    }

    taskFromFn(fn, args, { name, priority, deadline }) {
        return {
            run: fn.bind(this, args),
            name,
            priority,
            deadline
        }
    }

    spawnTask(task) {
        return this._addAndRunTask(task)
    }

    spawnTaskFromFn(fn, args, config) {
        return this._addAndRunTask(this.taskFromFn(fn, args, config))
    }

    start() { /* This is intentionally left blank */    }


    /**
     * returns the current relative time, since the start of the webpage / script, in ms
     * @returns the current relative time in ms
     */
    getTime() {
        return Number(typeof window === 'undefined' ? performance.now() : window.performance.now())
    }

    // Return the execution time of the current task in Miliseconds
    getExecutionTime() {
        let task = this.currentTask
        return Number((this.getTime() - task.enqueuedTime))
    }

    // Return the execution time of the current task in Miliseconds
    getAbsoluteDeadline() {
        let task = this.currentTask
        return Number(task.creationTime + task.deadline)
    }

    addAlarm(fn, delay) {
        setTimeout(fn, delay)
    }
}

async function main() {
    let results = []

    const PATTERN = /_(.+)$/
    function cleanupName(name) {
        return name.replace(PATTERN, "")
    }


    function addResult(task) {
        let name = cleanupName(task.name)
        results.push({
            name,
            originalName: task.name,
            wcet: task.wcet_budget,
            deadline: task.deadline,
            priority: task.priority,
            enqueuedTime: task.enqueuedTime,
            endTime: task.endTime,
            creationTime: task.creationTime,
            elapsedTime: task.elapsedTime,
            absoluteDeadline: task.getAbsoluteDeadline(),
            cancelled: task.cancelled
        })
    }

    let osekConfig = {
        debug: false,
        scheduler: {
            policy: 'FP',
            debug: false,
        }
    }

    const IS_OSEK = JSON.parse(process.env.IS_OSEK)
    if (process.env.SCHEDULE_POLICY) {
        osekConfig.scheduler.policy = process.env.SCHEDULE_POLICY
    }

    let rtjs
    if (IS_OSEK) {
        rtjs = new RTJS(osekConfig)
    } else {
        rtjs = new FakeOSEK()
    }

    let maxRunTime = Number(process.env.MAX_RUN_TIME) || 0
    if (maxRunTime <= 0) {
        throw new Error("MAX_RUN_TIME must be >0")
    }

    let __awaiting = []
    let __start = rtjs.getTime()
