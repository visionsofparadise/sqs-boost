import { TestMessage, TestQueue } from '../QueueTest.dev';
import { sendMessages } from './sendMessages';
import { arrayOfLength } from '../util/utils';

it('sends a message', async () => {
	const message: TestMessage = {
		string: 'test'
	};

	const result = await sendMessages(TestQueue, [message]);

	expect(result.Successful.length).toBe(1);
	expect(result.Failed.length).toBe(0);
});

it('sends 20 messages', async () => {
	const messages: Array<TestMessage> = arrayOfLength(20).map(() => ({
		string: 'test'
	}));

	const result = await sendMessages(TestQueue, messages);

	expect(result.Successful.length).toBe(20);
	expect(result.Failed.length).toBe(0);
});
