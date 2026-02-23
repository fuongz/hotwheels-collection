export interface SeriesData {
	name: string;
	slug: string;
}

export interface ModelData {
	name: string;
	slug: string;
	code: string;
}

export interface TableRowData {
	col_num: number | null;
	year: number | null | undefined;
	series: {
		name: string;
		slug: string;
		childName: string | null;
		childSlug: string | null;
		seriesNum: number | null;
		type: "premium" | "mainline" | "silver" | "rlc" | null;
		carIndex: number | null;
	};
	color: string;
	tampo: string;
	base_color: string | null;
	base_type: string | null;
	window_color: string;
	interior_color: string;
	wheel_type: string;
	toy_num: string;
	country: string;
	notes: string;
	base_codes: string[];
	photo_url: string;
}

export interface HotWheelData {
	model: ModelData;
	photo_url: string[];
	year: {
		producer_from: number;
		producer_to: number | null;
	};
	debut_series: {
		name: string;
		slug: string;
		childName: string;
		childSlug: string;
	};
	description: string | null;
	designer: {
		name: string;
		slug: string;
	};
	variations: TableRowData[];
}
