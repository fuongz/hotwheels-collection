export interface Series {
	id: string;
	name: string;
	seriesNum: string;
	wikiSlug: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface Bookmark {
	carId: string;
	id: string;
	userId: string;
	quantity: number;
	createdAt: string;
	updatedAt: string;
}

export interface Car {
	bookmark: Bookmark;
	id: string;
	toyCode: string;
	toyIndex: string;
	model: string;
	avatarUrl: string | null;
	year: string;
	series: Series[];
	createdAt: string;
	updatedAt: string;
}
