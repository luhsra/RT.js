BUILD=build/
objects := build/src/main.js

all: clean prepare build
build: js/bundle.js

prepare:
	@echo -e "\033[32;1mBuilding the transpiler.\033[0m"
	-mkdir -p rtjs
	-mkdir -p build
	make -C ../../ build
	cp -r ../../build/* rtjs

js/bundle.js: $(objects)
	@echo -e "\033[32;1mPacking JavaScript files with webpack.\033[0m"
	sed '/const perf_hooks_1 = require("perf_hooks");/d' -i build/rtjs/Scheduler.js
	../../node_modules/.bin/webpack-cli --mode development --entry ./$< --output ./$@

build/src/main.js:
	@echo -e "\033[32;1mTranspiling JavaScript source files.\033[0m"
	-mkdir -p build/src
	-mkdir -p build/rtjs
	node rtjs/transpiler/rtjs-transpiler.js src/main.js

clean:
	@echo -e "\033[32;1mCleaning from old build artifacts.\033[0m"
	-rm -rf js/bundle.js
	-rm -rf build/*

mrproper:
	make clean
	-rm -rf rtjs
