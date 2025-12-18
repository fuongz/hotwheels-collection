import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { CarsResponse } from "@/types/car";

interface UseCarsOptions {
	page?: number;
	limit?: number;
	year?: string | null;
	sortBy?: string | null;
	sortOrder?: string | null;
	q?: string | null;
}

export function useCars(options: UseCarsOptions = {}) {
	const { page = 1, limit = 20, year, sortBy, sortOrder, q } = options;

	// Build query string with optional parameters
	const params = new URLSearchParams();
	params.set("page", page.toString());
	params.set("limit", limit.toString());

	if (year) {
		params.set("year", year);
	}
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
		`/cars?${params.toString()}`,
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
