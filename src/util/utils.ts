import { createHash } from 'crypto';

export const isNotNullish = <T>(i: T): i is NonNullable<T> => !!i;

type Log = (message: unknown) => void;

export interface ILogger {
	warn: Log;
	error: Log;
	info: Log;
	log: Log;
}

export const arrayOfLength = (length: number) =>
	Array.apply(null, Array(Math.max(Math.round(length), 0))).map(() => {});

export const hash = (values: Array<any>, size: number = 21) => {
	const hash = createHash('sha256');

	for (const value of values) {
		hash.update(value);
	}

	const hashValue = hash.end().read();

	return (hashValue.toString('base64url') as string).split('-').join('').split('_').join('').slice(0, size) || '';
};

export const randomNumber = () => Math.round(Math.random() * Number.MAX_SAFE_INTEGER);
export const randomString = (size?: number) => hash([randomNumber().toString()], size);
