import { CarCard } from "@/components/car-card";
import type { Car } from "@/types/car";

export function CarsListView({
	gridColumns,
	cars,
	meta,
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
	return (
		<>
			{/* Results Info */}
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					showing{" "}
					<span className="font-medium text-foreground">{cars.length}</span> of{" "}
					<span className="font-medium text-foreground">
						{meta?.total || cars.length}
					</span>{" "}
					cars
				</p>
			</div>
			<div
				className={`grid gap-4 ${
					gridColumns === 3
						? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
						: gridColumns === 4
							? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
							: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6"
				}`}
			>
				{cars.map((car) => (
					<CarCard key={car.id} car={car} onSaved={() => onSaved?.(car)} />
				))}
			</div>
		</>
	);
}
