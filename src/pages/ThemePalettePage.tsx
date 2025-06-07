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
	"--card-foreground", // Added card-foreground
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
	"--button",
	// Add more if you define more in index.css
];

// Helper to convert HSL string to HEX
function hslToHex(hsl: string) {
	try {
		const [h, s, l] = hsl
			.replace(/[^\d., ]/g, "")
			.split(/[ ,]+/)
			.map(Number);
		if (isNaN(h) || isNaN(s) || isNaN(l)) return "";
		const a = s / 100;
		const b = l / 100;
		const f = (n: number) => {
			const k = (n + h / 30) % 12;
			const color = b - a * Math.min(b, 1 - b) * Math.max(Math.min(k - 3, 9 - k, 1), -1);
			return Math.round(255 * color)
				.toString(16)
				.padStart(2, "0");
		};
		return `#${f(0)}${f(8)}${f(4)}`;
	} catch {
		return "";
	}
}

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
						className={`rounded-xl border shadow-md p-6 w-[340px] ${
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
							{paletteVars.map((v) => {
								const el =
									document.querySelector(`[data-theme='${mode}']`) ||
									document.documentElement;
								const hsl = getComputedStyle(el).getPropertyValue(v).trim();
								const hslString = hsl
									? (hsl.match(/^\d/) ? `hsl(${hsl})` : hsl)
									: "";
								const hex = hsl && hsl.match(/^\d/) ? hslToHex(hsl) : "";
								return (
									<div key={v} className="flex items-center gap-3">
										<div
											className="w-10 h-10 rounded border"
											style={{
												background: hslString || "#fff",
												borderColor: "#525252",
											}}
										/>
										<span className="font-mono text-sm">{v}</span>
										<span className="ml-auto text-xs text-muted-foreground">
											{hslString}
										</span>
										{hex && (
											<span className="ml-2 text-xs text-muted-foreground font-mono">
												{hex}
											</span>
										)}
									</div>
								);
							})}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
