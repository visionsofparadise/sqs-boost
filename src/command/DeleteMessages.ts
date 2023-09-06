import { SqsbCommand } from './Command';
import { SqsBoostClientConfig } from '../Client';
import {
	DeleteMessageBatchCommandInput,
	DeleteMessageBatchCommandOutput,
	DeleteMessageBatchRequestEntry,
	BatchResultErrorEntry,
	DeleteMessageBatchCommand
} from '@aws-sdk/client-sqs';
import { isNotNullish, randomString } from '../util/utils';

export interface SqsbDeleteMessagesCommandInputMessage extends Omit<DeleteMessageBatchRequestEntry, 'Id'> {}

export interface SqsbDeleteMessagesCommandInput extends Omit<DeleteMessageBatchCommandInput, 'Entries'> {
	Entries: Array<string | SqsbDeleteMessagesCommandInputMessage>;
}

export interface SqsbDeleteMessagesCommandOutput
	extends Omit<DeleteMessageBatchCommandOutput, '$metadata' | 'Successful' | 'Failed'> {
	$metadatas: Array<DeleteMessageBatchCommandOutput['$metadata']>;
	Failed: Array<SqsbDeleteMessagesCommandInputMessage & Omit<BatchResultErrorEntry, 'Id'>>;
}

export class SqsbDeleteMessagesCommand extends SqsbCommand<
	SqsbDeleteMessagesCommandInput,
	DeleteMessageBatchCommandInput,
	SqsbDeleteMessagesCommandOutput,
	DeleteMessageBatchCommandOutput
> {
	receiptHandleMap: Map<string, SqsbDeleteMessagesCommandInputMessage>;

	constructor(input: SqsbDeleteMessagesCommandInput) {
		super(input);

		this.receiptHandleMap = new Map(
			this.input.Entries.map(entry => [randomString(10), typeof entry === 'string' ? { ReceiptHandle: entry } : entry])
		);
	}

	handleInput = async ({}: SqsBoostClientConfig): Promise<DeleteMessageBatchCommandInput> => {
		const { Entries: _, ...rest } = this.input;

		const Entries = [...this.receiptHandleMap.entries()].map(([Id, { ReceiptHandle }]) => ({
			Id,
			ReceiptHandle
		}));

		return { Entries, ...rest };
	};

	handleOutput = async (
		output: DeleteMessageBatchCommandOutput,
		{}: SqsBoostClientConfig
	): Promise<SqsbDeleteMessagesCommandOutput> => {
		const { $metadata, Successful, Failed: UnlinkedFailed, ...rest } = output;

		const Failed = (UnlinkedFailed || [])
			.map(fail => {
				if (!fail.Id) return undefined;

				const message = this.receiptHandleMap.get(fail.Id);

				if (!message) return undefined;

				return {
					...message,
					...fail
				};
			})
			.filter(isNotNullish);

		const formattedOutput: SqsbDeleteMessagesCommandOutput = {
			$metadatas: [$metadata],
			Failed,
			...rest
		};

		return formattedOutput;
	};

	send = async (clientConfig: SqsBoostClientConfig) => {
		const input = await this.handleInput(clientConfig);

		if (!input.Entries || input.Entries.length === 0)
			return {
				$metadatas: [],
				Failed: []
			};

		const recurse = async (
			remainingEntries: Array<DeleteMessageBatchRequestEntry>
		): Promise<SqsbDeleteMessagesCommandOutput> => {
			const currentEntries = remainingEntries.slice(0, 10);
			const nextEntries = remainingEntries.slice(10);

			const output = await clientConfig.client.send(
				new DeleteMessageBatchCommand({
					...input,
					Entries: currentEntries
				})
			);

			const result = await this.handleOutput(output, clientConfig);

			if (nextEntries.length === 0) return result;

			const nextResult = await recurse(nextEntries);

			return {
				$metadatas: [...result.$metadatas, ...nextResult.$metadatas],
				Failed: [...result.Failed, ...nextResult.Failed]
			};
		};

		return recurse(input.Entries);
	};
}
