import { SQSClient } from '@aws-sdk/client-sqs';
import { SqsbCommand } from './command/Command';
import { ILogger } from './util/utils';

export interface SqsBoostClientConfig {
	client: SQSClient;
	logger?: ILogger;
}

export class SqsBoostClient implements SqsBoostClientConfig {
	logger?: ILogger;

	constructor(public client: SQSClient) {}

	setClient = (client?: SQSClient) => {
		if (client) this.client = client;
	};

	setLogger = (logger?: ILogger) => {
		if (logger) this.logger = logger;
	};

	send = async <Command extends SqsbCommand<any, any, any, any>>(
		command: Command
	): Promise<ReturnType<Command['send']>> => {
		return command.send({
			client: this.client
		});
	};
}
