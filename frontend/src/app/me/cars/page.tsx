"use client";

import {
	ArrowLeft01Icon,
	CryingIcon,
	Fire02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { useMemo } from "react";
import { CarsListView } from "@/components/cars/views/list-view";
import { CarsSeriesView } from "@/components/cars/views/series-view";
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
import { useSession } from "@/lib/auth-client";
import type { Car } from "@/types/car";

function UserCarsPageContent() {
	const [currentPage, setCurrentPage] = useQueryState(
		"page",
		parseAsInteger.withDefault(1),
	);
	const [year, setYear] = useQueryState("year", parseAsString.withDefault(""));
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
		parseAsInteger.withDefault(6),
	);
	const [view, setView] = useQueryState(
		"view",
		parseAsString.withDefault("list"),
	);
	const limit = 100;

	const {
		data: response,
		error,
		isLoading,
		mutate,
	} = useApi<Car[]>([
		`/me/cars`,
		{
			page: currentPage,
			limit,
			sortBy,
			sortOrder,
			year,
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

	// Calculate total pages
	const totalPages = meta ? Math.ceil(meta.total / meta.limit) : 1;

	return (
		<div className="container mx-auto px-4 pt-6 pb-6">
			{/* Back Button and Title */}
			<div className="mb-6">
				<Link href="/">
					<Button variant="secondary" size="sm" className="cursor-pointer mb-4">
						<HugeiconsIcon icon={ArrowLeft01Icon} className="size-4 mr-2" />
						Back to Home
					</Button>
				</Link>
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
					view={view as "list" | "series"}
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
					onViewChange={(value) => {
						setView(value);
					}}
					showViewToggle
				/>
			</section>

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

				{!isLoading &&
					!isError &&
					carsData.length > 0 &&
					(view === "list" ? (
						<CarsListView
							gridColumns={gridColumns}
							cars={carsData}
							meta={meta}
							onSaved={(_car) => mutate()}
						/>
					) : (
						<CarsSeriesView
							gridColumns={gridColumns}
							cars={carsData}
							meta={meta}
							onSaved={(_car) => mutate()}
						/>
					))}

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
										currentPage === 1 ? "pointer-events-none opacity-50" : ""
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
										(pageNum >= currentPage - 1 && pageNum <= currentPage + 1);

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
												onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
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
			</main>
		</div>
	);
}

export default function UserCarsPage() {
	const { isPending } = useSession();
	return isPending ? (
		<div className="container mx-auto px-4 pb-6">
			<div className="text-center py-16">
				<Spinner size="xl" />
				<h3 className="text-lg mt-2 font-medium text-foreground mb-2">
					Loading collection...
				</h3>
			</div>
		</div>
	) : (
		<UserCarsPageContent />
	);
}
