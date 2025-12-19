export interface Series {
	id: string;
	name: string;
	seriesNum: string;
	createdAt: string;
	updatedAt: string;
}

export interface Car {
	id: string;
	toyCode: string;
	toyIndex: string;
	model: string;
	avatarUrl: string;
	year: string;
	series: Series[];
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
