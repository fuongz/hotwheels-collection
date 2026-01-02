"use client";

import {
	ArrowDown01Icon,
	CarParking02Icon,
	Logout01Icon,
	SettingsIcon,
	UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useState } from "react";
import { signOut, useSession } from "@/lib/auth-client";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "../ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { AuthDialogUserSettings } from "./dialog-user-settings";

export function UserOptions() {
	// -- state
	const [openSettings, setOpenSettings] = useState(false);
	const [openLogoutConfirm, setOpenLogoutConfirm] = useState(false);

	// -- hooks
	const { data: session } = useSession();

	const handleLogout = async () => {
		await signOut();
		setOpenLogoutConfirm(false);
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
					<Avatar className="size-3">
						<AvatarImage src={session?.user.image || undefined} />
						<AvatarFallback>
							<HugeiconsIcon icon={UserIcon} className="size-2" />
						</AvatarFallback>
					</Avatar>
					<span className="max-w-[250px] truncate hidden sm:block">
						{session?.user.name}
					</span>
					<HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-60 sm:w-none max-w-100">
					<DropdownMenuGroup>
						<DropdownMenuLabel>
							<div className="flex gap-2">
								<Avatar className="size-7">
									<AvatarImage src={session?.user.image || undefined} />
									<AvatarFallback>
										<HugeiconsIcon icon={UserIcon} />
									</AvatarFallback>
								</Avatar>
								<div className="flex flex-col text-foreground space-y-1">
									<p className="text-xs font-medium leading-none">
										{session?.user.name || "User"}
									</p>
									<p className="text-muted-foreground text-xs leading-none">
										{session?.user.email}
									</p>
								</div>
							</div>
						</DropdownMenuLabel>
					</DropdownMenuGroup>
					<DropdownMenuSeparator />
					<DropdownMenuGroup>
						<DropdownMenuItem
							className="cursor-pointer"
							render={<Link href="/me/cars" />}
						>
							<HugeiconsIcon
								icon={CarParking02Icon}
								className="text-muted-foreground"
							/>
							My garage
						</DropdownMenuItem>
					</DropdownMenuGroup>
					<DropdownMenuSeparator />
					<DropdownMenuGroup>
						<DropdownMenuItem
							className="cursor-pointer"
							onClick={() => setOpenSettings(true)}
						>
							<HugeiconsIcon
								icon={SettingsIcon}
								className="text-muted-foreground"
							/>
							Settings
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							variant="destructive"
							onClick={() => setOpenLogoutConfirm(true)}
							className="cursor-pointer"
						>
							<HugeiconsIcon icon={Logout01Icon} />
							Log out
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>

			<AuthDialogUserSettings open={openSettings} setOpen={setOpenSettings} />

			<AlertDialog open={openLogoutConfirm} onOpenChange={setOpenLogoutConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
						<AlertDialogDescription>
							You will be signed out of your account and redirected to the home
							page.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleLogout}>Log out</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
