import { Scheduler, SchedulerMessage, getCurrentTimestamp } from "./Scheduler"
import { RTJS } from "./rt"

export enum TaskType {
    Basic = "Basic",
    Extended = "Extended"
}

export enum TaskStatus {
    Runnable = "Runnable",
    Waiting = "Waiting"
}

export type Timestamp = number

/**
 * configuration structure for tasks
 */
export interface TaskConfig {
    name: string
    priority?: number
    deadline?: number
    wcet?: number
    parent?: Task
    budget?: number
}

/**
 * task class
 */
export class Task {
    name: string
    priority: number = 0
    deadline: number = 0
    wcet?: number
    parent?: Task
    budget: number

    rtjs: RTJS
    scheduler: Scheduler

    type: TaskType = TaskType.Basic
    status: TaskStatus = TaskStatus.Runnable
    private readonly originalPriority: number = 0
    protected readonly SchedulerMessage = SchedulerMessage

    creationTime: Timestamp  // When was the job released
    enqueuedTime?: Timestamp // When did the job hit the scheduler queue
    endTime?: Timestamp      // When did the job terminate
    elapsedTime: number = 0  // How long did the task actually execute

    cancel_on_deadline: boolean = false
    cancelled: boolean = false

    retval: any = null       // return value of the finished task

    constructor(config: TaskConfig) {
        this.name = config.name
        this.parent = config.parent
        this.priority = config.priority || 0
        this.originalPriority = this.priority
        this.deadline = config.deadline || -1
        this.wcet = config.wcet
        this.creationTime = getCurrentTimestamp() // Sometimes overriden from the outside (Benchmarks)
        this.budget = config.budget || -1
    }

    /**
     * add a task to the system
     * @param task the task to add
     */
    chainTask(task: Task) {
        this.scheduler.addTask(task)
    }

    /**
     * spwan a task to the system
     * @param task the task to spawn
     */
    spawnTask(task: Task) {
        this.rtjs.spawnTask(task)
    }

    /**
     * the generator function of this task
     */
    *run(): IterableIterator<SchedulerMessage | Promise<any>> {
        return SchedulerMessage.TerminateTask
    }

    getAbsoluteDeadline(): Timestamp {
        return this.creationTime + this.deadline
    }

    /**
     * a callback to be used when the task is terminated
     */
    onTerminated() {
    }
}
