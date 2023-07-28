export const pick = <T extends object, K extends keyof T>(
	object: T,
	keys: Array<K> | Readonly<Array<K>>
): Pick<T, K> => {
	return Object.fromEntries(keys.map(key => [key, object[key]])) as Pick<T, K>;
};
