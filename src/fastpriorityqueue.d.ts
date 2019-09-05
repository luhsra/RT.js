declare class PriorityQueue<T> {
    size: number
    constructor(comparator: Function)
    peek(): T | undefined
    poll(): T | undefined
    add(a: T): void
    removeOne(fn: (t: T) => boolean): T | undefined
    forEach(fn: (t: T) => void): void
}

declare module "fastpriorityqueue" {
    export = PriorityQueue;
}
