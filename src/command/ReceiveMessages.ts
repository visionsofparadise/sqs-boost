import { SqsbCommand } from './Command';
import { LowerCaseObjectKeys, lowerCaseKeys, upperCaseKeys } from '../util/keyCapitalize';
import { SqsBoostClientConfig } from '../Client';
import {
	ReceiveMessageCommandInput,
	ReceiveMessageCommandOutput,
	ReceiveMessageCommand,
	Message
} from '@aws-sdk/client-sqs';

export interface SqsbReceiveMessagesCommandInput extends LowerCaseObjectKeys<ReceiveMessageCommandInput> {}

export interface SqsbReceiveMessagesCommandOutput<Attributes extends object = object>
	extends LowerCaseObjectKeys<Omit<ReceiveMessageCommandOutput, '$metadata' | 'Messages'>> {
	$metadatas: Array<ReceiveMessageCommandOutput['$metadata']>;
	messages: Array<
		LowerCaseObjectKeys<
			Required<Pick<Message, 'MessageId' | 'ReceiptHandle'>> &
				Omit<Message, 'MessageId' | 'ReceiptHandle' | 'Body' | 'MD5OfBody' | 'MD5OfMessageAttributes'>
		> & {
			body: Attributes;
			md5: string;
			md5OfMessageAttributes?: string;
		}
	>;
}

export class SqsbReceiveMessagesCommand<Attributes extends object = object> extends SqsbCommand<
	SqsbReceiveMessagesCommandInput,
	ReceiveMessageCommandInput,
	SqsbReceiveMessagesCommandOutput<Attributes>,
	ReceiveMessageCommandOutput
> {
	constructor(input: SqsbReceiveMessagesCommandInput) {
		super(input);
	}

	handleInput = async ({}: SqsBoostClientConfig): Promise<ReceiveMessageCommandInput> => upperCaseKeys(this.input);

	handleOutput = async (
		output: ReceiveMessageCommandOutput,
		{}: SqsBoostClientConfig
	): Promise<SqsbReceiveMessagesCommandOutput<Attributes>> => {
		const lowerCaseOutput = lowerCaseKeys(output);

		const { $metadata, messages } = lowerCaseOutput;

		const formattedOutput: SqsbReceiveMessagesCommandOutput<Attributes> = {
			$metadatas: [$metadata],
			messages: (messages || [])
				.filter(
					(
						message
					): message is Required<Pick<typeof message, 'MessageId' | 'ReceiptHandle' | 'Body' | 'MD5OfBody'>> &
						Omit<typeof message, 'MessageId' | 'ReceiptHandle' | 'Body' | 'MD5OfBody'> =>
						!!message.MessageId && !!message.ReceiptHandle && !!message.Body && !!message.MD5OfBody
				)
				.map(message => {
					const { Body, MD5OfBody, MD5OfMessageAttributes, ...messageRest } = message;

					const body = JSON.parse(Body) as Attributes;

					return {
						body,
						md5: MD5OfBody,
						md5OfMessageAttributes: MD5OfMessageAttributes,
						...lowerCaseKeys(messageRest)
					};
				})
		};

		return formattedOutput;
	};

	send = async (clientConfig: SqsBoostClientConfig) => {
		const input = await this.handleInput(clientConfig);

		const recurse = async (remainingCount: number): Promise<SqsbReceiveMessagesCommandOutput<Attributes>> => {
			const currentCount = Math.min(remainingCount, 10);
			const nextCount = remainingCount - currentCount;

			const output = await clientConfig.client.send(
				new ReceiveMessageCommand({
					...input,
					MaxNumberOfMessages: currentCount
				})
			);

			const result = await this.handleOutput(output, clientConfig);

			if (nextCount === 0 || result.messages.length < currentCount) return result;

			const nextResult = await recurse(nextCount);

			return {
				$metadatas: [...result.$metadatas, ...nextResult.$metadatas],
				messages: [...result.messages, ...nextResult.messages]
			};
		};

		return recurse(input.MaxNumberOfMessages || 10);
	};
}
