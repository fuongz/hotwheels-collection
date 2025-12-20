
interface SeriesData {
  name: string;
  slug: string;
}

interface ModelData {
  name: string;
  slug: string | null;
}

interface HotWheelData {
  toy_num: string;
  col_num: string;
  model: ModelData;
  series: SeriesData[];
  series_num: string;
  photo_url: string[];
  year: string;
}
