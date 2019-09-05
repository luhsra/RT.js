import { Scheduler, SchedulerMessage, SchedulerConfig, DEFAULT_SCHEDULER_CONFIG } from "./Scheduler"
import { FixedPriorityScheduler } from "./FixedPriorityScheduler"
import { DeadlineScheduler } from "./DeadlineScheduler"
import { getCurrentTimestamp } from "./Scheduler"
import { Task, TaskConfig } from "./Task"
import { defaults } from "lodash"

/**
 * system configuration
 */
export interface RTJSConfig {
    /**
     * configuration for the scheduler
     */
    scheduler: SchedulerConfig,
    /**
     * enable verbose output
     */
    debug: boolean
}

export const DEFAULT_RTJS_CONFIG: Readonly<RTJSConfig> = Object.freeze({
    scheduler: DEFAULT_SCHEDULER_CONFIG,
    debug: false
})

/**
 * an RTJS object is the central object, containing essentially every other objects of note
 */
export class RTJS {
    /**
     * the scheduler object
     */
    scheduler: Scheduler
    /**
     * system configuration
     */
    config: RTJSConfig

    constructor(config: Object = DEFAULT_RTJS_CONFIG) {
        this.config = defaults({}, config, DEFAULT_RTJS_CONFIG)

        // this.scheduler = new FixedPriorityScheduler(this.config.scheduler)
        if (this.config.scheduler.policy === 'FP') {
            this.scheduler = new FixedPriorityScheduler(this.config.scheduler)
        } else if (this.config.scheduler.policy === 'EDF') {
            this.scheduler = new DeadlineScheduler(this.config.scheduler)
        } else {
            throw new Error("Unknown Scheduling Policy" + this.config.scheduler.policy)
        }
        this.scheduler.pause()
    }

    /**
     * add a task to the schedulers queues
     */
    addTask(task: Task) {
        task.rtjs = this
        this.scheduler.addTask(task)
    }

    /**
     * create a new task object from a function
     * @param fn the generator function / iterator to be turned into a task
     * @param args the parameters to call the function with
     * @param config configuration options for the Task-constructor
     */
    taskFromFn(fn: () => IterableIterator<SchedulerMessage | Promise<any>>, args: any[], config: TaskConfig) {
        let t = new Task(config)
        t.run = fn.bind(t, ...args)
        t.rtjs = this
        return t
    }

    /**
     * create new task from function and add it to the scheduler
     */
    addTaskFromFn(fn: () => IterableIterator<SchedulerMessage | Promise<any>>, args: any[], config: TaskConfig) {
        this.addTask(this.taskFromFn(fn, args, config))
    }

    /**
     * spawn a new task
     */
    spawnTask(task: Task) {
        task.rtjs = this
        this.scheduler.spawnTask(task)
    }

    /**
     * create a new task from function and spawn it
     */
    spawnTaskFromFn(fn: () => IterableIterator<SchedulerMessage | Promise<any>>, args: any[], config: TaskConfig) {
        this.scheduler.spawnTask(this.taskFromFn(fn, args, config))
    }

    /**
     * start / resume the scheduler
     */
    start() {
        this.scheduler.resume()
    }

    /**
     * pause the scheduler
     */
    pause() {
        this.scheduler.pause();
    }

    /**
     * Get the execution time of the currently running task
     */
    getExecutionTime() {
        if (this.scheduler.currentTask)
            return this.scheduler.currentTask.elapsedTime;
        return undefined;
    }

    /**
     * @return Get a a relative timestamp
     */
    getTime(): number {
        return getCurrentTimestamp()
    }


    /* see Scheduler.addAlarm() */
    addAlarm(fn: () => void, delay: number, periodic: boolean = false) {
        this.scheduler.addAlarm(fn, delay, periodic)
    }


    getResource(resource: Scheduler ) {
        if (resource == this.scheduler) {
            this.scheduler.NPCS = true
        } else {
            throw new Error("getResource is only implemented with rtjs.scheduler")
        }
    }

    releaseResource(resource: Scheduler ) {
        if (resource == this.scheduler) {
            this.scheduler.NPCS = false
        } else {
            throw new Error("getResource is only implemented with rtjs.scheduler")
        }
    }

}
