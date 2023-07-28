import { MessagesIterator, Queue } from '../Queue';
import { SqsbSendMessagesCommand, SqsbSendMessagesCommandOutput } from '../command/SendMessages';

export const sendMessages = async <Attributes extends object = object>(
	Queue: Queue<Attributes>,
	messages: Array<Attributes>,
	messagesIterator?: MessagesIterator<Attributes>
): Promise<SqsbSendMessagesCommandOutput<Attributes>> => {
	const iterator = messagesIterator || Queue.messagesIterator;

	return Queue.sqsxClient.send(
		new SqsbSendMessagesCommand({
			queueUrl: Queue.url,
			messages: messages.map((body, index) => {
				return {
					body,
					...(iterator ? iterator(body, index) : {})
				};
			})
		})
	);
};
