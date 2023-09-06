import { TestMessage } from '../QueueTest.dev';
import { QUEUE_URL, TestSqsbClient } from '../ClientTest.dev';
import { SqsbSendMessagesCommand } from './SendMessages';
import { arrayOfLength } from '../util/utils';

it('sends a message', async () => {
	const message: TestMessage = {
		string: 'test'
	};

	const result = await TestSqsbClient.send(
		new SqsbSendMessagesCommand({
			QueueUrl: QUEUE_URL,
			Entries: [{ MessageBody: message }]
		})
	);

	expect(result.Successful.length).toBe(1);
	expect(result.Failed.length).toBe(0);
});

it('sends 20 messages', async () => {
	const messages: Array<TestMessage> = arrayOfLength(20).map(() => ({
		string: 'test'
	}));

	const result = await TestSqsbClient.send(
		new SqsbSendMessagesCommand({
			QueueUrl: QUEUE_URL,
			Entries: messages.map(message => ({ MessageBody: message }))
		})
	);

	expect(result.Successful.length).toBe(20);
	expect(result.Failed.length).toBe(0);
});
