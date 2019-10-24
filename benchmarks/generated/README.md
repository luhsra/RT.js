# Generated Benchmark

**Requires**

  * Python 3
  * python-numpy
  * python-matplotlib
  * python-pandas

## 1. TL;DR or Short Instructions ###

```
cd benchmarks/generated
make figure

make recalculate
make figure
```

## 2. High-Level Description ###

The benchmarks with the generated task sets are located in
`benchmarks/generated`. There, you will find several files that act as
input and as output to this benchmark.

- `taskset-50.json`: This symlink points to `schedcat/taskset.json`,
  which contains the 1000 task sets that were used for the evaluation.
  They were generated with the patched version of SchedCAT in
  `schedcat/`. If you want to generate new task sets, you can use

- `run_generated_benchmarks.js`: This is the driver program for the
  benchmark. It builds 1000 systems, once without RT.js and once with
  RT.js and executes each system three times (raw, fixed-priority,
  EDF). This script uses a few other artifacts in this directory:

  - `generate_tasks.js`: Javascript library to generate the synthetic benchmark systems
  - `fragments/*`: Template files that are concatenated by generate_tasks.js
  - `_generated/*`: The generated systems (and execution traces)
  - `_generated_build/*`: The generated systems as they are transformed the RT.js transpiler

- As outputs files, you will find three files:
  - `benchmark_output.csv`: the condensed statistics over each benchmark system. This is used for drawing the figures.
  - `benchmark_output.json`: The same information as the CSV file, but interspersed with the task-set configuration.

## 3. Deriving Figures ###

Again, we have included the data that we used for the paper in
`benchmarks/generated/benchmarks_output.csv`. In order to see the
dervied figures, please call `make figure`. A window will open, where
the upper bar plot is Figure 5 (Deadline Miss Ratio) and the lower one
is Figure 6 (Run-Time Overhead for Scheduling).

## 4. Recalculating the Data ###

You can create your own result set by calling `make recalculate` in
the `benchmarks/generated` folder. This will really take some time!
Grab a coffee plantation and drink it.

If you want to revert to our original data set, you can use `git
checkout benchmark_output.csv`.
