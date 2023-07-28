import { O } from 'ts-toolbelt';

type RequiredObjectPart<T extends object> = Pick<T, O.RequiredKeys<T>>;
type OptionalObjectPart<T extends object> = Pick<T, O.OptionalKeys<T>>;

export type LowerCaseObjectKeys<T extends object> = {
	[key in LowerCaseKeys<OptionalObjectPart<T>>]?: Capitalize<key> extends keyof T ? T[Capitalize<key>] : never;
} & {
	[key in LowerCaseKeys<RequiredObjectPart<T>>]: Capitalize<key> extends keyof T ? T[Capitalize<key>] : never;
};

type LowerCaseKeys<T extends object> = Uncapitalize<keyof T & string>;

export const lowerCaseKeys = <T extends object>(obj: T): LowerCaseObjectKeys<T> => {
	const entries = Object.entries(obj);
	const mappedEntries = entries.map(([k, v]) => [`${k.slice(0, 1).toLowerCase()}${k.slice(1)}`, v]);

	return Object.fromEntries(mappedEntries) as LowerCaseObjectKeys<T>;
};

export type UpperCaseObjectKeys<T extends object> = {
	[key in UpperCaseKeys<OptionalObjectPart<T>>]?: Uncapitalize<key> extends keyof T ? T[Uncapitalize<key>] : never;
} & {
	[key in UpperCaseKeys<RequiredObjectPart<T>>]: Uncapitalize<key> extends keyof T ? T[Uncapitalize<key>] : never;
};

type UpperCaseKeys<T extends object> = Capitalize<keyof T & string>;

export const upperCaseKeys = <T extends object>(obj: T): UpperCaseObjectKeys<T> => {
	const entries = Object.entries(obj);
	const mappedEntries = entries.map(([k, v]) => [`${k.slice(0, 1).toUpperCase()}${k.slice(1)}`, v]);

	return Object.fromEntries(mappedEntries) as UpperCaseObjectKeys<T>;
};
