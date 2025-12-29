export interface SeriesData {
	name: string;
	slug: string;
}

export interface ModelData {
	name: string;
	slug: string | null;
}

export interface HotWheelData {
	toy_num: string;
	col_num: string;
	model: ModelData;
	series: SeriesData[];
	series_num: string;
	photo_url: string[];
	year: string;
}
