"use client";

import { Folder01Icon, ImageDownload02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Car } from "@/types/car";

interface CarCardProps {
	car: Car;
}

export function CarCard({ car }: CarCardProps) {
	const [isImageError, setIsImageError] = useState(false);
	return (
		<Card
			className={`group overflow-hidden transition-all duration-300 hover:scale-[1.02] p-0`}
		>
			<div className="relative aspect-[16/9] overflow-hidden">
				{car.avatarUrl && !isImageError ? (
					<Image
						src={car.avatarUrl || "/placeholder.svg"}
						alt={car.model}
						fill
						loading="eager"
						onError={() => setIsImageError(true)}
						className={`h-full w-full object-cover transition-all duration-300 group-hover:scale-105`}
					/>
				) : (
					<div className="bg-muted text-xs w-full h-full flex items-center flex-col gap-2 justify-center">
						<HugeiconsIcon
							className="size-8 text-muted-foreground"
							strokeWidth={1}
							icon={ImageDownload02Icon}
						/>
						<span className="text-muted-foreground">
							We are working on it...
						</span>
					</div>
				)}
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
					<div className="flex items-center mt-2 flex-wrap gap-2 justify-between">
						{car.series?.map((s) => (
							<Link href={`/collections/${s.id}`} key={s.id}>
								<span
									className={cn(
										"dark:bg-orange-900/50 dark:hover:bg-orange-900 dark:text-orange-50",
										"bg-orange-100 hover:bg-orange-200 text-orange-800",
										"flex text-xs gap-2 items-center px-1.5 hover:underline cursor-pointer hover:scale-105 transition hover:transition py-0.5",
									)}
								>
									<HugeiconsIcon icon={Folder01Icon} className="size-3" />
									{s.name}
								</span>
							</Link>
						))}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
