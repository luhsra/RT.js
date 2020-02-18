all: build

build:
	@npm run build-ts
	@chmod a+x build/transpiler/rtjs-transpiler.js

build-watch:
	@npm run watch-ts

build-qualitative-benchmark:
	make -C benchmarks/qualitative

format:
	@./node_modules/.bin/tsfmt -r src/**.ts src/**/*.ts

clean:
	@rm -rf build

docs:
	@./node_modules/.bin/typedoc -out docs


.PHONY: build docs
