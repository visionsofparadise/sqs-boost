import { SQSClient } from '@aws-sdk/client-sqs';
import { SQSMock } from 'sqs-mock';
import { SqsBoostClient } from './Client';

export const isTest = process.env.JEST_WORKER_ID && !process.env.INTEGRATION;
export const QUEUE_URL = process.env.QUEUE_URL || 'test';

export const TestSqsClient = !isTest ? new SQSClient({}) : (new SQSMock() as any as SQSClient);

export const TestSqsbClient = new SqsBoostClient(TestSqsClient);
