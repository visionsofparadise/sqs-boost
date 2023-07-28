import { ILogger } from './util/utils';
import { SQSClient } from '@aws-sdk/client-sqs';
import { SqsBoostClient } from './Client';
import { SqsbSendMessagesCommandInputMessage } from './command/SendMessages';

export type MessagesIterator<Attributes extends object = object> = (
	body: Attributes,
	index: number
) => Omit<SqsbSendMessagesCommandInputMessage<Attributes>, 'body'>;

export interface QueueConfig {
	url: string;
	client: SQSClient;
	logger?: ILogger;
}

export class Queue<Attributes extends object = object> {
	client: SQSClient;
	sqsxClient: SqsBoostClient;

	url: string;

	constructor(public config: QueueConfig, public messagesIterator?: MessagesIterator<Attributes>) {
		this.client = config.client;
		this.sqsxClient = new SqsBoostClient(this.client);

		this.url = config.url;
	}
}
