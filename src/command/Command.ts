import { SqsBoostClientConfig } from '../Client';

export abstract class SqsbCommand<
	Input extends object,
	BaseInput extends object,
	Output extends object,
	BaseOutput extends object
> {
	constructor(public readonly input: Input) {}

	Input!: Input;
	Output!: Output;

	abstract handleInput: (clientConfig: SqsBoostClientConfig) => Promise<BaseInput>;
	abstract handleOutput: (output: BaseOutput, clientConfig: SqsBoostClientConfig) => Promise<Output>;

	abstract send: (clientConfig: SqsBoostClientConfig) => Promise<Output>;
}
