let intervals__RAND_ID(true)___resolve

let jobs_planned = 0
let jobs_enqueued = 0
let jobs_finished = 0
__awaiting.push(new Promise(resolve => {
    intervals__RAND_ID(true)___resolve = resolve
}))

class SchedcatTask__RAND_ID(true)__ extends Task {
    constructor(id, time, priority, deadline) {
        super({
            name: "SchedcatTask__RAND_ID(true)__-" + id,
            priority: priority, // fixed-priority priority
            deadline: deadline, // relative deadline
            wcet: time,
            cancel_on_deadline: false // FIXME: Is currently ignored
        })
    }

    // @rtjs
    run() {
        while (true) {
            // We have reached our execution time limit
            if (this.rtjs.getExecutionTime() >= this.wcet) {
                break
            }
        }
        return this.SchedulerMessage.TerminateTask
    }

    onTerminated() {
        addResult(this)
        jobs_finished += 1
        if (jobs_finished == jobs_planned) {
            intervals__RAND_ID(true)___resolve()
        }
    }
}

let definitions__RAND_ID(true)__ = __VAR(SCHEDCAT)__
// Sort by period for RM scheduling in Descending Order (Big period first)
definitions__RAND_ID(true)__.sort((a, b) => (b.period - a.period))

for (let i = 0; i < definitions__RAND_ID(true)__.length; i++) {
    let task = definitions__RAND_ID(true)__[i]
    let priority = i
    let deadline = task.period
    // console.error([task.period, priority, deadline])

    let time = 0
    while (time < maxRunTime) {
        let job = new SchedcatTask__RAND_ID(true)__(i, task.wcet, priority, deadline)
        job.creationTime += time // We will create the job at that time
        //console.error([time, '+', task.wcet, '<', time+task.period])
        rtjs.addAlarm(() => {
            // job.creationTime = rtjs.getTime()
            rtjs.addTask(job)
            // Singal that all jobs have been enqueued
            jobs_enqueued += 1;
        }, time)
        time += task.period;
        jobs_planned += 1
    }
}
