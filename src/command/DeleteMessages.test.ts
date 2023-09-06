import { TestMessage } from '../QueueTest.dev';
import { QUEUE_URL, TestSqsClient, TestSqsbClient } from '../ClientTest.dev';
import { SqsbDeleteMessagesCommand } from './DeleteMessages';
import { arrayOfLength, randomString } from '../util/utils';
import { ReceiveMessageCommand, SendMessageBatchCommand } from '@aws-sdk/client-sqs';

it('deletes 20 messages', async () => {
	const messages: Array<TestMessage> = arrayOfLength(20).map(() => ({
		string: randomString()
	}));

	await TestSqsClient.send(
		new SendMessageBatchCommand({
			QueueUrl: QUEUE_URL,
			Entries: messages.slice(0, 10).map(message => ({ Id: message.string, MessageBody: JSON.stringify(message) }))
		})
	);

	await TestSqsClient.send(
		new SendMessageBatchCommand({
			QueueUrl: QUEUE_URL,
			Entries: messages.slice(10).map(message => ({ Id: message.string, MessageBody: JSON.stringify(message) }))
		})
	);

	const messages1 = await TestSqsClient.send(
		new ReceiveMessageCommand({
			QueueUrl: QUEUE_URL,
			MaxNumberOfMessages: 10
		})
	);

	const messages2 = await TestSqsClient.send(
		new ReceiveMessageCommand({
			QueueUrl: QUEUE_URL,
			MaxNumberOfMessages: 10
		})
	);

	const result = await TestSqsbClient.send(
		new SqsbDeleteMessagesCommand({
			QueueUrl: QUEUE_URL,
			Entries: [
				...messages1.Messages!.map(m => m.ReceiptHandle!),
				...messages2.Messages!.map(m => ({ ReceiptHandle: m.ReceiptHandle! }))
			]
		})
	);

	expect(result.Failed.length).toBe(0);
});
