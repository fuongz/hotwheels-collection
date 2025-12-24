"use client";

import {
	CarParking02Icon,
	Logout01Icon,
	SettingsIcon,
	UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useState } from "react";
import { signOut, useSession } from "@/lib/auth-client";
import { Avatar, AvatarFallback } from "../ui/avatar";
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

	// -- hooks
	const { data: session } = useSession();

	const handleLogout = async () => {
		await signOut();
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger render={<Button variant="outline" size="xs" />}>
					<Avatar className="size-3">
						<AvatarFallback>
							<HugeiconsIcon icon={UserIcon} className="size-2" />
						</AvatarFallback>
					</Avatar>
					<span className="max-w-[250px] truncate">{session?.user.email}</span>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="max-w-100">
					<DropdownMenuGroup>
						<DropdownMenuLabel>
							<div className="flex flex-col text-foreground space-y-1">
								<p className="text-xs font-medium leading-none">
									{session?.user.name || "User"}
								</p>
								<p className="text-muted-foreground text-xs leading-none">
									{session?.user.email}
								</p>
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
							Your cars
						</DropdownMenuItem>
					</DropdownMenuGroup>
					<DropdownMenuSeparator />
					<DropdownMenuGroup>
						<DropdownMenuItem onClick={() => setOpenSettings(true)}>
							<HugeiconsIcon
								icon={SettingsIcon}
								className="text-muted-foreground cursor-pointer"
							/>
							Settings
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem variant="destructive" onClick={handleLogout}>
							<HugeiconsIcon icon={Logout01Icon} />
							Log out
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>

			<AuthDialogUserSettings open={openSettings} setOpen={setOpenSettings} />
		</>
	);
}
