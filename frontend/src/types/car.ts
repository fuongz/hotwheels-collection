export interface Casting {
	id: string;
	code: string;
	name: string;
	bodyType: string | null;
	firstYear: number | null;
	avatarUrl: string | null;
}

export interface Collection {
	id: number;
	code: string;
	name: string;
	wikiSlug: string | null;
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
	id: string;
	year: number;
	color: string | null;
	tampo: string | null;
	wheelType: string | null;
	wheelCode: string | null;
	baseColor: string | null;
	baseType: string | null;
	interiorColor: string | null;
	windowColor: string | null;
	mainlineNumber: string | null;
	subSeriesNumber: string | null;
	caseCode: string | null;
	toyIndex: number;
	country: string | null;
	avatarUrl: string | null;
	isTreasureHunt: boolean;
	isSuperTreasureHunt: boolean;
	wikiSlug: string | null;
	wikiUrl: string | null;
	notes: string | null;
	createdAt: number;
	updatedAt: number;
	casting: Casting;
	collection: Collection;
	bookmark?: Bookmark;
}
