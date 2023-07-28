import { CfnOutput, Stage, StageProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { serviceName } from './App';
import { SQSBoostStack } from './Stack';

export class SQSBoostStage extends Stage {
	public readonly queueUrl: CfnOutput;
	public readonly purgeQueueUrl: CfnOutput;

	constructor(scope: Construct, id: string, props: StageProps & { stage: string }) {
		super(scope, id, props);

		const deploymentName = `${serviceName}-${props.stage}`;

		const stack = new SQSBoostStack(this, `${deploymentName}-stack`, {
			stage: props.stage,
			deploymentName,
			env: {
				region: process.env.CDK_DEFAULT_REGION,
				account: process.env.CDK_DEFAULT_ACCOUNT
			}
		});

		this.queueUrl = stack.queueUrl;
		this.purgeQueueUrl = stack.purgeQueueUrl;
	}
}
