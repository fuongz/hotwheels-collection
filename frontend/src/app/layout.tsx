import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type React from "react";
import "./globals.css";
import { FavouriteIcon, GithubFreeIcons } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import Link from "next/link";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggler";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const jetbrainsMono = JetBrains_Mono({
	subsets: ["latin"],
	variable: "--font-sans",
});

export const metadata: Metadata = {
	title: "Hot Wheels Collection",
	description: "Hot Wheels car collection showcase",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning className={jetbrainsMono.variable}>
			<body
				className={`font-sans antialiased bg-background text-foreground ${jetbrainsMono.className}`}
			>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<NuqsAdapter>
						{/* Header */}
						<header className="bg-card sticky top-0 z-10">
							<div className="container mx-auto px-4 py-2">
								<div className="flex gap-4 justify-between items-center">
									<Link href="/" className="flex items-center gap-3">
										<Image
											src="/logo.svg"
											alt="Logo"
											width={24}
											height={24}
											priority
										/>
										<div>
											<h1 className="font-bold text-foreground">/home</h1>
										</div>
									</Link>
									<div className="flex items-center gap-2">
										<ThemeToggle />
										<Separator orientation="vertical" />
										<Button
											size="xs"
											variant="secondary"
											nativeButton={false}
											render={
												<Link
													href="https://github.com/fuongz/hotwheels-collection"
													target="_blank"
												/>
											}
										>
											<HugeiconsIcon icon={GithubFreeIcons} />
											<span>Github</span>
										</Button>
									</div>
								</div>
							</div>
						</header>
						{children}

						<div className="sticky w-full bottom-2 flex justify-center rounded z-1">
							<p className="text-xs bg-card/50 backdrop-blur-sm text-foreground px-2 py-1">
								Built with{" "}
								<HugeiconsIcon
									icon={FavouriteIcon}
									className="fill-red-500 size-3 text-red-600 inline-block"
								/>{" "}
								by{" "}
								<Link
									href="https://phuongphung.com/?ref=hotwheels-collection"
									target="_blank"
									className="border-b border-dotted font-semibold text-foreground hover:border-solid hover:text-primary transition hover:transition"
								>
									fuongz
								</Link>
							</p>
						</div>
					</NuqsAdapter>
				</ThemeProvider>
			</body>
		</html>
	);
}
