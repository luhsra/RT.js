# Micro Benchmark

**Requires**

  * Python 3
  * python-pandas
  * python-matplotlib

## 1. TL;DR or Short Instructions ###

```
cd benchmarks/micro
make table figure

make recalculate
make table figure
```

## 2. High-Level Description ###

The microbenchmarks for determining the preemption overheads are
located in `benchmarks/micro`. They consist of a single file
(`benchmarks/micro/context_switch_overheads.js`) that gets executed
with NodeJS. The benchmark program runs the tight loops for N=10000
times and produces two CSV file
(`benchmarks/micro/context_switch_overheads*.csv`). These files are
the base for Table II and Figure 4 in the paper.

## 3. Deriving Tables and Figures ###

We already have included the data that we calculated for the paper in
this repository. Therefore, you can extract the same information as we
did from the CSV and you will find the exact same results in the
paper. In the next section, we will explain how you can recalculate
the CSV files in the virtual machine and use the same analysis tooling
to make you own tables and figures.

- Table II: `make table`

  Example Terminal Output:
  ```
                  name       Mean     Std  Per Yield
  0           baseline   0.976562  0.015359   0.000000
  1  generator 1 level  18.799210  0.010574  17.822647
  2  generator 2 level  49.102020  0.212505  48.125458
  3  generator 3 level  71.449661  0.194569  70.473099
  ```

- Figure 4: `make figure`

  A window will open that shows a figure that is equivalent to figure
  4 in the paper.

## 4. Recalculating the Data ###

In the last step, you can recalculate the microbenchmark numbers and
reiterate step 2 in order to show the results for your own numbers.
For this you can use the recalculate target: `make recalculate` in the
`benchmarks/micro`-folder. This will take some time, as 10000
iterations of each benchmarks have to be run. Therefore: grab another
coffee.

If you wan to revert to our original data set, you can use `git
checkout *.csv` in the `benchmark/micro` folder.
