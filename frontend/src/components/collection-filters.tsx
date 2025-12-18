"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface CollectionFiltersProps {
	year: string | null;
	sortBy: string | null;
	sortOrder: string | null;
	search: string | null;
	onYearChange: (value: string | null) => void;
	onSortByChange: (value: string | null) => void;
	onSortOrderChange: (value: string | null) => void;
	onSearchChange: (value: string | null) => void;
}

export function CollectionFilters({
	year,
	sortBy,
	sortOrder,
	search,
	onYearChange,
	onSortByChange,
	onSortOrderChange,
	onSearchChange,
}: CollectionFiltersProps) {
	// Local state for immediate input updates
	const [searchInput, setSearchInput] = useState(search || "");

	// Sync local state with prop when prop changes externally
	useEffect(() => {
		setSearchInput(search || "");
	}, [search]);

	// Debounce search - trigger after 500ms of no typing
	useEffect(() => {
		const timer = setTimeout(() => {
			onSearchChange(searchInput || null);
		}, 500);

		return () => clearTimeout(timer);
	}, [searchInput, onSearchChange]);

	// Generate years from 2000 to 2026
	const years = Array.from({ length: 12 }, (_, i) => (2015 + i).toString());

	return (
		<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-4 bg-card/90 backdrop-blur-sm">
			<div className="flex items-center gap-3 sm:gap-4">
				{/* Year Filter */}
				<div className="flex items-center gap-2">
					<label
						htmlFor="year-select"
						className="hidden sm:inline-block text-sm text-muted-foreground whitespace-nowrap"
					>
						Year:
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
							<SelectItem value="all">All years</SelectItem>
							{years.map((y) => (
								<SelectItem key={y} value={y}>
									{y}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Sort By */}
				<div className="flex items-center gap-2">
					<label
						htmlFor="sort-by-select"
						className="hidden sm:inline-block text-sm text-muted-foreground whitespace-nowrap"
					>
						Sort by:
					</label>
					<Select
						value={sortBy || "default"}
						onValueChange={(value) =>
							onSortByChange(value === "default" ? null : value)
						}
					>
						<SelectTrigger id="sort-by-select" className="w-full sm:w-[140px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="default">Default</SelectItem>
							<SelectItem value="name">Name</SelectItem>
							<SelectItem value="year">Year</SelectItem>
							<SelectItem value="series">Series</SelectItem>
							<SelectItem value="createdAt">Date Added</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Sort Order */}
				<div className="flex items-center gap-2">
					<label
						htmlFor="sort-order-select"
						className="hidden sm:inline-block text-sm text-muted-foreground whitespace-nowrap"
					>
						Order:
					</label>
					<Select
						value={sortOrder || "asc"}
						onValueChange={(value) =>
							onSortOrderChange(value === "asc" ? null : value)
						}
					>
						<SelectTrigger
							id="sort-order-select"
							className="w-full sm:w-[140px]"
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="asc">Ascending</SelectItem>
							<SelectItem value="desc">Descending</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Search Bar */}
			<div className="flex items-center gap-2">
				<div className="relative w-full md:w-auto">
					<Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						type="text"
						placeholder="Search cars..."
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						className="w-full md:w-[250px] pl-8"
					/>
				</div>
			</div>
		</div>
	);
}
