import { TestMessage } from '../QueueTest.dev';
import { TestSqsClient, TestSqsbClient } from '../ClientTest.dev';
import { SqsbPurgeQueueCommand } from './PurgeQueue';
import { arrayOfLength, randomString } from '../util/utils';
import { ReceiveMessageCommand, SendMessageBatchCommand } from '@aws-sdk/client-sqs';

export const PURGE_QUEUE_URL = process.env.QUEUE_URL || 'test';

it('receives 20 messages', async () => {
	const messages: Array<TestMessage> = arrayOfLength(20).map(() => ({
		string: randomString()
	}));

	await TestSqsClient.send(
		new SendMessageBatchCommand({
			QueueUrl: PURGE_QUEUE_URL,
			Entries: messages.slice(0, 10).map(message => ({ Id: message.string, MessageBody: JSON.stringify(message) }))
		})
	);

	await TestSqsClient.send(
		new SendMessageBatchCommand({
			QueueUrl: PURGE_QUEUE_URL,
			Entries: messages.slice(10).map(message => ({ Id: message.string, MessageBody: JSON.stringify(message) }))
		})
	);

	await TestSqsbClient.send(
		new SqsbPurgeQueueCommand({
			queueUrl: PURGE_QUEUE_URL
		})
	);

	const messagesReceived = await TestSqsClient.send(
		new ReceiveMessageCommand({
			QueueUrl: PURGE_QUEUE_URL,
			MaxNumberOfMessages: 10
		})
	);

	expect(messagesReceived.Messages).toBeUndefined();
});
