const { submitAES } = require ("./inputTask")
//const Plotly = require ("plotly.js/dist/basic")
const Plotly = require('plotly.js-basic-dist');

// every stage 60 seconds
var StepTime = 60000 //60000
var dicTime = 500 // half a second

var InternalState = 0;
var cbrtjs = null
var cbSchedcat = null;
var cbAES = null;
var cb = [];
var myInterval = null;
var testLabel = null;
var testToggle = null
var mycb
var textBox = null;

var dicInterval = 0;
var dictionary = require("../../cfg/wordlist.json")
var dicIndex = 0;

var hold = false;
var startTime = 0
var secs = 0;
var frames = 0
var buffer = []
var index = 0
var started = false;

var plotlyOutputDiv = "plotly_output_div";
var outputDiv = "output_div"

var automaticTestInit = function ( toggleSchedcat, rtjsHandOver ) {
    cbrtjs = document.getElementById ("togglertjs")
    cbSchedcat = document.getElementById ("toggleSchedcat")
    cbAES = document.getElementById ("toggleEncrypt")
    textBox = document.getElementById("inputTextBox")

    hold = false;

    testToggle = document.getElementById ("toggleTest" )
    testLabel = document.getElementById ("toggleTestLabel" )
    testLabel.textContent ="Running Benchmark"
    cb = [ cbAES, cbSchedcat, cbrtjs ]
    mycb = [ null, toggleSchedcat, rtjsHandOver ]
    myInterval = setInterval ( automaticTest, StepTime )
    dicInterval = setInterval ( automaticDictionary, dicTime )
    requestAnimationFrame ( countFrames )
}

var automaticDictionary = function () {
    if ( testToggle.checked ) {
        textBox.value = dictionary[dicIndex]
        dicIndex++;
        dicIndex = dicIndex % dictionary.length
        submitAES () 
        textBox.value = ""
    } else {
        clearInterval ( dicInterval )
    }
}

