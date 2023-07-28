import { Queue } from './Queue';
import { QUEUE_URL, TestSqsClient } from './ClientTest.dev';

export interface TestMessage {
	string: string;
}

export const TestQueue = new Queue<TestMessage>({
	client: TestSqsClient,
	url: QUEUE_URL
});
