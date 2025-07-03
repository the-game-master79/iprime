import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

// Use Vite/CRA env vars for browser compatibility
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Solid color palette for card and icon (no gradients)
const cardBorder = "border-blue-200";
const iconBg = "bg-blue-600";
const iconText = "text-white";
const titleText = "text-blue-800";

export const ClEngine = () => {
  const [pairs, setPairs] = useState<
    { id: string; symbol: string; image_url?: string }[]
  >([]);
  const [current, setCurrent] = useState(0);
  const [dailyProfit, setDailyProfit] = useState<number>(0);
  const [pairProfits, setPairProfits] = useState<Record<string, number>>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    supabase
      .from("trading_pairs")
      .select("id,symbol,image_url")
      .then(({ data }) => {
        if (data) {
          // Shuffle the pairs array for random order
          const shuffled = [...data].sort(() => Math.random() - 0.5);
          setPairs(shuffled);
        }
      });
    // Cleanup: no need to do anything for supabase client
    // eslint-disable-next-line
  }, []);

  // Generate and persist a random profit for each pair for the current day
  useEffect(() => {
    if (!pairs.length) return;
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const min = 29358, max = 104883;
    const profits: Record<string, number> = {};
    pairs.forEach((pair) => {
      const key = `clengine-daily-profit-${pair.id}-${today}`;
      let profit = localStorage.getItem(key);
      if (!profit) {
        profit = (Math.floor(Math.random() * (max - min + 1)) + min).toString();
        localStorage.setItem(key, profit);
      }
      profits[pair.id] = Number(profit);
    });
    setPairProfits(profits);
  }, [pairs]);

  // Marquee effect: duplicate pairs for seamless loop
  const marqueePairs = pairs.length > 0 ? [...pairs, ...pairs] : [];

  return (
    <div className="w-full max-w-[1200px] mx-auto my-20 px-4">
      <div
        className={`relative rounded-2xl bg-white border ${cardBorder} p-8 md:p-14 overflow-hidden transition-all group hover:scale-[1.03] hover:shadow-xl group-hover:rounded-2xl`}
      >
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <span className={`inline-flex items-center justify-center ${iconBg} rounded-full p-3 shadow-lg`}>
                <svg width="36" height="36" fill="none" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="18" fill="#fff" fillOpacity="0.10" />
                  <path
                    d="M12 25l6-14 6 14"
                    stroke="#fff"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <h2 className={`text-4xl md:text-5xl font-extrabold ${titleText} tracking-tight`}>
                CL Engine
              </h2>
            </div>
          </div>
          <p className="text-lg md:text-xl text-foreground mb-8 max-w-2xl">
            <span className="font-bold text-foreground">CL Engine</span> is our
            next-generation trading engine, purpose-built for {" "}
            <span className="text-primary font-semibold">speed</span>, {" "}
            <span className="text-primary font-semibold">reliability</span>, and {" "}
            <span className="text-primary font-semibold">
              institutional-grade execution
            </span>
            . Every trade is powered by:
          </p>
          <ul className="space-y-4 mb-0">
            <li className="flex items-start gap-3">
              <span className="mt-1 text-blue-500">
                <svg
                  width="22"
                  height="22"
                  fill="none"
                  viewBox="0 0 22 22"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="11"
                    fill="#38bdf8"
                    fillOpacity="0.18"
                  />
                  <path
                    d="M7 11.5l3 3 5-6"
                    stroke="#38bdf8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="text-base md:text-lg text-foreground">
                <span className="font-semibold text-foreground">Ultra-low latency</span>{" "}
                order processing for lightning-fast trades.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 text-blue-500">
                <svg
                  width="22"
                  height="22"
                  fill="none"
                  viewBox="0 0 22 22"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="11"
                    fill="#38bdf8"
                    fillOpacity="0.18"
                  />
                  <path
                    d="M7 11.5l3 3 5-6"
                    stroke="#38bdf8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="text-base md:text-lg text-foreground">
                <span className="font-semibold text-foreground">Advanced risk management</span> and smart order routing.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 text-blue-500">
                <svg
                  width="22"
                  height="22"
                  fill="none"
                  viewBox="0 0 22 22"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="11"
                    fill="#38bdf8"
                    fillOpacity="0.18"
                  />
                  <path
                    d="M7 11.5l3 3 5-6"
                    stroke="#38bdf8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="text-base md:text-lg text-foreground">
                <span className="font-semibold text-foreground">Cloud-native scalability</span> for global reliability.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 text-blue-500">
                <svg
                  width="22"
                  height="22"
                  fill="none"
                  viewBox="0 0 22 22"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="11"
                    fill="#38bdf8"
                    fillOpacity="0.18"
                  />
                  <path
                    d="M7 11.5l3 3 5-6"
                    stroke="#38bdf8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="text-base md:text-lg text-foreground">
                <span className="font-semibold text-foreground">Real-time analytics</span> and transparent reporting.
              </span>
            </li>
          </ul>
          {/* Trading pairs display */}
          {pairs.length > 0 && (
            <div className="mt-10 min-h-[90px]">
              <div className="w-full h-[80px] overflow-hidden relative">
                <div
                  className="flex items-center gap-4 whitespace-nowrap animate-marquee"
                  style={{
                    animation: "marquee 22s linear infinite",
                  }}
                >
                  {marqueePairs.map((pair, idx) => (
                    <div
                      key={pair.id + "-" + idx}
                      className="flex flex-col items-center justify-center min-w-[120px] mx-2 px-3 py-2 rounded-lg border border-blue-100 bg-blue-50 group transition-all hover:shadow-md hover:scale-105"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {pair.image_url && (
                          <span className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100">
                            <img
                              src={pair.image_url}
                              alt={pair.symbol}
                              className="w-6 h-6 object-contain"
                              loading="lazy"
                            />
                          </span>
                        )}
                        <span className="font-bold text-base text-blue-900 tracking-tight">{pair.symbol}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-green-500">
                          <svg width="16" height="16" fill="none" viewBox="0 0 20 20">
                            <path d="M3 13l4-4 3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M17 13V7h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                        <span className="font-bold text-green-600 text-sm tracking-tight">
                          +${pairProfits[pair.id]?.toLocaleString() ?? "--"}
                        </span>
                        <span className="text-[10px] text-blue-800/60 font-medium ml-1">today</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};