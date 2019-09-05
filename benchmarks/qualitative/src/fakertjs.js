/**
 * @file fakertjs.js
 * This implements a fake version of the rtjs scheduler. It mimics the API
 * but runs every job to completion, when it is added. This means that 
 * portions of the javascript program may be starved with that. 
 */
/**
 * An Fake rtjs variant that runs every task immediately.
 */
class Fakertjs {
    /**
     * create a fake scheduler object
     */
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
        let ret = task.run_uninterrupted()
        task.endTime = this.getTime()
        task.elapsedTime = task.endTime - task.enqueuedTime

        // Account for the this time in the global scheduler
        this.scheduler.schedulerTime += task.elapsedTime

        task.onTerminated()

        return ret
    }
    /**
     * add and run a task
     */
    addTask(task) {
        return this._addAndRunTask(task)

    }
    /**
     * create the task from function and run it to completion
     */
    addTaskFromFn(fn) {
        return this._addAndRunTask(this.taskFromFn(fn, name || fn.name, priority || 0))
    }
    /**
     * create task from function
     */
    taskFromFn(fn, args, { name, priority, deadline }) {
        return {
            run: fn.bind(this, args),
            name,
            priority,
            deadline
        }
    }
    /**
     * run task to completion
     */
    spawnTask(task) {
        return this._addAndRunTask(task)
    }
    /**
     * run task to completion
     */
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

    
export {Fakertjs}
