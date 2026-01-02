"use client";

import {
	CleanIcon,
	FilterVerticalIcon,
	GridViewIcon,
	Layout01Icon,
	ListViewIcon,
	Search01Icon,
	Sorting01Icon,
	SortingAZ02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { Separator } from "../../ui";
import { Button } from "../../ui/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "../../ui/input-group";
import { Spinner } from "../../ui/spinner";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "../../ui/tooltip";

// Constants for select options
const YEAR_OPTIONS = {
	ALL: "all",
	START_YEAR: 2015,
	YEAR_COUNT: 12,
} as const;

const SORT_BY_OPTIONS = [
	{ value: "name", label: "Name" },
	{ value: "year", label: "Year" },
	{ value: "createdAt", label: "Date added" },
] as const;

const SORT_ORDER_OPTIONS = [
	{ value: "asc", label: "Ascending" },
	{ value: "desc", label: "Descending" },
] as const;

const GRID_COLUMN_OPTIONS = [3, 4, 6] as const;

const VIEW_OPTIONS = [
	{ value: "list" as const, label: "List" },
	{ value: "series" as const, label: "Series" },
] as const;

interface CollectionFiltersProps {
	year: string | null;
	sortBy: string | null;
	sortOrder: string | null;
	search: string | null;
	searchLoading?: boolean;
	gridColumns: number;
	view?: "list" | "series";
	onYearChange: (value: string | null) => void;
	onSortByChange: (value: string | null) => void;
	onSortOrderChange: (value: string | null) => void;
	onSearchChange: (value: string | null) => void;
	onGridColumnsChange: (value: number) => void;
	onViewChange?: (value: "series" | "list") => void;
	hideYearFilter?: boolean;
	showViewToggle?: boolean;
}

export function CollectionFilters({
	year,
	sortBy,
	sortOrder,
	search,
	searchLoading = false,
	gridColumns,
	view,
	onYearChange,
	onSortByChange,
	onSortOrderChange,
	onSearchChange,
	onGridColumnsChange,
	onViewChange,
	hideYearFilter = false,
	showViewToggle = false,
}: CollectionFiltersProps) {
	// -- local state for immediate input updates
	const [searchInput, setSearchInput] = useState(search || "");

	// -- hooks
	const isMobile = useIsMobile();

	// -- sync local state with prop when prop changes externally
	useEffect(() => {
		setSearchInput(search || "");
	}, [search]);
	const years = Array.from({ length: YEAR_OPTIONS.YEAR_COUNT }, (_, i) =>
		(YEAR_OPTIONS.START_YEAR + i).toString(),
	);

	return (
		<div className="flex flex-col flex-wrap md:flex-row md:items-center md:justify-between gap-4 py-4">
			<div className="flex items-center gap-3 sm:gap-4">
				{/* Year Filter */}
				{!hideYearFilter && (
					<>
						<div className="flex items-center gap-2">
							<label
								htmlFor="year-select"
								className="hidden sm:inline-block text-sm text-muted-foreground whitespace-nowrap"
							>
								<HugeiconsIcon
									icon={FilterVerticalIcon}
									className="size-4 text-muted-foreground"
								/>
							</label>
							<Select
								value={year || YEAR_OPTIONS.ALL}
								onValueChange={(value) =>
									onYearChange(value === YEAR_OPTIONS.ALL ? null : value)
								}
							>
								<SelectTrigger id="year-select" className="w-full sm:w-[140px]">
									<span className="text-muted-foreground mr-1">Year:</span>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={YEAR_OPTIONS.ALL}>All years</SelectItem>
									{years.map((y) => (
										<SelectItem key={y} value={y}>
											{y}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<Separator orientation="vertical" />
					</>
				)}

				{/* Sort By */}
				<div className="flex items-center gap-2">
					<HugeiconsIcon
						icon={SortingAZ02Icon}
						className="size-4 text-muted-foreground"
					/>
					<Select
						value={sortBy || "year"}
						onValueChange={(value) =>
							onSortByChange(value === "year" ? null : value)
						}
					>
						<SelectTrigger id="sort-by-select">
							<span className="text-muted-foreground mr-1">Sort by:</span>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{SORT_BY_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Sort Order */}
				<div className="flex items-center gap-2">
					<HugeiconsIcon
						icon={Sorting01Icon}
						className="size-4 text-muted-foreground"
					/>
					<Select
						value={sortOrder || "desc"}
						onValueChange={(value) =>
							onSortOrderChange(value === "desc" ? null : value)
						}
					>
						<SelectTrigger
							id="sort-order-select"
							className="w-full sm:w-[140px]"
						>
							<span className="text-muted-foreground mr-1">Order:</span>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{SORT_ORDER_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Layout and Search Bar */}
			<div className="flex items-center gap-2">
				{/* Layout Change Button */}
				{!isMobile && (
					<TooltipProvider>
						<DropdownMenu>
							<Tooltip>
								<TooltipTrigger
									render={
										<DropdownMenuTrigger
											render={
												<Button variant="outline" className="cursor-pointer" />
											}
										/>
									}
								>
									<HugeiconsIcon icon={Layout01Icon} />
									{gridColumns} columns
									<span className="sr-only">Change layout</span>
								</TooltipTrigger>
								<TooltipContent>
									<p>Change layout</p>
								</TooltipContent>
							</Tooltip>
							<DropdownMenuContent align="end">
								{GRID_COLUMN_OPTIONS.map((columns) => (
									<DropdownMenuItem
										key={columns}
										onClick={() => onGridColumnsChange(columns)}
									>
										<span
											className={gridColumns === columns ? "font-semibold" : ""}
										>
											{columns} columns
										</span>
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					</TooltipProvider>
				)}

				{/* View Change Button */}
				{showViewToggle && (
					<TooltipProvider>
						<DropdownMenu>
							<Tooltip>
								<TooltipTrigger
									render={
										<DropdownMenuTrigger
											render={
												<Button variant="outline" className="cursor-pointer" />
											}
										/>
									}
								>
									<HugeiconsIcon
										icon={view === "list" ? ListViewIcon : GridViewIcon}
									/>
									{view}
									<span className="sr-only">Change view</span>
								</TooltipTrigger>
								<TooltipContent>
									<p>Change view</p>
								</TooltipContent>
							</Tooltip>
							<DropdownMenuContent align="end">
								{VIEW_OPTIONS.map((option) => (
									<DropdownMenuItem
										key={option.value}
										onClick={() => onViewChange?.(option.value)}
									>
										<span
											className={view === option.value ? "font-semibold" : ""}
										>
											{option.label}
										</span>
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					</TooltipProvider>
				)}

				<InputGroup className="relative w-full md:w-auto">
					<InputGroupAddon>
						<HugeiconsIcon icon={Search01Icon} />
					</InputGroupAddon>
					<InputGroupInput
						type="text"
						placeholder="Search cars..."
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						className="w-full xl:w-[250px] pl-8"
						onKeyDown={(e) => e.key === "Enter" && onSearchChange(searchInput)}
					/>
					<InputGroupAddon align="inline-end">
						{searchLoading ? (
							<Spinner size="sm" />
						) : (
							<div className="flex items-center gap-1">
								{searchInput && (
									<Button
										size="xs"
										variant="destructive"
										className="cursor-pointer"
										onClick={() => {
											onSearchChange("");
										}}
									>
										<HugeiconsIcon icon={CleanIcon} />
										Clear
									</Button>
								)}
								<Button
									size="xs"
									variant="outline"
									className="cursor-pointer"
									onClick={() => onSearchChange(searchInput)}
								>
									Search
								</Button>
							</div>
						)}
					</InputGroupAddon>
				</InputGroup>
			</div>
		</div>
	);
}
