import { ChildProcess, spawn, SpawnOptions } from 'child_process';

export interface ExitState {
    error?: Error;
    canceled: boolean;
    code: number | null;
    signal: NodeJS.Signals | null;
}

export class CancelableProcess {
    private process: ChildProcess;

    private _promise: Promise<ExitState>;
    public waitForClose(): Promise<ExitState> { return this._promise; }

    private _canceled = false;
    public get canceled(): boolean { return this._canceled; }

    private resolve!: (value: ExitState | PromiseLike<ExitState>) => void;
    private error?: Error;

    constructor(process: ChildProcess) {
        this._promise = new Promise<ExitState>(resolve => this.resolve = resolve);
        this.process = process;
        this.process.on('error', this.onError.bind(this));
        this.process.on('close', this.onClose.bind(this));
    }

    public static spawn(command: string, args: readonly string[], options: SpawnOptions): CancelableProcess {
        return new CancelableProcess(spawn(command, args, options));
    }

    public cancel(): Promise<ExitState> {
        if (!this._canceled) {
            this._canceled = true;
            this.process.kill();
        }
        return this._promise;
    }

    private onError(err: Error): void {
        this.error = err;
    }

    private onClose(code: number | null, signal: NodeJS.Signals | null): void {
        this.resolve({
            canceled: this._canceled,
            error: this.error,
            code: code,
            signal: signal
        })
    }
}
