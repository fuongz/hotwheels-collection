"use client";

import {
	BookmarkAdd01Icon,
	BookmarkCheck02Icon,
	DatabaseSync01Icon,
	Folder01Icon,
	ImageDownload02Icon,
	ImageNotFound01Icon,
	ImageUploadIcon,
	MoreHorizontalFreeIcons,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { PhotoView } from "react-photo-view";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import type { Car } from "@/types/car";
import { DialogUploadImage } from "./dialog-upload-image";

interface CarCardProps {
	car: Car;
	onSaved?: () => void;
	hideOwnedBadge?: boolean;
	size?: "full" | "mini";
}

export function CarCard({
	car,
	onSaved,
	hideOwnedBadge,
	size = "full",
}: CarCardProps) {
	const [isImageError, setIsImageError] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
	const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
	const [isRemoveImageDialogOpen, setIsRemoveImageDialogOpen] = useState(false);

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

	const handleSyncData = async () => {
		if (session?.user.role !== "admin") {
			toast.error("You must be an admin to do this action");
			return;
		}
		setIsSyncDialogOpen(false);
		toast.promise(api.post(`/cars/${car.id}/sync`), {
			loading: "Syncing data...",
			success: () => {
				onSaved?.();
				return "Data synced successfully";
			},
			error: () => {
				return "Failed to sync data";
			},
		});
	};

	const handleRemoveImage = async () => {
		if (session?.user.role !== "admin") {
			toast.error("You must be an admin to do this action");
			return;
		}
		setIsRemoveImageDialogOpen(false);
		toast.promise(api.post(`/cars/${car.id}/remove-image`), {
			loading: "Removing image...",
			success: () => {
				setIsImageError(true);
				return "Image removed";
			},
			error: () => {
				return "Failed to remove image";
			},
		});
	};

	return (
		<Card
			className={cn(
				"group overflow-hidden transition-all p-0",
				car.bookmark && "ring-2 ring-indigo-200 bg-indigo-50",
			)}
		>
			<div className="relative aspect-[16/9] overflow-hidden">
				{car.avatarUrl && !isImageError ? (
					<PhotoView src={car.avatarUrl}>
						<Image
							src={car.avatarUrl}
							alt={car.model}
							fill
							loading="eager"
							onError={() => setIsImageError(true)}
							className={`h-full w-full object-cover hover:scale-105 duration-300 transition-all cursor-pointer`}
						/>
					</PhotoView>
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
			{size === "full" && (
				<CardContent
					className={cn(
						"px-4 relative flex-1",
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
							{car.series?.map((s, index: number) => (
								<Link href={`/collections/${s.id}`} key={`${s.id}-${index}`}>
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
			)}

			{session?.user && !hideOwnedBadge && (
				<CardFooter
					className={cn(
						"py-2 bg-transparent",
						car.bookmark && "border-indigo-200 border-t-2 bg-indigo-50",
					)}
				>
					{!car.bookmark ? (
						<Button size="xs" onClick={handleSave} disabled={isSaving}>
							<HugeiconsIcon
								icon={BookmarkAdd01Icon}
								className="size-4"
								strokeWidth={2}
							/>
							<span className="hidden sm:block">Save</span>
						</Button>
					) : (
						<Badge
							variant="outline"
							className="bg-indigo-200 border-indigo-300 text-indigo-600 dark:bg-indigo-950 dark:border-indigo-950 dark:text-indigo-50"
						>
							<HugeiconsIcon
								icon={BookmarkCheck02Icon}
								className="size-4"
								strokeWidth={2}
							/>
							Owned
						</Badge>
					)}

					{session.user.role === "admin" && (
						<div className="ml-auto">
							<DropdownMenu>
								<DropdownMenuTrigger
									render={<Button size="icon-xs" variant="secondary" />}
								>
									<HugeiconsIcon
										icon={MoreHorizontalFreeIcons}
										className="size-4"
										strokeWidth={2}
									/>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-40">
									<DropdownMenuItem onClick={() => setIsSyncDialogOpen(true)}>
										<HugeiconsIcon
											icon={DatabaseSync01Icon}
											className="size-4 mr-2"
											strokeWidth={2}
										/>
										Sync data
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => setIsRemoveImageDialogOpen(true)}
									>
										<HugeiconsIcon
											icon={ImageNotFound01Icon}
											className="size-4 mr-2"
											strokeWidth={2}
										/>
										Remove image
									</DropdownMenuItem>
									<DropdownMenuItem onClick={() => setIsUploadDialogOpen(true)}>
										<HugeiconsIcon
											icon={ImageUploadIcon}
											className="size-4 mr-2"
											strokeWidth={2}
										/>
										Upload image
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					)}
				</CardFooter>
			)}

			<DialogUploadImage
				open={isUploadDialogOpen}
				setOpen={setIsUploadDialogOpen}
				car={car}
			/>

			{/* Sync Data Confirmation Dialog */}
			<AlertDialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Sync Car Data</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to sync the data for this car? This will
							update the car information from the external source.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleSyncData}>
							Sync Data
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Remove Image Confirmation Dialog */}
			<AlertDialog
				open={isRemoveImageDialogOpen}
				onOpenChange={setIsRemoveImageDialogOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove Car Image</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to remove the image for this car? This
							action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleRemoveImage}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Remove Image
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Card>
	);
}
