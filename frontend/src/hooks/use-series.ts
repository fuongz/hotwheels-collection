import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { CarsResponse, Series } from "@/types/car";

interface UseSeriesOptions {
	page?: number;
	limit?: number;
	sortBy?: string | null;
	sortOrder?: string | null;
	q?: string | null;
}

export function useSeries(seriesId: string, options: UseSeriesOptions = {}) {
	const { page = 1, limit = 24, sortBy, sortOrder, q } = options;

	// Build query string with optional parameters
	const params = new URLSearchParams();
	params.set("page", page.toString());
	params.set("limit", limit.toString());

	if (sortBy) {
		params.set("sortBy", sortBy);
	}
	if (sortOrder) {
		params.set("sortOrder", sortOrder);
	}
	if (q) {
		params.set("q", q);
	}

	const { data, error, isLoading, mutate } = useSWR<CarsResponse>(
		`/series/${seriesId}?${params.toString()}`,
		fetcher<CarsResponse>,
	);

	return {
		cars: data?.data,
		meta: data?.meta,
		isLoading,
		isError: error,
		mutate,
	};
}

// Hook to get series details
export function useSeriesDetails(seriesId: string) {
	const { data, error, isLoading } = useSWR<Series>(
		`/series/${seriesId}/details`,
		fetcher<Series>,
	);

	return {
		series: data,
		isLoading,
		isError: error,
	};
}
