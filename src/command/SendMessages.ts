import { SqsbCommand } from './Command';
import { LowerCaseObjectKeys, lowerCaseKeys, upperCaseKeys } from '../util/keyCapitalize';
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
	extends LowerCaseObjectKeys<
		Omit<SendMessageBatchRequestEntry, 'Id' | 'MessageBody' | 'MessageDeduplicationId' | 'MessageGroupId'>
	> {
	body: Attributes;
	deduplicationId?: string;
	groupId?: string;
}

export interface SqsbSendMessagesCommandInput<Attributes extends object = object>
	extends LowerCaseObjectKeys<Omit<SendMessageBatchCommandInput, 'Entries'>> {
	messages: Array<SqsbSendMessagesCommandInputMessage<Attributes>>;
}

export interface SqsbSendMessagesCommandOutput<Attributes extends object = object>
	extends LowerCaseObjectKeys<Omit<SendMessageBatchCommandOutput, '$metadata' | 'Successful' | 'Failed'>> {
	$metadatas: Array<SendMessageBatchCommandOutput['$metadata']>;
	messages: Array<
		SqsbSendMessagesCommandInputMessage<Attributes> &
			LowerCaseObjectKeys<
				Omit<
					SendMessageBatchResultEntry,
					'Id' | 'MD5OfMessageBody' | 'MD5OfMessageAttributes' | 'MD5OfMessageSystemAttributes'
				>
			> & { md5: string; md5OfMessageAttributes?: string; md5OfMessageSystemAttributes?: string }
	>;
	errors: Array<
		SqsbSendMessagesCommandInputMessage<Attributes> & LowerCaseObjectKeys<Omit<BatchResultErrorEntry, 'Id'>>
	>;
}

export class SqsbSendMessagesCommand<Attributes extends object = object> extends SqsbCommand<
	SqsbSendMessagesCommandInput<Attributes>,
	SendMessageBatchCommandInput,
	SqsbSendMessagesCommandOutput<Attributes>,
	SendMessageBatchCommandOutput
> {
	#messageKeys = [
		'body',
		'delaySeconds',
		'messageAttributes',
		'messageSystemAttributes',
		'deduplicationId',
		'groupId'
	] as const;

	messageMap: Map<string, SqsbSendMessagesCommandInputMessage<Attributes>>;

	constructor(input: SqsbSendMessagesCommandInput<Attributes>) {
		super(input);

		this.messageMap = new Map(this.input.messages.map(message => [randomString(10), pick(message, this.#messageKeys)]));
	}

	handleInput = async ({}: SqsBoostClientConfig): Promise<SendMessageBatchCommandInput> => {
		const { messages, ...rest } = this.input;

		const entries = [...this.messageMap.entries()].map(([id, { body, deduplicationId, groupId, ...messageRest }]) =>
			upperCaseKeys({
				id,
				messageBody: JSON.stringify(body),
				messageDeduplicationId: deduplicationId,
				messageGroupId: groupId,
				...messageRest
			})
		);

		const upperCaseInput = upperCaseKeys({ entries, ...rest });

		return upperCaseInput;
	};

	handleOutput = async (
		output: SendMessageBatchCommandOutput,
		{}: SqsBoostClientConfig
	): Promise<SqsbSendMessagesCommandOutput<Attributes>> => {
		const lowerCaseOutput = lowerCaseKeys(output);

		const { $metadata, successful, failed, ...rest } = lowerCaseOutput;

		const messages = (successful || [])
			.map(success => {
				const { Id, MD5OfMessageBody, MD5OfMessageAttributes, MD5OfMessageSystemAttributes, ...successRest } = success;

				if (!Id || !MD5OfMessageBody) return undefined;

				const message = this.messageMap.get(Id);

				if (!message) return undefined;

				return {
					...message,
					md5: MD5OfMessageBody,
					md5OfMessageAttributes: MD5OfMessageAttributes,
					md5OfMessageSystemAttributes: MD5OfMessageSystemAttributes,
					...lowerCaseKeys(successRest)
				};
			})
			.filter(isNotNullish);

		const errors = (failed || [])
			.map(fail => {
				if (!fail.Id) return undefined;

				const message = this.messageMap.get(fail.Id);

				if (!message) return undefined;

				return {
					...message,
					...lowerCaseKeys(fail)
				};
			})
			.filter(isNotNullish);

		const formattedOutput: SqsbSendMessagesCommandOutput<Attributes> = {
			$metadatas: [$metadata],
			messages,
			errors,
			...rest
		};

		return formattedOutput;
	};

	send = async (clientConfig: SqsBoostClientConfig) => {
		const input = await this.handleInput(clientConfig);

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
				messages: [...result.messages, ...nextResult.messages],
				errors: [...result.errors, ...nextResult.errors]
			};
		};

		return recurse(input.Entries!);
	};
}
