const { Task } = require("../rtjs/Task.js")
const { RTJS } = require("../rtjs/rt.js")
const _ = require("lodash")
const Stats = require("./stats").default
const { Box } = require("./boxTask")
const { Fakertjs } = require("./fakertjs")
const { spawnSchedcat, stopSchedcat } = require("./schedcat")
const { setupInputEncrypt } = require ("./inputTask")
const { automaticTestInit, automaticTest, automaticTestStop } = require ("./test" )

rtjs = null;
fake = null;
real = null;
// box
b = null;

// wrapped rtjs for single line handover
wrtjs = null;
function Wrappedrtjs () {
    this.rtjs = null;
}

function runBenchmark () {
    toggleTest = document.getElementById ("toggleTest" )
    if ( toggleTest.checked ) {
        automaticTestInit( toggleSchedcat, rtjsHandOver );
    } else {
        automaticTestStop()
    }
}

function CloseResultWindow () {
    var plot = document.getElementById ( "output_div" )
    plot.style["display"] = "none"
    plot.style["visibility"] = "hidden"
}

/**
 * handover is quite simple, as all tasks are run to completion in the old scheduler
 * however are added into the queue of the new one. There is however a time of "instability"
 */
function rtjsHandOver () {
    checkbox = document.getElementById ( "togglertjs" )
    stopSchedcat();
    if ( checkbox.checked ) {
        console.log("I'm a real rtjs!")
        wrtjs.rtjs = real;
        real.start();
    } else {
        console.log("I'm a fake rtjs!");
        wrtjs.rtjs = fake;
        real.pause();
    }
    toggleSchedcat();
    wrtjs.rtjs.start();
}

function toggleSchedcat () {
    schedcatCheckBox= document.getElementById ( "toggleSchedcat" );
    if ( schedcatCheckBox.checked ) {
        spawnSchedcat ( wrtjs.rtjs );
    } else {
        stopSchedcat ();
    }
}

function main () {
    fake = new Fakertjs();
    real = new RTJS({
        scheduler: {
            policy: "EDF",
            debug: false,
            meanTimeToYield: 1,
            numOfTicksBeforeReschedule: 300
        }
    })
    wrtjs = new Wrappedrtjs ();
    wrtjs.rtjs = fake;

    var stats = Stats ();

    // statloop is not a Task! That is very much intended
    document.body.appendChild ( stats.dom );
    var statLoop = function () {
        stats.update ()
        requestAnimationFrame ( statLoop );
    }
    statLoop()

    b = new Box( wrtjs );

    var resultWindowClose = document.getElementById("window_close");
    resultWindowClose.addEventListener ( "click", CloseResultWindow );

    rtjsCheckBox = document.getElementById ("togglertjs");
    rtjsCheckBox.addEventListener ( "click", rtjsHandOver );

    schedcatCheckBox = document.getElementById ("toggleSchedcat" );
    schedcatCheckBox.addEventListener ( "click", toggleSchedcat )

    toggleBox = document.getElementById ("toggleTest" )
    toggleBox.addEventListener ( "click", runBenchmark )

    // gather correct state of the toggle switches
    setupInputEncrypt( wrtjs )
    rtjsHandOver();
    toggleSchedcat();

    b.addTask();
    wrtjs.rtjs.start();
}

window.onload = main;
