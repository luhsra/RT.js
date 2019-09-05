/**
 * @file schedcat.js
 * Contains SchedcatTaks, used to generate background load to the javascript
 * engine and/or our scheduler. 
 */

const { Task } = require("../rtjs/Task")

class SchedcatTask extends Task {
    constructor(wcet, deadline, index) {
        super({
            name: "SchedcatTask-" + index,
            priority: index,
            deadline: deadline
        })
        this.wcet = wcet
    }

    run_uninterrupted() {
        while (true) {
            // We have reached our execution time limit
            if (this.rtjs.getExecutionTime() >= this.wcet) {
                break
            }
        }
    }
    
    // @rtjs
    run() {
        //console.log("Starting %s: WCET: %d, now: %d", this.name, this.wcet, performance.now())
        while (true) {
            //console.log("AAAH")
            //console.log(this.rtjs.scheduler.rtjs_BUDGET)
            // We have reached our execution time limit
            if (this.rtjs.getExecutionTime() >= this.wcet) {
                break
            }
        }
        //console.log("finishing %s, WCET: %d, now: %d", this.name, this.wcet, performance.now())
    }
}

var intervals = []
/**
 * stop schedcat tasks, i.e. do not re-inroduce them to the system
 */
function stopSchedcat () {
    intervals.forEach((i) => {
        clearInterval(i)
    })
    intervals = []
}

/**
 * spawn a set of schedcat tasks (i.e. background load)
 */
function spawnSchedcat ( rtjs ) {
    let definitions = require("../../cfg/schedcat.json").map(f => f.tasks)[0]
    //console.log ("Spawning Schedcat Tasks" )
    //let definitions= [{ period: 1000, wcet: 100} ]
    for (let i = 0; i < definitions.length; i++) {
        let t = definitions[i]
        intervals.push(setInterval(() => {
            rtjs.addTask(new SchedcatTask(t.wcet, t.period, i))
        }, t.period))
    }
}

export { spawnSchedcat, stopSchedcat }
