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
			QueueUrl: Queue.url,
			Entries: messages.map((MessageBody, index) => {
				return {
					MessageBody,
					...(iterator ? iterator(MessageBody, index) : {})
				};
			})
		})
	);
};
