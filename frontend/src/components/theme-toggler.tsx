"use client";

import { Monitor, Moon02Icon, Sun01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./ui/tooltip";

export function ThemeToggle() {
	const { setTheme } = useTheme();
	return (
		<TooltipProvider>
			<DropdownMenu>
				<Tooltip>
					<TooltipTrigger
						render={
							<DropdownMenuTrigger
								render={
									<Button
										className="cursor-pointer"
										variant="secondary"
										size="icon-sm"
									/>
								}
							/>
						}
					>
						<Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
						<Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
						<span className="sr-only">Toggle theme</span>
					</TooltipTrigger>
					<TooltipContent>
						<p>Toggle theme</p>
					</TooltipContent>
				</Tooltip>
				<DropdownMenuContent align="end">
					<DropdownMenuItem
						onClick={() => setTheme("light")}
						className="cursor-pointer"
					>
						<HugeiconsIcon icon={Sun01Icon} className="text-muted-foreground" />
						Light
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => setTheme("dark")}
						className="cursor-pointer"
					>
						<HugeiconsIcon
							icon={Moon02Icon}
							className="text-muted-foreground"
						/>
						Dark
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => setTheme("system")}
						className="cursor-pointer"
					>
						<HugeiconsIcon icon={Monitor} className="text-muted-foreground" />
						System
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</TooltipProvider>
	);
}
