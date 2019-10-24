
const INC = 12345
const MUL = 1103515245
const MOD = Math.pow(2, 31)

/**
 * Super simple PRNG based on the linear congruential generator.
 */
class Rand {
    constructor(seed) {
        this.seed = seed
    }

    next() {
        this.seed = (MUL * this.seed + INC) % MOD
        return this.seed
    }

    nextInRange(min, max) {
        return min + (this.next() % (max - min))
    }
}

module.exports = {
    Rand
}
