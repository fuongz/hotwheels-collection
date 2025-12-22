export type ApiResponse<T> = {
	status: 1;
	data: T | null;
	message?: string;
	httpStatusCode: number;
	meta: {
		page: number;
		limit: number;
		total: number;
	};
};

export type ApiErrorResponse = {
	status: 0;
	httpStatusCode: number;
	message: string;
};
