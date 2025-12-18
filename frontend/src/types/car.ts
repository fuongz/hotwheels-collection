export interface Car {
	id: string;
	toyCode: string;
	toyIndex: string;
	model: string;
	avatarUrl: string;
	year: string;
	createdAt: string;
	updatedAt: string;
}

export interface CarsResponse {
	data: Car[];
	meta: {
		page: number;
		limit: number;
		total: number;
	};
}
