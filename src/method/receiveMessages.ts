import { Queue } from '../Queue';
import {
	SqsbReceiveMessagesCommand,
	SqsbReceiveMessagesCommandInput,
	SqsbReceiveMessagesCommandOutput
} from '../command/ReceiveMessages';

export const receiveMessages = async <Attributes extends object = object>(
	Queue: Queue<Attributes>,
	count: number,
	input?: Omit<SqsbReceiveMessagesCommandInput, 'maxNumberOfMessages'>
): Promise<SqsbReceiveMessagesCommandOutput<Attributes>> =>
	Queue.sqsxClient.send(
		new SqsbReceiveMessagesCommand<Attributes>({
			queueUrl: Queue.url,
			maxNumberOfMessages: count,
			...input
		})
	);
