import { SQSEvent } from 'aws-lambda';
import { Queue } from '../Queue';
import { Message } from '@aws-sdk/client-sqs';
import { lowerCaseKeys } from '../util/keyCapitalize';

export const convertLambdaMessages = <Attributes extends object = object>(
	_: Queue<Attributes>,
	lambdaMessages: SQSEvent['Records']
) =>
	lambdaMessages.map(({ body, md5OfBody, ...rest }) => {
		return {
			body: JSON.parse(body) as Attributes,
			md5: md5OfBody,
			...rest
		};
	});

export const convertMessages = <Attributes extends object = object>(_: Queue<Attributes>, messages: Array<Message>) =>
	messages.map(({ Body, MD5OfBody, MD5OfMessageAttributes, ...rest }) => {
		return {
			body: JSON.parse(Body!) as Attributes,
			md5: MD5OfBody!,
			md5OfMessageAttributes: MD5OfMessageAttributes,
			...lowerCaseKeys(rest)
		};
	});
