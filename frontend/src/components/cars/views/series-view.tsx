import Link from "next/link";
import { useMemo } from "react";
import { PhotoProvider } from "react-photo-view";
import { CarCard } from "@/components/cars/item/car-card";
import { Separator } from "@/components/ui";
import type { Car, Series } from "@/types/car";

export function CarsSeriesView({
	cars,
	meta,
	gridColumns,
	onSaved,
}: {
	gridColumns?: number;
	cars: Car[];
	meta?: {
		page: number;
		limit: number;
		total: number;
	};
	onSaved?: (car: Car) => void;
}) {
	// Group cars by series
	const groupedCars = useMemo(() => {
		const groups: Record<string, { series: Series; cars: Car[] }> = {};
		cars.forEach((car) => {
			if (car.series && car.series.length > 0) {
				car.series.forEach((series) => {
					if (!groups[series.id]) {
						groups[series.id] = {
							series,
							cars: [],
						};
					}
					groups[series.id].cars.push(car);
				});
			} else {
				if (!groups.uncategorized) {
					groups.uncategorized = {
						series: {
							id: "uncategorized",
							name: "Uncategorized",
							seriesNum: "0",
							wikiSlug: null,
							createdAt: "",
							updatedAt: "",
						},
						cars: [],
					};
				}
				groups.uncategorized.cars.push(car);
			}
		});
		return Object.values(groups).sort((a, b) => {
			return b.series.name.localeCompare(a.series.name);
		});
	}, [cars]);

	return (
		<PhotoProvider>
			{/* Results Info */}
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					Showing{" "}
					<span className="font-medium text-foreground">{cars.length}</span> of{" "}
					<span className="font-medium text-foreground">
						{meta?.total || cars.length}
					</span>{" "}
					cars in{" "}
					<span className="font-medium text-foreground">
						{groupedCars.length}
					</span>{" "}
					{groupedCars.length === 1 ? "collection" : "collections"}
				</p>
			</div>

			{/* Grouped Cars by Series/Collection */}
			<div className="space-y-6">
				{groupedCars.map((group) => (
					<div key={group.series.id} className="space-y-4">
						{/* Collection Header */}
						<div className="flex items-center gap-3">
							<h2 className="text-base font-bold text-foreground">
								<Link
									href={`/collections/${group.series.id}`}
									className="hover:underline"
								>
									{group.series.name}
								</Link>
								<span className="font-normal ml-2 text-muted-foreground">
									({group.cars.length}/{group.series.seriesNum || "?"})
								</span>
							</h2>
						</div>

						{/* Cars Grid */}
						<div
							className={`grid gap-4 ${
								gridColumns === 3
									? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
									: gridColumns === 4
										? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
										: gridColumns === 6
											? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6"
											: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-8"
							}`}
						>
							{group.cars.map((car) => (
								<CarCard
									key={car.id}
									car={car}
									hideOwnedBadge
									size="mini"
									onSaved={() => onSaved?.(car)}
								/>
							))}
						</div>
						<Separator />
					</div>
				))}
			</div>
		</PhotoProvider>
	);
}
