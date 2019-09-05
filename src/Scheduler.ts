import { Task, TaskStatus, Timestamp } from "./Task"
import { pullAt, findIndex, defaults } from "lodash"
import { performance } from 'perf_hooks'
const PriorityQueue = require("fastpriorityqueue")


/**
 * returns the current relative time, since the start of the webpage / script, in ms
 * @returns the current relative time in ms
 */
export function getCurrentTimestamp(): number {
    return Number(typeof window === 'undefined' ? performance.now() : window.performance.now())
}

export interface SchedulerConfig {
    numOfTicksBeforeReschedule: number, // Number of preemption points before task yields
    meanTimeToReschedule: number, // Miliseconds before rescheduling is done
    meanTimeToYield: number,  // Miliseconds before we return to the main loop
    debug: boolean,
    policy: string, // Fixed Priority (FP) || Earliest Deadline First (EDF)
    onRequestAnimationFrame: boolean
}

export const DEFAULT_SCHEDULER_CONFIG: Readonly<SchedulerConfig> = Object.freeze({
    numOfTicksBeforeReschedule: 300,
    meanTimeToReschedule: 1,
    meanTimeToYield: 5,
    debug: false,
    policy: 'FP',

    // If there are no animation frames, it does not make sense to
    // request them. This normally means that we do not run in a browser.
    onRequestAnimationFrame: !(typeof requestAnimationFrame === 'undefined')
})

export enum SchedulerMessage {
    TerminateTask,
    Continue
}

export class TaskState {
    /**
     * the enveloped task structure
     */
    task: Task
    lastMessage: SchedulerMessage | Promise<any> | undefined
    /**
     * the generator function of the task
     */
    iterator: IterableIterator<SchedulerMessage | Promise<any>>
    lastAsyncRespose: any | undefined

    /**
     * the time at which the task was enqueued, for accouting
     */
    enqueuedTime: Timestamp

    /**
     * the time the task has run, for accounting
     */
    elapsedTime: number = 0

    /**
     * the number of ticks that this task was executed
     */
    elapsedTicks: number = 0

    /**
     * return value of the task after it has finished
     */
    retval: any = null

    /**
     * whether or not the task has finished running
     */
    completed = false
    parent?: TaskState

    /**
     * The absolute deadline of this task instance
     */
    absoluteDeadline: Timestamp

    get status(): TaskStatus {
        return this.task.status
    }

    set status(s: TaskStatus) {
        this.task.status = s
    }

    get priority(): number {
        return this.task.priority
    }

    get isRunnable(): boolean {
        return this.task.status === TaskStatus.Runnable
    }

    get isWaiting(): boolean {
        return this.task.status == TaskStatus.Waiting
    }

    /**
     * call the generator function of the task again
     */
    next(input: any = undefined): SchedulerMessage | Promise<any> {
        if (this.completed) {
            return SchedulerMessage.TerminateTask
        }

        let n = this.iterator.next(input || this.lastAsyncRespose)
        if ( n.done == true ) {
            this.completed = true;
        } else {
            this.completed = false;
        }
        
        this.lastMessage = n.value
        this.lastAsyncRespose = undefined
        return this.lastMessage!
    }

    /**
     * set up the structure
     * @param task the task to envelop
     * @param parent the parent structure
     */
    constructor(task: Task, parent?: TaskState) {
        this.task = task
        this.iterator = task.run()
        this.enqueuedTime = getCurrentTimestamp()
        this.parent = parent
        if (parent) {
            this.absoluteDeadline = parent.absoluteDeadline
        } else {
            this.absoluteDeadline = task.creationTime + task.deadline
        }
    }

    /**
     * update the times of the task and call onTermined()
     */
    terminate() {
        this.task.retval = this.retval
        this.task.enqueuedTime = this.enqueuedTime
        this.task.elapsedTime = this.elapsedTime
        this.task.endTime = getCurrentTimestamp()
        this.task.onTerminated()

    }

    /**
     * convert task to a human readable string
     */
    toString() {
        return `${this.task.name} (priority: ${this.task.priority}, deadline: ${this.absoluteDeadline}): ${this.task.status} (${this.elapsedTime}ms)`
    }
}

export class TimeoutState {
    /**
     * Holds information an alarm state
     */
    timeout: number
    callback: () => void // Called from scheduler loop

    js_timeout: any
    js_callback: () => void  // called via Javascript event loop
}


/**
 * abstract scheduler class, interface for concrete deadline and fixed priority schedulers
 */
export abstract class Scheduler {
    /**
     * the currently running task
     */
    currentTask?: TaskState
    /**
     * number of pauses of the scheduler, may be used nestedly
     */
    private pauses: boolean = true
    get paused(): boolean { return this.pauses }
    /**
     * mostly constant configuration options for the scheduler
     */
    config: SchedulerConfig

