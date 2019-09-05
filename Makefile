all: build

build:
	@./node_modules/.bin/tsc
	@chmod a+x build/transpiler/*

build-watch:
	@./node_modules/.bin/tsc --watch

build-qualitative-benchmark:
	make -C benchmarks/qualitative

format:
	@./node_modules/.bin/tsfmt -r src/**.ts src/**/*.ts

clean:
	@rm -rf build

docs:
	@./node_modules/.bin/typedoc -out docs


.PHONY: build docs
