import Link from "next/link";

export function Footer() {
	return (
		<footer className="border-t border-border/50 mt-12 py-6">
			<div className="container mx-auto px-4 text-center text-xs text-muted-foreground space-y-1">
				<p>
					Car data sourced from{" "}
					<Link
						href="https://hotwheels.fandom.com"
						target="_blank"
						rel="noopener noreferrer"
						className="underline hover:text-foreground transition-colors"
					>
						Hot Wheels Wiki
					</Link>{" "}
					and is available under{" "}
					<Link
						href="https://creativecommons.org/licenses/by-sa/4.0/"
						target="_blank"
						rel="noopener noreferrer"
						className="underline hover:text-foreground transition-colors"
					>
						CC-BY-SA
					</Link>
					.
				</p>
				<p>
					Hot Wheels is a registered trademark of Mattel, Inc. This site is not
					affiliated with or endorsed by Mattel.
				</p>
			</div>
		</footer>
	);
}
