import { Scheduler, TaskState } from "./Scheduler"
import { Task, TaskStatus } from "./Task"
import { pullAt, findIndex, defaults } from "lodash"

/**
 * implementation of a fixed priority scheduler, based on Scheduler
 * implements RMS scheme
 */
export class FixedPriorityScheduler extends Scheduler {
    /**
     * queues for the tasks, one per priority
     */
    private taskQueues: TaskState[][] = []

    /**
     * enqueues the task into the correct queue for its priority
     * @param task the task to enqueue
     */
    enqueueTask(task: TaskState) {
        this.forceReschedule = true
        if (!this.taskQueues[task.priority]) {
            this.taskQueues[task.priority] = [task]
        } else {
            this.taskQueues[task.priority].push(task)
        }
    }

    /**
     * returns the number of elements total in all queues
     */
    get numberOfTasks(): number {
        return this.taskQueues.reduce((aggr, queue) => queue ? aggr + queue.reduce((a, i) => a + 1, 0) : aggr, 0)
    }

    emptyTaskQueue() {
        this.taskQueues = [];
    }

    /**
     * determines the next task to run, based on the highest priority
     */
    protected getNextTask(): TaskState | undefined {
        let highestPriority = this.taskQueues.length - 1

        for (let i = highestPriority; i >= 0; i--) {
            // if the queue exists
            let queue = this.taskQueues[i]
            if (!queue) {
                continue
            }

            // find a runable task
            let taskIndex = findIndex(queue, t => t.isRunnable)

            // if that exists, return the task
            if (taskIndex != -1) {
                let task = queue[taskIndex]
                pullAt(queue, taskIndex)
                return task
            }
        }

        return undefined
    }

    /**
     * returns the next task, similar to getNextTask, without removing it from the queue
     */
    protected peekNextTask(): TaskState | undefined {
        let highesPriority = this.taskQueues.length - 1

        for (let i = highesPriority; i >= 0; i--) {
            let queue = this.taskQueues[i]
            if (!queue) {
                continue
            }

            let taskIndex = findIndex(queue, t => t.isRunnable)

            if (taskIndex != -1) {
                return queue[taskIndex]
            }
        }

        return undefined
    }

    /**
     * determines, whether a reschedule is necessary
     */
    protected needsReschedule(): boolean {
        if (!this.currentTask || !this.currentTask.isRunnable) { return true }

        // check if there's another, higher priority task available
        let nextTask = this.peekNextTask()
        if (nextTask && nextTask.priority > this.currentTask.priority) { return true }

        return false
    }
}
