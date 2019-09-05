# Macro Benchmark

This is a macro benchmark of the RT.js JavaScript library and transpiler system. It contains several tasks running inside the RT.js scheduler:

  * box task - the task moving the box, requeues itself on next Animation Frame (c.t. requestAnimationFrame).
  * Schedcat-generated tasks - a number of schedCAT tasks, that busy wait on their WCETs, combined utilization of 0.75.
  * inputTask - is triggered on text input, records the input and releases an AES job.
  * AES task - concatenates the input with itself 16 times, and encrypts + decrypts it 350 times. The result is written to JavaScript console.

The stats in the top right are deliberately not tasks, as they need to be as close to the browser as possible and no further delay should be added for their operation.

## Directories and files

  * ./src -> JavaScript source files
  * ./cfg -> SchedCAT configuration file
  * ./osek -> transpiled JavaScript files of the /src-RT.js library
  * ./build -> directories for intermediately build files (i.e. ones, which went through the transpiler, but were not webpacked yet)
  * ./js -> output directory for the finished bundle.js
  * ./css -> CSS file

## Building

Preparing the build environment, i.e. building the RT.js transpiler and run-time library in /src (of the main repo) and copy it to ./osek (see /src/Makefile):

```bash
make prepare
```

Transpiling the application sources (in ./src) and bundling them with webpack:

```bash
make
```

## Usage

Visit the `index.html` page with any browser.

## Benchmark mode

When selecting the "Run Benchmark" option in the bottom right, an automatic test is run. Each step is left running for 60 seconds. It toggles through all the options, starting with a grace period at the start, after activating the RT.js scheduler and at the end. At the end of the test, a plot is presented with the test results (which has been added to the macro benchmark specifically for the artefact evaluation process). Also the average, mininmal and maximal framerate is presented per step.

The raw framerates for each second are dumped to JavaScript console. These can be copied and converted to a gnuplot input-file. When running the benchmark several times on each browser, an average can be calculated and the plot from the Paper (Fig. 8 (a) and (b)) can be recreated using the `results/macro.plt` gnuplot script. 

```
make figure
```
