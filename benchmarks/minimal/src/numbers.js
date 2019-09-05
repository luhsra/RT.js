const { Task } = require("../rtjs/Task.js")

const NUMBERS_PRIO = 150
const NUMBERS_DEADLINE = 10
/**
 * @file Numbers
 * increments a number on the webpage (counts frames)
 */
class Numbers extends Task {
    constructor ( rtjs ) {
        super({
            name: "NumbersTask",
            priority: NUMBERS_PRIO,
            deadline: NUMBERS_DEADLINE
        })

        this.last = 0;
        this.div = document.querySelector("#num")
        this.rtjs = rtjs;
    }

    // @rtjs
    run () {
        this.last++;
        this.div.textContent = this.last.toString()
    }

    addTask () {
        if ( this.rtjs != null ) {
            this.creationTime = performance.now();
            this.rtjs.addTask ( this );
        }
        requestAnimationFrame(this.addTask.bind(this))
    }

    onTerminate () { }
}

export { Numbers };