    /**
     * How long was the scheduler active on the executor
     */
    schedulerTime: number = 0

    /**
     * Number of preemption points that are visited before thread must actually call yield
     */
    RTJS_BUDGET: number

    /**
     * This flag forces the scheduler to reschedule immediately,
     * before finishing the current timeslice.
     */
    protected forceReschedule: boolean
    printTimes: boolean

    /**
     * Timeout queue to manage more precise timeouts
     */
    private timeoutQueue: PriorityQueue<TimeoutState> = new PriorityQueue((a: TimeoutState, b: TimeoutState) => {
        return b.timeout > a.timeout
    })

    /**
     * Flag indicates a non-preemptive critical section
     */
    NPCS: boolean

    /**
     * constructor, setting up a scheduler object
     * @param config set to DEFAULT_SCHEDULER_CONFIG, may use any other values
     */
    constructor(config: Object = DEFAULT_SCHEDULER_CONFIG) {
        this.config = defaults({}, config, DEFAULT_SCHEDULER_CONFIG)
    }

    /**
     * print messages to stdout if the ''debug'' flag was set
     */
    protected debug(msg: any, ...optionalParams: any[]) {
        if (this.config.debug) {
            console.error(msg, ...optionalParams)
        }
    }

    /**
     * pauses the scheduler, may be used nestedly
     */
    pause() {
        this.pauses = true
        this.debug("> Pausing Scheduler (pauses %i)", this.pauses)
    }

    /**
     * resumes the scheduler after pausing, may be used nestedly
     */
    resume() {
        if (this.pauses) {
            this.pauses = false
            this.debug("> Resuming Scheduler (pauses %i)", this.pauses)
            this.repostMe();
        }
    }

    /**
     * re-introduces the scheduler itself to the event loop
     */
    repostMe() {
        //if ( this.config.onRequestAnimationFrame ) {
        //    requestAnimationFrame ( this.executeRound.bind( this ) )
        //} else {
        if (!this.pauses) {
            setImmediate(this.executeRound.bind(this))
        }
        //}
    }

    /**
     * Add a single-short or periodic alarm function.
     * @param fn - The function to be callled after the delay has passed
     * @param delay - The deay in miliseconds
     * @param periodic - Whether the alarm is enqueued again
     *
     */
    addAlarm(fn: () => void, delay: number, periodic: boolean = false) {
        let scheduler = this
        let ts = new TimeoutState()
        ts.timeout = 0

        function startTimeout() {
            // If we were triggered too late for the next activation,
            // we use the current time as the next starting point
            let now = getCurrentTimestamp()
            if (now > (ts.timeout + delay)) {
                ts.timeout = now
            }
            ts.timeout += delay // trigger at the exact next timeout time

            scheduler.timeoutQueue.add(ts)
            ts.js_timeout = setTimeout(ts.js_callback, ts.timeout - now)
        }

        // Setup the Javascript Timeout
        ts.js_callback = () => {
            scheduler.timeoutQueue.removeOne(t => t == ts)
            if (periodic) { startTimeout() }
            fn()
        }

        // Setup the bAUTOSAR timeout. This is called from the scheduler
        ts.callback = () => {
            clearTimeout(ts.js_timeout)
            if (periodic) { startTimeout() }
            fn()
        }

        // Start the timeout for the first time
        startTimeout()

        return ts
    }

    /**
     * add a task to the queue of the scheduler, sends a scheduler-message to event queue after it is finished, if no task is running atm
     * @param task the task object to enqueue
     * @param parent optional parameter, scheduler-structure for the parent task if any
     */
    addTask(task: Task, parent?: TaskState) {
        this.debug("> Adding Task %s with priority %i and deadline %i", task.name, task.priority, task.deadline)
        task.scheduler = this

        this.enqueueTask(new TaskState(task, parent))
        this.resume()
        /*if (this.currentTask === undefined && !this.paused) {
           this.repostMe()
        }*/
    }

    /**
     * Used by tasks to spawn new tasks, sets the currently running one as the parent
     * @param task the child task
     */
    spawnTask(task: Task) {
        if (this.currentTask) {
            this.currentTask.status = TaskStatus.Waiting
            task.parent = this.currentTask.task
        }

        this.addTask(task, this.currentTask)
    }

    /**
     * enqueue a task into the queue of the scheduler (implementation dependent)
     */
    abstract enqueueTask(task: TaskState): void

    /**
     * @returns the number of elements in the task queue
     */
    abstract get numberOfTasks(): number

    /**
     * @returns the next task to schedule
     */
    protected abstract getNextTask(): TaskState | undefined

    /**
     * empties the task queue
     */
    abstract emptyTaskQueue(): void

