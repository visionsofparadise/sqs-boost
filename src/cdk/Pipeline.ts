import { SecretValue, Stack, StackProps } from 'aws-cdk-lib';
import { BuildEnvironmentVariableType } from 'aws-cdk-lib/aws-codebuild';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { CodeBuildStep, CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
import { Construct } from 'constructs';
import { serviceName } from './App';
import { SQSBoostStage } from './Stage';

export class SQSBoostPipelineStack extends Stack {
	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		const source = CodePipelineSource.gitHub(`visionsofparadise/${serviceName}`, 'main', {
			authentication: SecretValue.secretsManager('GITHUB_TOKEN')
		});

		const pipeline = new CodePipeline(this, 'pipeline', {
			synth: new ShellStep('synth', {
				input: source,
				installCommands: ['npm ci'],
				commands: ['npx cdk synth']
			})
		});

		const testApp = new SQSBoostStage(this, 'testStage', {
			stage: 'test',
			env: {
				region: process.env.CDK_DEFAULT_REGION,
				account: process.env.CDK_DEFAULT_ACCOUNT
			}
		});

		const testStage = pipeline.addStage(testApp);

		const unitTestStep = new ShellStep('unitTest', {
			input: source,
			installCommands: ['npm ci'],
			commands: ['npm run check', 'npm run test']
		});

		testStage.addPre(unitTestStep);

		const testingPolicyStatement = new PolicyStatement({
			effect: Effect.ALLOW,
			resources: ['*'],
			actions: ['sqs:SendMessage', 'sqs:ReceiveMessage', 'sqs:DeleteMessage', 'sqs:PurgeQueue']
		});

		const integrationTestStep = new CodeBuildStep('integrationTest', {
			commands: ['npm ci', 'export INTEGRATION_TEST=true', 'npm run test'],
			rolePolicyStatements: [testingPolicyStatement],
			envFromCfnOutputs: {
				QUEUE_URL: testApp.queueUrl,
				PURGE_QUEUE_URL: testApp.purgeQueueUrl
			}
		});

		const publishStep = new CodeBuildStep('publish', {
			input: source,
			commands: [
				'npm ci',
				'npm run build:cjs',
				'npm run build:es',
				'npm run build:types',
				'npm config set //registry.npmjs.org/:_authToken ${NPM_TOKEN}',
				'npm run patch'
			],
			buildEnvironment: {
				environmentVariables: {
					NPM_TOKEN: {
						type: BuildEnvironmentVariableType.SECRETS_MANAGER,
						value: 'NPM_TOKEN'
					}
				}
			}
		});

		publishStep.addStepDependency(integrationTestStep);

		testStage.addPost(integrationTestStep, publishStep);
	}
}
