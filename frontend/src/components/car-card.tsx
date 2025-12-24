"use client";

import {
	BookmarkAdd01Icon,
	BookmarkCheck02Icon,
	Folder01Icon,
	ImageDownload02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import type { Car } from "@/types/car";

interface CarCardProps {
	car: Car;
	onSaved?: () => void;
	hideOwnedBadge?: boolean;
}

export function CarCard({ car, onSaved, hideOwnedBadge }: CarCardProps) {
	const [isImageError, setIsImageError] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const { data: session } = useSession();

	const handleSave = async () => {
		if (!session?.user) {
			// Could show a toast or redirect to login
			alert("Please log in to save cars");
			return;
		}
		setIsSaving(true);
		toast.promise(api.post(`/cars/${car.id}/save`), {
			loading: "Saving...",
			success: () => {
				setIsSaving(false);
				onSaved?.();
				return "Car saved";
			},
			error: () => {
				setIsSaving(false);
				return "Failed to save car";
			},
		});
	};

	return (
		<Card
			className={cn(
				"group overflow-hidden transition-all p-0",
				car.bookmark &&
					"bg-gradient-to-br from-purple-200 to-pink-50 dark:from-purple-950 dark:to-pink-950 ring-2 ring-purple-200",
			)}
		>
			<div className="relative aspect-[16/9] overflow-hidden">
				{car.avatarUrl && !isImageError ? (
					<Image
						src={car.avatarUrl || "/placeholder.svg"}
						alt={car.model}
						fill
						loading="eager"
						onError={() => setIsImageError(true)}
						className={`h-full w-full object-cover hover:scale-105 duration-300 transition-all`}
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

				<div className="absolute top-3 right-3 flex items-center gap-2">
					<Badge
						variant="outline"
						className="bg-background/80 backdrop-blur-sm border-border/50 text-foreground"
					>
						No. <span className="font-bold">{car.toyIndex}</span>
					</Badge>
				</div>
			</div>
			<CardContent
				className={cn(
					"px-4 relative",
					(!session?.user || hideOwnedBadge) && "pb-4",
					car.bookmark && "border-pink-200",
				)}
			>
				<div className="space-y-2">
					<h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-relaxed">
						{car.model}
					</h3>
					<div className="flex items-center justify-between">
						<span className="text-xs text-muted-foreground">
							#{car.toyCode}
						</span>
					</div>
					<div className="flex items-center mt-2 flex-wrap gap-2">
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

			{session?.user && !hideOwnedBadge && (
				<CardFooter className="py-2">
					{!car.bookmark ? (
						<Button
							size="xs"
							variant="secondary"
							onClick={handleSave}
							disabled={isSaving}
						>
							<HugeiconsIcon
								icon={BookmarkAdd01Icon}
								className="size-4"
								strokeWidth={2}
							/>
							Save to collection
						</Button>
					) : (
						<Badge>
							<HugeiconsIcon
								icon={BookmarkCheck02Icon}
								className="size-4"
								strokeWidth={2}
							/>
							Owned
						</Badge>
					)}
				</CardFooter>
			)}
		</Card>
	);
}
