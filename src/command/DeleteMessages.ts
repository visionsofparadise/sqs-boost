import { SqsbCommand } from './Command';
import { LowerCaseObjectKeys, lowerCaseKeys, upperCaseKeys } from '../util/keyCapitalize';
import { SqsBoostClientConfig } from '../Client';
import {
	DeleteMessageBatchCommandInput,
	DeleteMessageBatchCommandOutput,
	DeleteMessageBatchRequestEntry,
	BatchResultErrorEntry,
	DeleteMessageBatchCommand
} from '@aws-sdk/client-sqs';
import { isNotNullish, randomString } from '../util/utils';

export interface SqsbDeleteMessagesCommandInputMessage
	extends LowerCaseObjectKeys<Omit<DeleteMessageBatchRequestEntry, 'Id'>> {}

export interface SqsbDeleteMessagesCommandInput
	extends LowerCaseObjectKeys<Omit<DeleteMessageBatchCommandInput, 'Entries'>> {
	messages: Array<string | SqsbDeleteMessagesCommandInputMessage>;
}

export interface SqsbDeleteMessagesCommandOutput
	extends LowerCaseObjectKeys<Omit<DeleteMessageBatchCommandOutput, '$metadata' | 'Successful' | 'Failed'>> {
	$metadatas: Array<DeleteMessageBatchCommandOutput['$metadata']>;
	errors: Array<SqsbDeleteMessagesCommandInputMessage & LowerCaseObjectKeys<Omit<BatchResultErrorEntry, 'Id'>>>;
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
			this.input.messages.map(message => [
				randomString(10),
				typeof message === 'string' ? { receiptHandle: message } : message
			])
		);
	}

	handleInput = async ({}: SqsBoostClientConfig): Promise<DeleteMessageBatchCommandInput> => {
		const { messages, ...rest } = this.input;

		const entries = [...this.receiptHandleMap.entries()].map(([id, { receiptHandle }]) =>
			upperCaseKeys({
				id,
				receiptHandle
			})
		);

		const upperCaseInput = upperCaseKeys({ entries, ...rest });

		return upperCaseInput;
	};

	handleOutput = async (
		output: DeleteMessageBatchCommandOutput,
		{}: SqsBoostClientConfig
	): Promise<SqsbDeleteMessagesCommandOutput> => {
		const lowerCaseOutput = lowerCaseKeys(output);

		const { $metadata, successful, failed, ...rest } = lowerCaseOutput;

		const errors = (failed || [])
			.map(fail => {
				if (!fail.Id) return undefined;

				const message = this.receiptHandleMap.get(fail.Id);

				if (!message) return undefined;

				return {
					...message,
					...lowerCaseKeys(fail)
				};
			})
			.filter(isNotNullish);

		const formattedOutput: SqsbDeleteMessagesCommandOutput = {
			$metadatas: [$metadata],
			errors,
			...rest
		};

		return formattedOutput;
	};

	send = async (clientConfig: SqsBoostClientConfig) => {
		const input = await this.handleInput(clientConfig);

		if (!input.Entries || input.Entries.length === 0)
			return {
				$metadatas: [],
				errors: []
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
				errors: [...result.errors, ...nextResult.errors]
			};
		};

		return recurse(input.Entries);
	};
}