// count frames per second
var countFrames = function () {
    if ( started != testToggle.checked ) {
        started = testToggle.checked;

        // from running to not running anymore
        if ( testToggle.checked == false) {
            var trace = { 
                x: [],
                y: [],
                type: 'scatter'
            }

            var avg =  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            var mind = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100]
            var maxd = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            var j = 0
            for ( var i = 0; i < buffer.length; i++ ) {
                var val = buffer[i][1]
                var index = buffer[i][0] 

                trace.x[i] = index // buffer[i][0]
                trace.y[i] = val //  buffer[i][1]

                j = Math.floor(i / (StepTime/1000));
                if (val < mind[j]) {
                    mind[j] = val
                }
                if (val > maxd[j]) {
                    maxd[j] = val
                }
                avg[j] += val //buffer[i][1]

                console.log ( "> ", index, val )
            }

            for ( var i = 0; i < avg.length; i++ ) {
                console.log(avg[i] )
                avg[i] /= (StepTime / 1000);
            }

            var sz = StepTime / 1000
            var data = [trace]
            var layout = {
                title: 'Trace of benchmark run',
                width: 800,
                height: 500,
                xaxis: {
                    title: "Time [s]",
                    range: [0, sz*10],
                    tickvals: [0, sz*1, sz*2, sz*3, sz*4, sz*5, sz*6, sz*7, sz*8, sz*9, sz*10],
                },
                yaxis: {
                    title: "Frames per Second",
                    range: [0,80],
                    tickvals: [0, 10, 20, 30, 40, 50, 60, 70, 80],
                },
                annotations: [
                    {
                        x: (sz*0) + (sz/2),
                        y: 70,
                        showarrow: false,
                        xref: "x",
                        yref: "y",
                        text: "grace"
                    }, 
                    {
                        x: (sz*1) + (sz/2),
                        y: 70,
                        showarrow: false,
                        xref: "x",
                        yref: "y",
                        text: "RTC<br />no load<br />"
                    },
                    {
                        x: (sz*2) + (sz/2),
                        y: 70,
                        showarrow: false,
                        xref: "x",
                        yref: "y",
                        text: "RTC<br />AES<br />"
                    },
                    {
                        x: (sz*3) + (sz/2),
                        y: 70,
                        showarrow: false,
                        xref: "x",
                        yref: "y",
                        text: "RTC<br />SC<br />"
                    },
                    {
                        x: (sz*4) + (sz/2),
                        y: 70,
                        showarrow: false,
                        xref: "x",
                        yref: "y",
                        text: "RTC<br />SC<br />AES"
                    },
                    {
                        x: (sz*5) + (sz/2),
                        y: 70,
                        showarrow: false,
                        xref: "x",
                        yref: "y",
                        text: "grace"
                    },
                    {
                        x: (sz*6) + (sz/2),
                        y: 70,
                        showarrow: false,
                        xref: "x",
                        yref: "y",
                        text: "RT.js<br />no load<br />"
                    },
                    {
                        x: (sz*7) + (sz/2),
                        y: 70,
                        showarrow: false,
                        xref: "x",
                        yref: "y",
                        text: "RT.js<br />AES<br />"
                    },
                    {
                        x: (sz*8) + (sz/2),
                        y: 70,
                        showarrow: false,
                        xref: "x",
                        yref: "y",
                        text: "RT.js<br />SC<br />"
                    },
                    {
                        x: (sz*9) + (sz/2),
                        y: 70,
                        showarrow: false,
                        xref: "x",
                        yref: "y",
                        text: "RT.js<br />SC<br />AES"
                    }
                ]
            }
            Plotly.newPlot ( plotlyOutputDiv, data, layout )

            for ( var i = 0; i<10; i++ ) {
                var tr = document.getElementById ( "table_" + i )
                for ( var j = 0; j < tr.children.length; j++ ) {
                    if (tr.children[j].classList.contains ( "avg" )) {
                        tr.children[j].textContent = avg[i].toPrecision(4).toString()
                    }
                    if (tr.children[j].classList.contains ( "min" )) {
                        tr.children[j].textContent = mind[i].toString()
                    }
                    if (tr.children[j].classList.contains ( "max" )) {
                        tr.children[j].textContent = maxd[i].toString()
                    }
                }
            }

            var plot = document.getElementById ( outputDiv );
            plot.style["visibility"] = "visible"
            plot.style["display"] = "block"
        }
        
        // starting a test run
        if ( testToggle.checked == true ) {
            startTime = performance.now()
            buffer = []
            index = 0;
            frames = 0;
        }
    }


    if ( testToggle.checked ) {
        var now = performance.now()
        var offset = secs * 1000;
        // more than 1000 ms from the last measurement (i.e. 1 s)
        // and where there seconds without any frames?
        while ( now - startTime - (secs*1000) > 1000 ) {
            buffer.push([secs, frames])
            // start at 1 -> this frame already counts towards the next second
            frames = 0;
            secs++;
        } 
        frames++;

        requestAnimationFrame ( countFrames )
    }
}

var automaticTest = function () {
    // after switching to rtjs, hold for a round (StepTime ms)
    if ( hold ) {
        hold = false;
        testLabel.textContent = "Running Benchmark ( grace period )"
    } else {
        if ( InternalState <= 8 ) {
            var mask = 1;
            for ( var i = 0; i < 3; i++ ) {
                var v = InternalState & mask;
                cb[i].checked = (v > 0 ? true : false )
                mask <<= 1
                if (mycb[i] != null ) {
                    mycb[i]();
                }
            }
        }

        // grace period after fakertjs
        if ( InternalState == 4 ) {
            hold = true
        } 

        testLabel.textContent = "Benchmark running ( "+InternalState+" / 8 )"
        console.warn ( "State: 0x" + InternalState.toString(16) ) 
        InternalState++;
        // one grace period at the end
        if ( InternalState > 9 ) {
            InternalState = 0
            automaticTestStop();
            testLabel.textContent = "Benchmark finished"
            testToggle.checked = false
        }
    }
}

var automaticTestStop = function () {
    clearInterval ( myInterval )
}

export { automaticTestInit, automaticTest, automaticTestStop }
