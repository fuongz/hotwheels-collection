"use client";

import {
	ArrowLeft01Icon,
	CryingIcon,
	Fire02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { useMemo } from "react";
import { CarsListView } from "@/components/cars/views/list-view";
import { CollectionFilters } from "@/components/collection-filters";
import { Button } from "@/components/ui/button";
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
import { useApi } from "@/hooks/use-api";
import type { Car } from "@/types/car";

interface CollectionPageContentProps {
	collectionId: string;
}

function CollectionPageContent({ collectionId }: CollectionPageContentProps) {
	const [currentPage, setCurrentPage] = useQueryState(
		"page",
		parseAsInteger.withDefault(1),
	);
	const [sortBy, setSortBy] = useQueryState(
		"sortBy",
		parseAsString.withDefault("year"),
	);
	const [sortOrder, setSortOrder] = useQueryState(
		"sortOrder",
		parseAsString.withDefault("desc"),
	);
	const [q, setQ] = useQueryState("q", parseAsString);
	const [gridColumns, setGridColumns] = useQueryState(
		"cols",
		parseAsInteger.withDefault(4),
	);
	const limit = 24;

	const {
		data: response,
		error,
		isLoading,
		mutate,
	} = useApi<Car[]>([
		`/series/${collectionId}`,
		{
			page: currentPage,
			limit,
			sortBy,
			sortOrder,
			q,
		},
	]);

	const apiCars = response?.data;
	const meta = response?.meta;
	const isError = error;

	// Transform API data to match the component's expected Car interface
	const carsData: Car[] = useMemo(() => {
		if (!apiCars) return [];
		const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || "";
		return apiCars.map((car: Car) => ({
			...car,
			avatarUrl: car.avatarUrl
				? `${cdnUrl}${car.avatarUrl.replace("r2://", "/")}`
				: null,
		}));
	}, [apiCars]);

	// Get series name from the first car's series data
	const seriesName = useMemo(() => {
		if (carsData.length > 0 && carsData[0].series?.length > 0) {
			const series = carsData[0].series.find((s) => s.id === collectionId);
			return series?.name;
		}
		return null;
	}, [carsData, collectionId]);

	// Calculate total pages
	const totalPages = meta ? Math.ceil(meta.total / meta.limit) : 1;

	return (
		<div className="container mx-auto px-4 pt-6 pb-6">
			{/* Back Button and Title */}
			<div className="mb-6">
				<Link href="/">
					<Button variant="secondary" size="sm" className="cursor-pointer mb-4">
						<HugeiconsIcon icon={ArrowLeft01Icon} className="size-4 mr-2" />
						Back to Collections
					</Button>
				</Link>
				{seriesName && (
					<div>
						<h1 className="text-xl font-bold text-foreground mb-2">
							{seriesName}
						</h1>
						{meta && (
							<p className="text-sm text-muted-foreground">
								<span className="font-semibold text-foreground">
									{meta.total} {meta.total === 1 ? "car" : "cars"}
								</span>{" "}
								in this collection
							</p>
						)}
					</div>
				)}
			</div>

			{/* Filters Section */}
			<section className="sticky bg-background top-10 z-1">
				<CollectionFilters
					year={null}
					sortBy={sortBy}
					sortOrder={sortOrder}
					search={q}
					searchLoading={isLoading}
					gridColumns={gridColumns}
					onYearChange={() => {}}
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
					hideYearFilter
				/>
			</section>

			{/* Main Content */}
			<main className="space-y-8 mx-[1px]">
				{/* Loading State */}
				{isLoading && (
					<div className="text-center py-16">
						<Spinner size="xl" />
						<h3 className="text-lg mt-2 font-medium text-foreground mb-2">
							Loading cars...
						</h3>
						<p className="text-muted-foreground">
							Please wait while we fetch the collection
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
							Failed to load collection
						</h3>
						<p className="text-muted-foreground">
							There was an error fetching this collection. Please try again
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
							{q
								? "Try adjusting your search to see more results."
								: "This collection is empty."}
						</p>
					</div>
				)}

				{/* Content - only show when not loading and no error */}
				{!isLoading && !isError && carsData.length > 0 && (
					<>
						<CarsListView
							cars={carsData}
							meta={meta}
							gridColumns={gridColumns}
							onSaved={(_car) => mutate()}
						/>

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

export default function CarCollectionPage() {
	const { collectionId } = useParams<{ collectionId: string }>();
	return !collectionId ? (
		<div className="container mx-auto px-4 pb-6">
			<div className="text-center py-16">
				<Spinner size="xl" />
				<h3 className="text-lg mt-2 font-medium text-foreground mb-2">
					Loading collection...
				</h3>
			</div>
		</div>
	) : (
		<CollectionPageContent collectionId={collectionId} />
	);
}
