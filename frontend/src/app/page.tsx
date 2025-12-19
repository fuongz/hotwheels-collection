"use client";

import { CryingIcon, Fire02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { Suspense, useMemo } from "react";
import { CarCard } from "@/components/car-card";
import { CollectionFilters } from "@/components/collection-filters";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
import { Spinner } from "@/components/ui/spinner";
import { useCars } from "@/hooks/use-cars";
import type { Car } from "@/types/car";

function CollectionPageContent() {
	const [currentPage, setCurrentPage] = useQueryState(
		"page",
		parseAsInteger.withDefault(1),
	);
	const [year, setYear] = useQueryState("year", parseAsString);
	const [sortBy, setSortBy] = useQueryState("sortBy", parseAsString);
	const [sortOrder, setSortOrder] = useQueryState("sortOrder", parseAsString);
	const [q, setQ] = useQueryState("q", parseAsString);
	const [gridColumns, setGridColumns] = useQueryState(
		"cols",
		parseAsInteger.withDefault(4),
	);
	const limit = 24;

	const {
		cars: apiCars,
		meta,
		isLoading,
		isError,
	} = useCars({ page: currentPage, limit, year, sortBy, sortOrder, q });

	// Transform API data to match the component's expected Car interface
	const carsData: Car[] = useMemo(() => {
		if (!apiCars) return [];
		const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || "";
		return apiCars.map((car: Car) => ({
			...car,
			avatarUrl: `${cdnUrl}${car.avatarUrl.replace("r2://", "/")}`,
		}));
	}, [apiCars]);

	// Calculate total pages
	const totalPages = meta ? Math.ceil(meta.total / meta.limit) : 1;

	return (
		<div className="container mx-auto px-4 pb-6">
			{/* Filters Section */}
			<section className="sticky top-10 z-1">
				<CollectionFilters
					year={year}
					sortBy={sortBy}
					sortOrder={sortOrder}
					search={q}
					searchLoading={isLoading}
					gridColumns={gridColumns}
					onYearChange={(value) => {
						setYear(value);
						setCurrentPage(1);
					}}
					onSortByChange={(value) => {
						setSortBy(value);
						setCurrentPage(1);
					}}
					onSortOrderChange={(value) => {
						setSortOrder(value);
						setCurrentPage(1);
					}}
					onSearchChange={(value) => {
						setQ(value);
						setCurrentPage(1);
					}}
					onGridColumnsChange={(value) => {
						setGridColumns(value);
					}}
				/>
			</section>

			{/* Main Content */}
			<main className="space-y-8">
				{/* Loading State */}
				{isLoading && (
					<div className="text-center py-16">
						<Spinner size="xl" />
						<h3 className="text-lg mt-2 font-medium text-foreground mb-2">
							Loading cars...
						</h3>
						<p className="text-muted-foreground">
							Please wait while we fetch your collection
						</p>
					</div>
				)}

				{/* Error State */}
				{isError && (
					<div className="text-center py-16">
						<div className="p-4 rounded-full bg-destructive/10 inline-block mb-4">
							<HugeiconsIcon
								icon={Fire02Icon}
								className="h-8 w-8 text-destructive"
							/>
						</div>
						<h3 className="text-lg font-medium text-foreground mb-2">
							Failed to load cars
						</h3>
						<p className="text-muted-foreground">
							There was an error fetching your collection. Please try again
							later.
						</p>
					</div>
				)}

				{/* Empty State */}
				{!isLoading && !isError && carsData.length === 0 && (
					<div className="text-center py-16">
						<div className="p-4 rounded-full bg-muted inline-block mb-4">
							<HugeiconsIcon
								icon={CryingIcon}
								className="h-8 w-8 text-muted-foreground"
							/>
						</div>
						<h3 className="text-lg font-medium text-foreground mb-2">
							No cars found
						</h3>
						<p className="text-muted-foreground">
							{q || year
								? "Try adjusting your filters to see more results."
								: "Your collection is empty. Start adding some cars!"}
						</p>
					</div>
				)}

				{/* Content - only show when not loading and no error */}
				{!isLoading && !isError && carsData.length > 0 && (
					<>
						{/* Results Info */}
						<div className="flex items-center justify-between">
							<p className="text-sm text-muted-foreground">
								Showing{" "}
								<span className="font-medium text-foreground">
									{carsData.length}
								</span>{" "}
								of{" "}
								<span className="font-medium text-foreground">
									{meta?.total || carsData.length}
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
										: gridColumns === 5
											? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
											: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
							}`}
						>
							{carsData.map((car) => (
								<CarCard key={car.id} car={car} />
							))}
						</div>

						{/* Pagination */}
						{totalPages > 1 && (
							<Pagination className="mt-8">
								<PaginationContent>
									<PaginationItem>
										<PaginationPrevious
											href="#"
											onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
												e.preventDefault();
												if (currentPage > 1) {
													setCurrentPage(currentPage - 1);
												}
											}}
											className={
												currentPage === 1
													? "pointer-events-none opacity-50"
													: ""
											}
										/>
									</PaginationItem>

									{/* Page Numbers */}
									{Array.from({ length: totalPages }, (_, i) => i + 1).map(
										(pageNum) => {
											const isCurrentPage = pageNum === currentPage;
											const showPage =
												pageNum === 1 ||
												pageNum === totalPages ||
												(pageNum >= currentPage - 1 &&
													pageNum <= currentPage + 1);

											if (!showPage) {
												if (
													pageNum === currentPage - 2 ||
													pageNum === currentPage + 2
												) {
													return (
														<PaginationItem key={pageNum}>
															<PaginationEllipsis />
														</PaginationItem>
													);
												}
												return null;
											}

											return (
												<PaginationItem key={pageNum}>
													<PaginationLink
														href="#"
														isActive={isCurrentPage}
														onClick={(
															e: React.MouseEvent<HTMLAnchorElement>,
														) => {
															e.preventDefault();
															setCurrentPage(pageNum);
														}}
													>
														{pageNum}
													</PaginationLink>
												</PaginationItem>
											);
										},
									)}

									<PaginationItem>
										<PaginationNext
											href="#"
											onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
												e.preventDefault();
												if (currentPage < totalPages) {
													setCurrentPage(currentPage + 1);
												}
											}}
											className={
												currentPage === totalPages
													? "pointer-events-none opacity-50"
													: ""
											}
										/>
									</PaginationItem>
								</PaginationContent>
							</Pagination>
						)}
					</>
				)}
			</main>
		</div>
	);
}

export default function CollectionPage() {
	return (
		<Suspense
			fallback={
				<div className="container mx-auto px-4 pb-6">
					<div className="text-center py-16">
						<Spinner size="xl" />
						<h3 className="text-lg mt-2 font-medium text-foreground mb-2">
							Loading...
						</h3>
					</div>
				</div>
			}
		>
			<CollectionPageContent />
		</Suspense>
	);
}
