import { Queue } from '../Queue';
import { SqsbDeleteMessagesCommand, SqsbDeleteMessagesCommandOutput } from '../command/DeleteMessages';

export const deleteMessages = async <Attributes extends object = object>(
	Queue: Queue<Attributes>,
	receiptHandles: Array<string | { receiptHandle: string }>
): Promise<SqsbDeleteMessagesCommandOutput> =>
	Queue.sqsxClient.send(
		new SqsbDeleteMessagesCommand({
			queueUrl: Queue.url,
			messages: receiptHandles
		})
	);
