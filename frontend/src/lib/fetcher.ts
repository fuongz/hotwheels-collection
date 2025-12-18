export const fetcher = async <T>(path: string): Promise<T> => {
	return fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`).then((res) =>
		res.json(),
	);
};
