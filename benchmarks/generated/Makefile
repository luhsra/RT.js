all: figure

figure:
	./figure.py

recalculate: taskset-50

taskset-small:
	node run_generated_benchmarks.js taskset-small.json

taskset-50:
	node run_generated_benchmarks.js taskset-50.json

.PHONY: benchmark_output.csv