    /**
     * determines whether a reschedule needs to take place
     */
    protected abstract needsReschedule(): boolean

    /**
     * swaps the currently running task with a new one, uses needsReschedule()
     */
    protected prepareNextTask() {
        if (this.paused) { return }
        if (this.NPCS && this.currentTask) { return } // Obey the non-preemptive critical section
        // if the currently running task is not runnable or not completed it is re-enqueued for the scheduler to consider
        if (this.currentTask && (!this.currentTask.isRunnable || !this.currentTask.completed)) {
            this.debug("> Reenqueuing Task %s", this.currentTask.toString())
            this.enqueueTask(this.currentTask)
        }

        // determine next task
        this.currentTask = this.getNextTask()

        // Rescheduling done, clear flag
        this.forceReschedule = false

        // all tasks are executed correctly
        if (!this.currentTask) {
            if (this.numberOfTasks === 0) {
                this.debug("> All out of tasks, calling isDone handler")
                //this.isDone()
                this.pause()
            }
            return
        }

        this.debug("> Reschedule to: %s", this.currentTask.toString())
    }

    /**
     * Execute the current thread for a single timelice
     */
    protected executeTimelice() {
        if (!this.currentTask) { return }

        let __step_start: number = getCurrentTimestamp()
        let __start: number
        let __end: number = __step_start
        let taskProgress: number = 0

        do {
            if (this.paused || this.currentTask.status !== TaskStatus.Runnable) {
                break
            }
            /* If a component requests that we reschedule immediately, we will obey! */
            if (this.forceReschedule) {
                break;
            }

            /** We run the current task for one budget (RTJS_BUDGET). The task can hit
             * introduced preemption points that often, before it actually calls yield */

            if (this.currentTask.task.budget > -1) {
                this.RTJS_BUDGET = this.currentTask.task.budget;
            } else {
                this.RTJS_BUDGET = this.config.numOfTicksBeforeReschedule
            }
            __start = getCurrentTimestamp()
            let msg = this.currentTask.next() /* Execute! */
            __end = getCurrentTimestamp()

            /* We account for the elapsed time */
            taskProgress += __end - __start
            this.currentTask.elapsedTime += __end - __start
            this.currentTask.elapsedTicks += 1

            /* Process the message from the thread. */
            if (msg instanceof Promise) {
                let taskStatus = this.currentTask
                taskStatus.status = TaskStatus.Waiting
                msg.then(result => {
                    taskStatus.lastAsyncRespose = result
                    taskStatus.status = TaskStatus.Runnable
                    if (!this.currentTask) {
                        this.repostMe();
                    }
                })
                break
            } else if (msg === SchedulerMessage.TerminateTask || this.currentTask.completed) {
                if (!(msg === SchedulerMessage.TerminateTask)) {
                    this.currentTask.retval = msg;
                }
                this.terminateTask()
                break
            }
        }
        while ((__end - __step_start) < this.config.meanTimeToReschedule);

        // Poll the timeout queue
        do {
            let el = this.timeoutQueue.peek()
            if (!el) { break }
            // Next timeout is more than 1 milisecond away
            if ((el.timeout - __end) > 1) { break } // FIXME: Timeout granularity


            this.timeoutQueue.poll() // remove el
            el.callback()
        } while (true)

        this.debug("Scheduler Timeslice: %d ms/%d ms", (__end - __step_start), taskProgress)
    }

    /**
     * terminates the currently running task
     */
    private terminateTask() {
        if (!this.currentTask) return;

        this.debug(
            "> TerminateTask: Task %s with priority %i (time: %i ms)",
            this.currentTask.task.name,
            this.currentTask.priority,
            this.currentTask.elapsedTime
        )

        if (this.currentTask.parent) {
            this.currentTask.parent.lastAsyncRespose = this.currentTask.lastMessage
            this.currentTask.parent.status = TaskStatus.Runnable
        }

        this.currentTask.terminate()
        this.forceReschedule = true
        this.NPCS = false
        this.currentTask = undefined
    }

    /**
     * if the scheduler is not paused, and there are still tasks left, run
     * the scheduler for meanTimeToYield miliseconds
     */
    private executeRound() {
        let __round_start = getCurrentTimestamp()
        let __round_end = __round_start
        do {
            if (this.paused) { break }
            if (this.forceReschedule || this.needsReschedule()) { this.prepareNextTask() }
            if (!this.currentTask) { break }

            if (this.currentTask.status == TaskStatus.Runnable) {
                this.executeTimelice()
            } else {
                break;
            }
            __round_end = getCurrentTimestamp()
        } while ((__round_end - __round_start) < this.config.meanTimeToYield)

        this.debug("Scheduler Round: %d ms");
        this.schedulerTime += __round_end - __round_start

        // Yield to the mainloop
        this.repostMe()
    }
}
