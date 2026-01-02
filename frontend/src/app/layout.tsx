import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type React from "react";
import "../styles/globals.css";
import "react-photo-view/dist/react-photo-view.css";
import { AuthProvider } from "@/components/auth";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const fontSans = Bricolage_Grotesque({
	subsets: ["vietnamese", "latin"],
	weight: ["400", "500", "600", "700"],
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
		<html lang="en" suppressHydrationWarning className={fontSans.variable}>
			<body
				className={`font-sans antialiased bg-background text-foreground ${fontSans.className}`}
			>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<NuqsAdapter>
						<AuthProvider>{children}</AuthProvider>
					</NuqsAdapter>
					<Toaster />
				</ThemeProvider>
			</body>
		</html>
	);
}
