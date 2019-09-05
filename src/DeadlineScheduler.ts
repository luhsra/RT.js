import { Scheduler, TaskState } from "./Scheduler"
import { Task, TaskStatus } from "./Task"
import { first, sortBy, concat, pullAt, findIndex } from "lodash"
const PriorityQueue = require("fastpriorityqueue")

/**
 * Deadline based scheduler implementation, based on Scheduler
 * implements EDF scheme
 */
export class DeadlineScheduler extends Scheduler {
    /**
     * queue used for managing the tasks, sorted by the deadline-member of the task structures
     */
    private taskQueue: PriorityQueue<TaskState> = new PriorityQueue((a: TaskState, b: TaskState) => {
        return b.absoluteDeadline > a.absoluteDeadline
    })

    /**
     * enqueues a task into the queue
     */
    enqueueTask(task: TaskState) {
        this.forceReschedule = true
        this.taskQueue.add(task)
    }

    emptyTaskQueue() {
        while (this.taskQueue.poll() !== undefined);
    }

    /**
     * determines, whether or not the scheduler needs to reshedule, based on the time passed
     */
    needsReschedule(): boolean {
        if (!this.currentTask || !this.currentTask.isRunnable) { return true }

        let el = this.taskQueue.peek()
        if (el && el.absoluteDeadline < this.currentTask!.absoluteDeadline) {
            return true
        }

        return false
    }

    /**
     * returns the number of tasks in the queue
     */
    get numberOfTasks(): number {
        return this.taskQueue.size
    }

    /**
     * returns the next task to run
     */
    protected getNextTask(): TaskState | undefined {
        return this.taskQueue.removeOne(t => t.isRunnable)
    }
}
