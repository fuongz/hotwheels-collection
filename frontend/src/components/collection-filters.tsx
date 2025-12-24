"use client";

import {
	CleanIcon,
	FilterVerticalIcon,
	Layout01Icon,
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
import { Separator } from "./ui";
import { Button } from "./ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";
import { Spinner } from "./ui/spinner";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./ui/tooltip";

interface CollectionFiltersProps {
	year: string | null;
	sortBy: string | null;
	sortOrder: string | null;
	search: string | null;
	searchLoading?: boolean;
	gridColumns: number;
	onYearChange: (value: string | null) => void;
	onSortByChange: (value: string | null) => void;
	onSortOrderChange: (value: string | null) => void;
	onSearchChange: (value: string | null) => void;
	onGridColumnsChange: (value: number) => void;
	hideYearFilter?: boolean;
}

export function CollectionFilters({
	year,
	sortBy,
	sortOrder,
	search,
	searchLoading = false,
	gridColumns,
	onYearChange,
	onSortByChange,
	onSortOrderChange,
	onSearchChange,
	onGridColumnsChange,
	hideYearFilter = false,
}: CollectionFiltersProps) {
	// Local state for immediate input updates
	const [searchInput, setSearchInput] = useState(search || "");

	// Sync local state with prop when prop changes externally
	useEffect(() => {
		setSearchInput(search || "");
	}, [search]);
	const years = Array.from({ length: 12 }, (_, i) => (2015 + i).toString());

	return (
		<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-4">
			<div className="flex items-center gap-3 sm:gap-4">
				{/* Year Filter */}
				{!hideYearFilter && (
					<>
						<div className="flex items-center gap-2">
							<label
								htmlFor="year-select"
								className="hidden sm:inline-block text-sm text-muted-foreground whitespace-nowrap"
							>
								<HugeiconsIcon icon={FilterVerticalIcon} className="size-4" />
							</label>
							<Select
								value={year || "all"}
								onValueChange={(value) =>
									onYearChange(value === "all" ? null : value)
								}
							>
								<SelectTrigger id="year-select" className="w-full sm:w-[140px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">all years</SelectItem>
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
					<HugeiconsIcon icon={SortingAZ02Icon} className="size-4" />
					<Select
						value={sortBy || "year"}
						onValueChange={(value) =>
							onSortByChange(value === "year" ? null : value)
						}
					>
						<SelectTrigger id="sort-by-select" className="w-full sm:w-[140px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="name">name</SelectItem>
							<SelectItem value="year">year</SelectItem>
							<SelectItem value="createdAt">date added</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Sort Order */}
				<div className="flex items-center gap-2">
					<HugeiconsIcon icon={Sorting01Icon} className="size-4" />
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
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="asc">ascending</SelectItem>
							<SelectItem value="desc">descending</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Layout and Search Bar */}
			<div className="flex items-center gap-2">
				{/* Layout Change Button */}
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
								<span className="sr-only">change layout</span>
							</TooltipTrigger>
							<TooltipContent>
								<p>change layout</p>
							</TooltipContent>
						</Tooltip>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => onGridColumnsChange(3)}>
								<span className={gridColumns === 3 ? "font-semibold" : ""}>
									3 columns
								</span>
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => onGridColumnsChange(4)}>
								<span className={gridColumns === 4 ? "font-semibold" : ""}>
									4 columns
								</span>
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => onGridColumnsChange(6)}>
								<span className={gridColumns === 6 ? "font-semibold" : ""}>
									6 columns
								</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</TooltipProvider>

				<InputGroup className="relative w-full md:w-auto">
					<InputGroupAddon></InputGroupAddon>
					<InputGroupInput
						type="text"
						placeholder="search cars..."
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						className="w-full md:w-[250px] pl-8"
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
										clear
									</Button>
								)}
								<Button
									size="xs"
									variant="secondary"
									className="cursor-pointer"
									onClick={() => onSearchChange(searchInput)}
								>
									<HugeiconsIcon icon={Search01Icon} /> search
								</Button>
							</div>
						)}
					</InputGroupAddon>
				</InputGroup>
			</div>
		</div>
	);
}
