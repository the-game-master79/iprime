import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, DollarSign, ArrowDownCircle, ArrowUpCircle, BarChart2, TrendingUp, ChevronLeft, ChevronRight, Cpu } from "lucide-react";

// Desktop sidebar items (no Markets, add AlphaQuant)
const sidebarItems = [
	{ label: "Home", icon: <Home size={20} />, path: "/platform" },
	{ label: "Deposit", icon: <ArrowDownCircle size={20} />, path: "/cashier" },
	{ label: "Payout", icon: <ArrowUpCircle size={20} />, path: "/cashier?tab=payout" },
	{ label: "History", icon: <BarChart2 size={20} />, path: "/history" },
	{ label: "Trade", icon: <TrendingUp size={20} />, path: "/tradingstation" },
	{ label: "AlphaQuant", icon: <Cpu size={20} />, path: "/plans" },
	// Removed Markets
];

// Mobile sidebar items: Home, Deposit, Trade, AlphaQuant only
const mobileSidebarItems = [
	{ label: "Home", icon: <Home size={20} />, path: "/platform" },
	{ label: "Deposit", icon: <ArrowDownCircle size={20} />, path: "/cashier" },
	{ label: "History", icon: <BarChart2 size={20} />, path: "/history" },
	{ label: "Trade", icon: <TrendingUp size={20} />, path: "/tradingstation" },
	{ label: "AlphaQuant", icon: <Cpu size={20} />, path: "/plans" }, // Fix path to match desktop
];

export const PlatformSidebar: React.FC = () => {
	const navigate = useNavigate();
	const location = useLocation();
	// Set sidebar to be collapsed by default
	const [collapsed, setCollapsed] = useState(true);

	const getActiveSidebarItem = () => {
		// Special handling for /cashier and /cashier?tab=payout
		if (location.pathname === "/cashier") {
			const params = new URLSearchParams(location.search);
			if (params.get("tab") === "payout") {
				return "Payout";
			}
			return "Deposit";
		}
		// Otherwise, match by pathname
		const match = sidebarItems.find(item => item.path.split("?")[0] === location.pathname);
		return match ? match.label : "";
	};
	const activeLabel = getActiveSidebarItem();

	return (
		<>
			{/* Desktop Sidebar */}
			<aside
				className={`hidden md:flex flex-col h-[100dvh] bg-background border-r border-border py-1 px-1 z-10 transition-all duration-300 sticky top-[var(--topbar-height,64px)] ${
					collapsed ? "w-16" : "w-56"
				}`}
			>
				<nav className="flex flex-col gap-1 flex-1">
					{sidebarItems.map((item) => (
						<button
							key={item.label}
							className={`flex items-center px-2 py-1 rounded-md text-center transition-all duration-200 font-medium text-sm hover:bg-secondary-foreground focus:outline-none ${
								activeLabel === item.label ? "bg-secondary text-primary" : "text-foreground"
							}`}
							onClick={() => navigate(item.path)}
							style={{ minHeight: 32, position: 'relative' }}
							onMouseEnter={e => {
								const tooltip = e.currentTarget.querySelector('.sidebar-tooltip') as HTMLElement | null;
								if (tooltip) tooltip.style.opacity = '1';
							}}
							onMouseLeave={e => {
								const tooltip = e.currentTarget.querySelector('.sidebar-tooltip') as HTMLElement | null;
								if (tooltip) tooltip.style.opacity = '0';
							}}
						>
							<span className={`flex items-center justify-center transition-all duration-200 ${collapsed ? "mx-auto" : "justify-start"} rounded-md w-8 h-8`}>{item.icon}</span>
							<span
								className={`transition-all duration-200 overflow-hidden whitespace-nowrap ${
									collapsed ? "w-0 opacity-0 ml-0" : "w-auto opacity-100 ml-1"
								}`}
							>
								{item.label}
							</span>
							{collapsed && (
								<span
									className="sidebar-tooltip pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 rounded bg-black text-white text-xs opacity-0 transition-opacity duration-200 z-50 shadow-lg"
									style={{ whiteSpace: 'nowrap' }}
								>
									{item.label}
								</span>
							)}
						</button>
					))}
				</nav>
				{/* Collapse button styled like other sidebar buttons */}
				<div className="sticky bottom-0 bg-background z-20 w-full">
					<button
						className={`flex items-center px-2 py-1 rounded-md text-center transition-all duration-200 font-medium text-sm hover:bg-secondary focus:outline-none w-full mb-1 ${
							collapsed ? "justify-center" : "justify-start"
						}`}
						onClick={() => setCollapsed((prev) => !prev)}
						aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
						style={{ minHeight: 32, position: 'relative' }}
					>
						<span className="flex items-center justify-center rounded-md w-8 h-8">
							{collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
						</span>
					</button>
				</div>
			</aside>

			{/* Mobile Bottom Navigation */}
			<nav className="fixed bottom-0 left-0 right-0 z-20 flex md:hidden bg-secondary border-t border-border h-14 px-1 justify-around items-center">
				{mobileSidebarItems.map((item) => (
					<button
						key={item.label}
						className={`flex flex-col items-center justify-center flex-1 h-full px-0.5 py-0.5 rounded-md transition-all duration-200 font-medium text-xs hover:bg-muted/70 focus:outline-none ${
							activeLabel === item.label ? "bg-muted text-primary" : "text-foreground"
						}`}
						onClick={() => navigate(item.path)}
					>
						<span className="flex items-center justify-center w-7 h-7">{item.icon}</span>
						<span className="mt-0.5 text-[11px]">{item.label}</span>
					</button>
				))}
			</nav>
		</>
	);
};
