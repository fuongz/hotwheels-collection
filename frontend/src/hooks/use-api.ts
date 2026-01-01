import { toast } from "sonner";
import useSWR, { type SWRConfiguration } from "swr";
import { swrFetcher } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api-client";

export function useApi<T = any>(
	key: string | [string, object?] | null,
	config?: SWRConfiguration<ApiResponse<T>>,
) {
	const [url, params] = Array.isArray(key) ? key : [key];

	// -- filter out null/undefined params
	const cleanParams = params
		? Object.fromEntries(
				Object.entries(params).filter(
					([_, value]) => value !== null && value !== undefined && value !== "",
				),
			)
		: undefined;
	return useSWR<ApiResponse<T>>([url, cleanParams], swrFetcher, {
		onError: (error) => {
			// Global error handling - can be overridden by passing onError in config
			if (!config?.onError) {
				toast.error(error.message || "An error occurred while fetching data");
			}
		},
		...config,
	});
}
