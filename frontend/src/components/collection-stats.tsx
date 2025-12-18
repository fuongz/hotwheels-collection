"use client";

import { Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface CollectionStatsProps {
	totalCars?: number;
}

export function CollectionStats({
	totalCars: totalCarsFromAPI,
}: CollectionStatsProps) {
	const totalCars = totalCarsFromAPI;
	return (
		<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
			<Card className="bg-card border-border">
				<CardContent className="p-4 flex items-center gap-3">
					<div className="p-2 rounded-lg bg-secondary">
						<Package className="h-5 w-5 text-foreground" />
					</div>
					<div>
						<p className="text-2xl font-bold text-foreground">{totalCars}</p>
						<p className="text-xs text-muted-foreground">Total Cars</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
