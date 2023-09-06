import { SqsbCommand } from './Command';
import { SqsBoostClientConfig } from '../Client';
import { isNotNullish, randomString } from '../util/utils';
import {
	SendMessageBatchCommandInput,
	SendMessageBatchCommandOutput,
	SendMessageBatchRequestEntry,
	SendMessageBatchResultEntry,
	BatchResultErrorEntry,
	SendMessageBatchCommand
} from '@aws-sdk/client-sqs';
import { pick } from '../util/pick';

export interface SqsbSendMessagesCommandInputMessage<Attributes extends object = object>
	extends Omit<SendMessageBatchRequestEntry, 'Id' | 'MessageBody'> {
	MessageBody: Attributes;
}

export interface SqsbSendMessagesCommandInput<Attributes extends object = object>
	extends Omit<SendMessageBatchCommandInput, 'Entries'> {
	Entries: Array<SqsbSendMessagesCommandInputMessage<Attributes>>;
}

export interface SqsbSendMessagesCommandOutput<Attributes extends object = object>
	extends Omit<SendMessageBatchCommandOutput, '$metadata' | 'Successful' | 'Failed'> {
	$metadatas: Array<SendMessageBatchCommandOutput['$metadata']>;
	Successful: Array<SqsbSendMessagesCommandInputMessage<Attributes> & Omit<SendMessageBatchResultEntry, 'Id'>>;
	Failed: Array<SqsbSendMessagesCommandInputMessage<Attributes> & Omit<BatchResultErrorEntry, 'Id'>>;
}

export class SqsbSendMessagesCommand<Attributes extends object = object> extends SqsbCommand<
	SqsbSendMessagesCommandInput<Attributes>,
	SendMessageBatchCommandInput,
	SqsbSendMessagesCommandOutput<Attributes>,
	SendMessageBatchCommandOutput
> {
	#messageKeys = [
		'MessageBody',
		'DelaySeconds',
		'MessageAttributes',
		'MessageSystemAttributes',
		'MessageDeduplicationId',
		'MessageGroupId'
	] as const;

	messageMap: Map<string, SqsbSendMessagesCommandInputMessage<Attributes>>;

	constructor(input: SqsbSendMessagesCommandInput<Attributes>) {
		super(input);

		this.messageMap = new Map(this.input.Entries.map(message => [randomString(10), pick(message, this.#messageKeys)]));
	}

	handleInput = async ({}: SqsBoostClientConfig): Promise<SendMessageBatchCommandInput> => {
		const { Entries: _, ...rest } = this.input;

		const Entries = [...this.messageMap.entries()].map(([Id, { MessageBody, ...messageRest }]) => ({
			Id,
			MessageBody: JSON.stringify(MessageBody),
			...messageRest
		}));

		return { Entries, ...rest };
	};

	handleOutput = async (
		output: SendMessageBatchCommandOutput,
		{}: SqsBoostClientConfig
	): Promise<SqsbSendMessagesCommandOutput<Attributes>> => {
		const { $metadata, Successful: RawSuccessful, Failed: RawFailed, ...rest } = output;

		const Successful = (RawSuccessful || [])
			.map(success => {
				const { Id, ...successRest } = success;

				if (!Id) return undefined;

				const message = this.messageMap.get(Id);

				if (!message) return undefined;

				return {
					...message,
					...successRest
				};
			})
			.filter(isNotNullish);

		const Failed = (RawFailed || [])
			.map(fail => {
				if (!fail.Id) return undefined;

				const message = this.messageMap.get(fail.Id);

				if (!message) return undefined;

				return {
					...message,
					...fail
				};
			})
			.filter(isNotNullish);

		const formattedOutput: SqsbSendMessagesCommandOutput<Attributes> = {
			$metadatas: [$metadata],
			Successful,
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
				Successful: [],
				Failed: []
			};

		const recurse = async (
			remainingEntries: Array<SendMessageBatchRequestEntry>
		): Promise<SqsbSendMessagesCommandOutput<Attributes>> => {
			const currentEntries = remainingEntries.slice(0, 10);
			const nextEntries = remainingEntries.slice(10);

			const output = await clientConfig.client.send(
				new SendMessageBatchCommand({
					...input,
					Entries: currentEntries
				})
			);

			const result = await this.handleOutput(output, clientConfig);

			if (nextEntries.length === 0) return result;

			const nextResult = await recurse(nextEntries);

			return {
				$metadatas: [...result.$metadatas, ...nextResult.$metadatas],
				Successful: [...result.Successful, ...nextResult.Successful],
				Failed: [...result.Failed, ...nextResult.Failed]
			};
		};

		return recurse(input.Entries);
	};
}
