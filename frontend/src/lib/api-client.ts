/** biome-ignore-all lint/suspicious/noExplicitAny: no need */

import ky from "ky";

export const $api = ky.create({
	prefixUrl: process.env.NEXT_PUBLIC_API_URL,
	throwHttpErrors: false,
});

export const swrFetcher = async <T>(
	key: string | [string, Record<string, any>?],
): Promise<T> => {
	const [url, params] = Array.isArray(key) ? key : [key];
	const response = await $api.get(url.startsWith("/") ? url.slice(1) : url, {
		searchParams: params,
		credentials: "include",
	});
	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}
	return response.json<T>();
};

export const api = {
	get: async <T>(url: string, params?: Record<string, any>) => {
		const response = await $api.get(url.startsWith("/") ? url.slice(1) : url, {
			searchParams: params,
			credentials: "include",
		});
		return {
			data: await response.json<T>(),
			error: response.ok ? null : response,
		};
	},

	post: async <T>(url: string, data?: any, options?: any) => {
		const response = await $api.post(url.startsWith("/") ? url.slice(1) : url, {
			json: data,
			credentials: "include",
			...options,
		});
		return {
			data: await response.json<T>(),
			error: response.ok ? null : response,
		};
	},

	put: async <T>(url: string, data?: any) => {
		const response = await $api.put(url.startsWith("/") ? url.slice(1) : url, {
			json: data,
			credentials: "include",
		});
		return {
			data: await response.json<T>(),
			error: response.ok ? null : response,
		};
	},

	patch: async <T>(url: string, data?: any) => {
		const response = await $api.patch(
			url.startsWith("/") ? url.slice(1) : url,
			{ json: data, credentials: "include" },
		);
		return {
			data: await response.json<T>(),
			error: response.ok ? null : response,
		};
	},

	delete: async <T>(url: string) => {
		const response = await $api.delete(
			url.startsWith("/") ? url.slice(1) : url,
			{
				credentials: "include",
			},
		);
		return {
			data: await response.json<T>(),
			error: response.ok ? null : response,
		};
	},

	postFormData: async <T>(url: string, formData: FormData) => {
		const response = await $api.post(url.startsWith("/") ? url.slice(1) : url, {
			body: formData,
			credentials: "include",
		});
		return {
			data: await response.json<T>(),
			error: response.ok ? null : response,
		};
	},
};
