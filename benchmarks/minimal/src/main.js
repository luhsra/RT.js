/**
 * This is a minimal example for using rt.js. It consists of the 
 *   - box task (known from the qualitative benchmark)
 *   - numbers task (adding numbers and printing them in the <div>-element
 **/
const { Task } = require("../rtjs/Task.js")
const { RTJS } = require("../rtjs/rt.js")
const _ = require("lodash")
const { Box } = require("./boxTask")
const { Numbers } = require("./numbers")

function main () {
    real = new RTJS({
        scheduler: {
            policy: "EDF",
            debug: false,
            meanTimeToYield: 1,
            numOfTicksBeforeReschedule: 300
        }
    })

    b = new Box( real );
    b.addTask();

    n = new Numbers ( real );
    n.addTask();
    real.start();
}

window.onload = main;
