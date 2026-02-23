import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Input,
	Label,
} from "@/components/ui";
import { api } from "@/lib/api-client";
import type { Car } from "@/types/car";

interface DialogUploadImageProps {
	open: boolean;
	setOpen: (value: boolean) => void;
	car: Car;
}

export function DialogUploadImage({
	open,
	setOpen,
	car,
}: DialogUploadImageProps) {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [isUploading, setIsUploading] = useState(false);

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			// Validate file type
			if (!file.type.startsWith("image/")) {
				toast.error("Please select an image file");
				return;
			}
			// Validate file size (max 2MB)
			if (file.size > 2 * 1024 * 1024) {
				toast.error("Image size should be less than 2MB");
				return;
			}
			setSelectedFile(file);
		}
	};

	const handleUploadImage = async () => {
		if (!selectedFile) {
			toast.error("Please select an image");
			return;
		}

		setIsUploading(true);

		try {
			// Convert file to buffer
			const arrayBuffer = await selectedFile.arrayBuffer();
			const buffer = new Uint8Array(arrayBuffer);

			// Send buffer to API
			await api.post(`/cars/${car.id}/upload-image`, {
				buffer: Array.from(buffer),
				filename: selectedFile.name,
				contentType: selectedFile.type,
			});

			toast.success("Image uploaded successfully");
			setOpen(false);
			setSelectedFile(null);
		} catch (err: any) {
			toast.error(`Failed to upload image ${err.message}`);
		} finally {
			setIsUploading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Upload Image</DialogTitle>
					<DialogDescription>
						Upload an image for {car.casting.name} (#{car.casting.code})
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div className="flex flex-col gap-2">
						<Label htmlFor="image-upload">Select Image</Label>
						<Input
							id="image-upload"
							type="file"
							accept="image/*"
							onChange={handleFileChange}
						/>
						{selectedFile && (
							<p className="text-xs text-muted-foreground mt-1">
								Selected: {selectedFile.name} (
								{(selectedFile.size / 1024).toFixed(2)} KB)
							</p>
						)}
					</div>
					{selectedFile && (
						<div className="relative aspect-[16/9] overflow-hidden rounded-lg border">
							<Image
								src={URL.createObjectURL(selectedFile)}
								alt="Preview"
								fill
								className="object-cover"
							/>
						</div>
					)}
				</div>
				<DialogFooter showCloseButton>
					<Button
						onClick={handleUploadImage}
						disabled={!selectedFile || isUploading}
					>
						{isUploading ? "Uploading..." : "Upload"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
