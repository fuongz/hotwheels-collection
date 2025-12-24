import { Check, GoogleIcon, UserIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Account } from "better-auth";
import { useEffect, useState } from "react";
import { listAccounts } from "@/lib/auth-client";
import {
	Badge,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	Spinner,
} from "../ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

export function AuthDialogUserSettings({
	open,
	setOpen,
}: {
	open: boolean;
	setOpen?: (open: boolean) => void;
}) {
	const [accounts, setAccounts] = useState<Account[] | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: no need
	useEffect(() => {
		if (open && !accounts) {
			fetchAccounts();
		}
	}, [open, accounts]);

	async function fetchAccounts() {
		const { data: accounts } = await listAccounts();
		setAccounts(accounts);
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(open) => {
				if (setOpen) {
					setOpen(open);
				}
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>User Settings</DialogTitle>
					<DialogDescription>Customize your settings</DialogDescription>
				</DialogHeader>

				<Tabs defaultValue="accounts">
					<TabsList>
						<TabsTrigger value="accounts">Accounts</TabsTrigger>
					</TabsList>
					<TabsContent value="accounts">
						<Card>
							<CardHeader>
								<CardTitle>Linked Accounts</CardTitle>
							</CardHeader>
							<CardContent>
								{!accounts && (
									<Badge variant="secondary">
										<Spinner size="sm" /> Loading...
									</Badge>
								)}
								{accounts?.map((account) => (
									<div
										key={account.id}
										className="flex gap-2 items-center justify-between px-2 py-1 border"
									>
										<div className="flex gap-2 items-center">
											<HugeiconsIcon
												icon={
													account.providerId === "google"
														? GoogleIcon
														: UserIcon
												}
												className="size-4"
											/>
											<span className="capitalize font-semibold">
												{account.providerId} Account
											</span>
										</div>
										<Badge variant="secondary">
											<HugeiconsIcon
												icon={Check}
												className="size-4 text-green-600"
											/>
											Connected
										</Badge>
									</div>
								))}
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
