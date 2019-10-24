require('console.table')
const fs = require("fs")
const _ = require("lodash")
let print = console.log
const statistic = require('./statistic')
const { performance } = require('perf_hooks')


/*
First, we define our benchmark functions: the raw/plain loop that is
unmodifed. The generatorized-variants with three different depths, and
the budgeted variant.
*/

const COUNT = 1024 * 256

function rawForLoop() {
    let counter = 0

    for (let i = 0; i < COUNT; i++) {
        counter += 1
    }

    return counter
}

function *genForLoop() {
    let counter = 0

    for (let i = 0; i < COUNT; i++) {
        yield
        counter += 1
    }

    return counter
}

function *genFor2Loop() {
    let y = yield *genForLoop()
    return y;
}

function *genFor3Loop() {
    let y = yield *genFor2Loop()
    return y;
}

let OSEK_MAX_BUDGET = 0;
function *genBudget() {
    let counter = 0

    for (let i = 0; i < COUNT; i++) {
        if ((--OSEK_MAX_BUDGET) < 0) { yield; }
        counter += 1
    }

    return counter
}

/*
  From here on, there is only the benchmarking infrastructure.
*/

function runBenchmark(fn, iterationCount, completer) {
    let time = 0
    let iterations = 0

    print(`Execute ${fn.name} for a ${iterationCount} times...`)
    per_iteration = []
    while (iterationCount -- > 0) {
        let begin = performance.now()
        iterations += completer(fn)
        let end = performance.now()
        time += (end - begin)
        per_iteration.push(time /1000 / iterations)
    }
    time = time / 1000; // Make seconds

    print(`... ${time/iterations * 1e9} ${statistic.median(per_iteration)*1e9} ${statistic.standardDeviation(per_iteration)*1e9}`)



    return {
        iterations,
        time: time,
        "Frequency": _.round((iterations / time) / 1e6, 2),
        "Mean":      time/iterations * 1e9,
        "Median":      statistic.median(per_iteration) * 1e9,
        "Std":      statistic.standardDeviation(per_iteration) * 1e9,

    }
}

function completerPlain(fn) {
    return fn()
}

function completerGenerator(generatorFunc) {
    /* Generators have to executed, until they tell us they are done. */
    let iterator = generatorFunc()
    let last = iterator.next()
    while (!last.done) {
        last = iterator.next()
    }
    return last.value
}

function completerGeneratorBudget(budget) {
    /* Return a completer function that executes the generator and
     * resets the budget variable in between */
    return function(generatorFunc) {
        let iterator = generatorFunc()
        OSEK_MAX_BUDGET = budget;
        let last = iterator.next()
        while (!last.done) {
            OSEK_MAX_BUDGET = budget;
            last = iterator.next()
        }
        return last.value;
    }
}




const OUTPUT_FILE = "context_switch_overhead.csv";
const ITERATIONS = 10000;
function main() {
    print(`Running each function ${ITERATIONS} times...`)
    print(`The iteration count per loop is ${COUNT}`)

    let results = {}
    /* Warmup */ runBenchmark(rawForLoop,  ITERATIONS, completerPlain)
    results["baseline"]          = runBenchmark(rawForLoop,  ITERATIONS, completerPlain)
    /* Warmup */  runBenchmark(genForLoop,  ITERATIONS, completerGenerator)
    if (true) {
        results["generator 1 level"] = runBenchmark(genForLoop,  ITERATIONS, completerGenerator)
        results["generator 2 level"] = runBenchmark(genFor2Loop, ITERATIONS, completerGenerator)
        results["generator 3 level"] = runBenchmark(genFor3Loop, ITERATIONS, completerGenerator)
    }

    /* With Budgets */
    let budgeted = {}
    if (true) {
        let budget = 0
        for (; budget < 10; budget += 1) {
            budgeted[budget] = runBenchmark(genBudget, ITERATIONS, completerGeneratorBudget(budget))
        }
        for (; budget <= 100; budget += 10) {
            budgeted[budget] = runBenchmark(genBudget, ITERATIONS, completerGeneratorBudget(budget))
        }
        for (budget = 100; budget <= 1000; budget += 50) {
            budgeted[budget] = runBenchmark(genBudget, ITERATIONS, completerGeneratorBudget(budget))
        }
    }

    // Remove Overheads
    for (let variant in results) {
        results[variant]['Per Yield'] = results[variant]['Mean'] -
            results['baseline']['Mean']
    }
    for (let variant in budgeted) {
        budgeted[variant]['Per Yield'] = budgeted[variant]['Mean'] -
            results['baseline']['Mean']
    }

    let table = []
    _.forEach(results, (r,i) => {
        table.push({name: i, ...r})
    })
    _.forEach(budgeted, (r,i) => {
        table.push({name: i, ...r})
    })
    console.table(table)

    let fields = ["iterations", "time", "Mean", "Median", "Std", "Per Yield"]
    CSV = "name," + fields.join(",") + "\n"
    for (let variant in results) {
        let line = [variant];
        line = line.concat(_.map(fields, (field) => results[variant][field]))
        CSV += line.join(",") + "\n"
    }
    fs.writeFileSync("context_switch_overhead.csv", CSV)

    // With Budgets
    CSV = "budget," + fields.join(",") + "\n"
    for (let variant in budgeted) {
        let line = [variant];
        line = line.concat(_.map(fields, (field) => budgeted[variant][field]))
        CSV += line.join(",") + "\n"
    }
    fs.writeFileSync("context_switch_overhead_budgeted.csv", CSV)
    print(`Results written to context_switch_overhead{,_budgeted}.csv`)
}


main()
