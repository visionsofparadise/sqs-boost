import { SqsbCommand } from './Command';
import { UncapitalizeKeys, capitalizeKeys } from 'object-key-casing';
import { SqsBoostClientConfig } from '../Client';
import { PurgeQueueCommandInput, PurgeQueueCommandOutput, PurgeQueueCommand } from '@aws-sdk/client-sqs';

export interface SqsbPurgeQueueCommandInput extends UncapitalizeKeys<PurgeQueueCommandInput> {}

export interface SqsbPurgeQueueCommandOutput extends PurgeQueueCommandOutput {}

export class SqsbPurgeQueueCommand extends SqsbCommand<
	SqsbPurgeQueueCommandInput,
	PurgeQueueCommandInput,
	SqsbPurgeQueueCommandOutput,
	PurgeQueueCommandOutput
> {
	constructor(input: SqsbPurgeQueueCommandInput) {
		super(input);
	}

	handleInput = async ({}: SqsBoostClientConfig): Promise<PurgeQueueCommandInput> => capitalizeKeys(this.input);

	handleOutput = async (
		output: PurgeQueueCommandOutput,
		{}: SqsBoostClientConfig
	): Promise<SqsbPurgeQueueCommandOutput> => output;

	send = async (clientConfig: SqsBoostClientConfig) => {
		const input = await this.handleInput(clientConfig);

		const output = await clientConfig.client.send(new PurgeQueueCommand(input));

		return this.handleOutput(output, clientConfig);
	};
}
