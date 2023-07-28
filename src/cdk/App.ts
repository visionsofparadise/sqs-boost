#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SQSBoostPipelineStack } from './Pipeline';

export const serviceName = 'sqs-boost';

const app = new cdk.App();

new SQSBoostPipelineStack(app, 'SQSBoostPipelineStack', {
	env: {
		region: process.env.CDK_DEFAULT_REGION,
		account: process.env.CDK_DEFAULT_ACCOUNT
	}
});
