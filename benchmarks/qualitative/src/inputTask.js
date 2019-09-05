const { Task } = require("../rtjs/Task")
const _ = require("lodash")

class AESTask extends Task {
    constructor(msg) {
        super({
            name: "AESTask",
            priority: 30,
            deadline: 500, // half a second
            budget: 10, // lower the budget of the AESTask
        })
        this.msg = msg
    }
    
    run_uninterrupted() {
        // ct. https://github.com/ricmoo/aes-js
        var key = [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16 ];
        var iv = [ 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,35, 36 ];

        var text = this.msg
        // AES.JS needs input which is multiple of 16 Bytes long!
        for (var i = 0; i < 4; i++ ) {
            text += text
        }

        for ( var i = 0; i < 350; i++ )
        {
            var textBytes = aesjs.utils.utf8.toBytes(text);

            var aesCbc = new aesjs.ModeOfOperation.cbc(key, iv);
            var encryptedBytes = aesCbc.encrypt(textBytes);
            var encryptedHex = aesjs.utils.hex.fromBytes(encryptedBytes);

            // and retoure
            var encryptedBytes = aesjs.utils.hex.toBytes(encryptedHex);
            var aesCbc = new aesjs.ModeOfOperation.cbc(key, iv);
            var decryptedBytes = aesCbc.decrypt(encryptedBytes);

            var decryptedText = aesjs.utils.utf8.fromBytes(decryptedBytes);
        }
        console.warn ( this.rtjs.getExecutionTime(), "ms: ", text, " -> ", encryptedHex, " -> ", decryptedText )
    }

    // @rtjs
    run() {
        // ct. https://github.com/ricmoo/aes-js
        var key = [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16 ];
        var iv = [ 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,35, 36 ];

        var text = this.msg
        // AES.JS needs input which is multiple of 16 Bytes long!
        for (var i = 0; i < 4; i++ ) {
            text += text
        }

        for ( var i = 0; i < 350; i++ )
        {
            var textBytes = aesjs.utils.utf8.toBytes(text);

            var aesCbc = new aesjs.ModeOfOperation.cbc(key, iv);
            var encryptedBytes = aesCbc.encrypt(textBytes);
            var encryptedHex = aesjs.utils.hex.fromBytes(encryptedBytes);

            // and retoure
            var encryptedBytes = aesjs.utils.hex.toBytes(encryptedHex);
            var aesCbc = new aesjs.ModeOfOperation.cbc(key, iv);
            var decryptedBytes = aesCbc.decrypt(encryptedBytes);

            var decryptedText = aesjs.utils.utf8.fromBytes(decryptedBytes);
        }
        console.warn ( this.rtjs.getExecutionTime(), "ms: ", text, " -> ", encryptedHex, " -> ", decryptedText )
    }
}

class InputTask extends Task {
    constructor(input, outputList) {
        super({
            name: "InputTask",
            priority: 20,
            deadline: 100, // 100 ms
        })
        this.input = input
        this.outputList = outputList
    }

    run_uninterrupted() {
        let currentTime = performance.now()
        var ct = Math.round(currentTime - this.creationTime);
        this.outputList.innerHTML = `<li>${this.input}: <br /><small>sched delay: ${ct}ms</small></li>`

        var encInput = encryptInputInput.checked;
        if (encInput) {
            this.rtjs.addTask(new AESTask(this.input))
        }
    }

    // @rtjs
    run() {
        let currentTime = performance.now()
        var ct = Math.round(currentTime - this.creationTime);
        this.outputList.innerHTML = `<li>${this.input}: <br /><small>sched delay: ${ct}ms</small></li>`

        var encInput = encryptInputInput.checked;
        if (encInput) {
            this.rtjs.addTask(new AESTask(this.input))
        }
    }
}

var w = null;
var textInput = null;
var outputList = null
var encryptInputInput = null
function submitAES () {
    w.rtjs.addTask(new InputTask(textInput.value, outputList))
}

function setupInputEncrypt( wrtjs ) {
    outputList = document.querySelector("#output_list")
    textInput = document.querySelector("#input_test input")
    encryptInputInput = document.getElementById ("toggleEncrypt")
    let keyDelay = document.querySelector("#key_delay")

    w = wrtjs;

    let avgs = []
    let min = Number.POSITIVE_INFINITY
    let max = Number.NEGATIVE_INFINITY

    let keyDownStartTime
    textInput.onkeydown = (event) => {
        keyDownStartTime = performance.now();
    }

    textInput.onkeyup = (event) => {
        let currentTime = performance.now()
        let diff = Math.round(currentTime - keyDownStartTime)
        avgs.push(diff)
        min = Math.min(min, diff)
        max = Math.max(max, diff)
        requestAnimationFrame(() => {
            keyDelay.innerHTML = `${diff}ms | Avg: ${_.round(_.mean(avgs), 4)}ms | min: ${min} | max: ${max}`
        })

        if (event.keyCode === 13) {
            submitAES();
            textInput.value = ""
        }
    }
}

export { setupInputEncrypt, submitAES }
