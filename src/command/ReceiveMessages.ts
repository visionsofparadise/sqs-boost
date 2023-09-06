import { SqsbCommand } from './Command';
import { SqsBoostClientConfig } from '../Client';
import {
	ReceiveMessageCommandInput,
	ReceiveMessageCommandOutput,
	ReceiveMessageCommand,
	Message
} from '@aws-sdk/client-sqs';

export interface SqsbReceiveMessagesCommandInput extends ReceiveMessageCommandInput {}

export interface SqsbReceiveMessagesCommandOutput<Attributes extends object = object>
	extends Omit<ReceiveMessageCommandOutput, '$metadata' | 'Messages'> {
	$metadatas: Array<ReceiveMessageCommandOutput['$metadata']>;
	Messages: Array<
		Required<Pick<Message, 'MessageId' | 'ReceiptHandle'>> &
			Omit<Message, 'MessageId' | 'ReceiptHandle' | 'Body'> & {
				Body: Attributes;
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

	handleInput = async ({}: SqsBoostClientConfig): Promise<ReceiveMessageCommandInput> => this.input;

	handleOutput = async (
		output: ReceiveMessageCommandOutput,
		{}: SqsBoostClientConfig
	): Promise<SqsbReceiveMessagesCommandOutput<Attributes>> => {
		const { $metadata, Messages } = output;

		const typedOutput: SqsbReceiveMessagesCommandOutput<Attributes> = {
			$metadatas: [$metadata],
			Messages: (Messages || [])
				.filter(
					(
						message
					): message is Required<Pick<typeof message, 'MessageId' | 'ReceiptHandle' | 'Body' | 'MD5OfBody'>> &
						Omit<typeof message, 'MessageId' | 'ReceiptHandle' | 'Body' | 'MD5OfBody'> =>
						!!message.MessageId && !!message.ReceiptHandle && !!message.Body && !!message.MD5OfBody
				)
				.map(message => {
					const { Body, ...messageRest } = message;

					const typedBody = JSON.parse(Body) as Attributes;

					return {
						Body: typedBody,
						...messageRest
					};
				})
		};

		return typedOutput;
	};

	send = async (clientConfig: SqsBoostClientConfig) => {
		const input = await this.handleInput(clientConfig);

		if (input.MaxNumberOfMessages && input.MaxNumberOfMessages < 1)
			return {
				$metadatas: [],
				Messages: []
			};

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

			if (nextCount === 0 || result.Messages.length < currentCount) return result;

			const nextResult = await recurse(nextCount);

			return {
				$metadatas: [...result.$metadatas, ...nextResult.$metadatas],
				Messages: [...result.Messages, ...nextResult.Messages]
			};
		};

		return recurse(input.MaxNumberOfMessages || 10);
	};
}
