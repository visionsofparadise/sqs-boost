import { Queue } from '../Queue';
import { SqsbDeleteMessagesCommand, SqsbDeleteMessagesCommandOutput } from '../command/DeleteMessages';

export const deleteMessages = async <Attributes extends object = object>(
	Queue: Queue<Attributes>,
	receiptHandles: Array<string | { ReceiptHandle: string }>
): Promise<SqsbDeleteMessagesCommandOutput> =>
	Queue.sqsxClient.send(
		new SqsbDeleteMessagesCommand({
			QueueUrl: Queue.url,
			Entries: receiptHandles
		})
	);
