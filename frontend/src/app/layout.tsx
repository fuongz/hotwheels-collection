import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type React from "react";
import "./globals.css";
import { FavouriteIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import Link from "next/link";

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
		<html lang="en" className={jetbrainsMono.variable}>
			<body
				className={`font-sans antialiased bg-background text-foreground ${jetbrainsMono.className}`}
			>
				<NuqsAdapter>
					{/* Header */}
					<header className="bg-card sticky top-0 z-10">
						<div className="container mx-auto px-4 py-2">
							<div className="flex justify-between items-center">
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
								<p className="text-xs">
									Built with{" "}
									<HugeiconsIcon
										icon={FavouriteIcon}
										className="fill-red-500 size-4 text-red-600 inline-block"
									/>{" "}
									by{" "}
									<Link
										href="https://phuongphung.com/?ref=hotwheels-collection"
										target="_blank"
									>
										fuongz
									</Link>
								</p>
							</div>
						</div>
					</header>
					{children}
				</NuqsAdapter>
			</body>
		</html>
	);
}
