type Resolve<T> = (value: T | PromiseLike<T>) => void;
type Reject<T> = (reason?: T) => void;

/**
 * A promise that can be externally resolved/rejected.
 */
export class Future<T, E = Error> extends Promise<T> {
    public resolve: Resolve<T>;
    public reject: Reject<E>;
    constructor(executor?: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: E) => void) => void) {
        let res!: Resolve<T>;
        let rej!: Reject<E>;
        super((resolve, reject) => {
            res = resolve;
            rej = reject;
            if(executor) executor(resolve, reject)
        });
        this.resolve = res;
        this.reject = rej;
    }
}
