import "@/index.css";
import { useTheme } from "@/hooks/use-theme";

const paletteVars = [
	"--background",
	"--foreground",
	"--primary",
	"--primary-foreground",
	"--secondary",
	"--secondary-foreground",
	"--card",
	"--muted",
	"--muted-foreground",
	"--border",
	"--input",
	"--ring",
	"--shadow",
	"--scrollbar-thumb",
	"--scrollbar-track",
	"--warning",
	"--warning-foreground",
	"--error",
	"--error-foreground",
	"--success",
	"--success-foreground",
	// Add more if you define more in index.css
];

export default function ThemePalettePage() {
	const { theme } = useTheme();

	return (
		<div className="min-h-screen bg-background text-foreground flex flex-col items-center py-12">
			<h1 className="text-3xl font-bold mb-6">Theme Palette</h1>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
				{["light", "dark"].map((mode) => (
					<div
						key={mode}
						data-theme={mode}
						className={`rounded-xl border shadow-md p-6 w-[320px] ${
							theme === mode ? "ring-2 ring-primary" : ""
						} ${
							mode === "light"
								? "bg-background text-foreground"
								: "bg-foreground text-background"
						}`}
					>
						<h2 className="text-xl font-semibold mb-4 capitalize">
							{mode} mode
						</h2>
						<div className="space-y-2">
							{paletteVars.map((v) => (
								<div key={v} className="flex items-center gap-3">
									<div
										className="w-10 h-10 rounded border"
										style={{
											background: `hsl(var(${v}))`,
											borderColor: "#525252",
										}}
									/>
									<span className="font-mono text-sm">{v}</span>
									<span className="ml-auto text-xs text-muted-foreground">
										{
											getComputedStyle(
												document.querySelector(`[data-theme='${mode}']`) ||
												document.documentElement
											).getPropertyValue(v)
										}
									</span>
								</div>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
