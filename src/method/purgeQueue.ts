import { Queue } from '../Queue';
import { SqsbPurgeQueueCommand, SqsbPurgeQueueCommandOutput } from '../command/PurgeQueue';

export const purgeQueue = async <Attributes extends object = object>(
	Queue: Queue<Attributes>
): Promise<SqsbPurgeQueueCommandOutput> =>
	Queue.sqsxClient.send(
		new SqsbPurgeQueueCommand({
			queueUrl: Queue.url
		})
	);
