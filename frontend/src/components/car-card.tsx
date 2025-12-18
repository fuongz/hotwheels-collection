"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Car } from "@/types/car";

interface CarCardProps {
	car: Car;
}

export function CarCard({ car }: CarCardProps) {
	return (
		<Card
			className={`group overflow-hidden transition-all duration-300 hover:scale-[1.02] p-0`}
		>
			<div className="relative aspect-[16/9] overflow-hidden">
				<Image
					src={car.avatarUrl || "/placeholder.svg"}
					alt={car.model}
					fill
					className={`h-full w-full object-cover transition-all duration-300 group-hover:scale-105`}
				/>
				{/* Year Badge */}
				<div className="absolute top-3 left-3">
					<Badge
						variant="outline"
						className="bg-background/80 backdrop-blur-sm border-border/50 text-foreground"
					>
						{car.year}
					</Badge>
				</div>

				<div className="absolute top-3 right-3">
					<Badge
						variant="outline"
						className="bg-background/80 backdrop-blur-sm border-border/50 text-foreground"
					>
						No. <span className="font-bold">{car.toyIndex}</span>
					</Badge>
				</div>
			</div>
			<CardContent className="px-4 pb-4">
				<div className="space-y-2">
					<h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-relaxed">
						{car.model}
					</h3>
					<div className="flex items-center justify-between">
						<span className="text-xs text-muted-foreground">
							#{car.toyCode}
						</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
