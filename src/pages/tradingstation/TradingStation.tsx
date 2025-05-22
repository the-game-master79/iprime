import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { toast } from "@/components/ui/use-toast";
import { useUserProfile } from "@/contexts/UserProfileContext";

// Import supabase client from the utility file
import { supabase } from "@/lib/supabase-client";

// Import our custom components
import Navbar from "@/components/tradingstation/Navbar";
import Sidebar from "@/components/tradingstation/Sidebar";
import ChartComponent from "@/components/tradingstation/ChartComponent";
import { Button } from "@/components/ui/button";
import TradingPanel from "@/components/tradingstation/TradingPanel";
import ActivityPanel from "@/components/tradingstation/ActivityPanel";

// Lazy load TradingPanel and ActivityPanel for mobile only
const LazyTradingPanel = typeof window !== "undefined" && window.innerWidth < 768
  ? React.lazy(() => import("@/components/tradingstation/TradingPanel"))
  : null;
const LazyActivityPanel = typeof window !== "undefined" && window.innerWidth < 768
  ? React.lazy(() => import("@/components/tradingstation/ActivityPanel"))
  : null;

// WebSocket URL from environment variables
const WS_URL = import.meta.env.VITE_WS_URL || "wss://transfers.cloudforex.club/ws";

// Add constants for WebSocket connection management
const WS_INITIAL_DELAY = 500; // 0.5 initial delay
const WS_RECONNECT_DELAY = 5000; // 5 seconds between reconnection attempts
const WS_MAX_RECONNECT_ATTEMPTS = 5; // Maximum number of reconnection attempts

interface PriceData {
  price: string;
  symbol: string;
  isPriceUp?: boolean; // Track if the price went up
}

const TradingStation = () => {
  const { profile, loading } = useUserProfile();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [localPrices, setLocalPrices] = useState<Record<string, PriceData>>({});
  // Change default tab to "crypto"
  const [activeTab, setActiveTab] = useState<"forex" | "crypto">("crypto");
  const [selectedPair, setSelectedPair] = useState<PriceData | null>(null);
  const [quantity, setQuantity] = useState<number>(0.01); // Set initial value to 0.01
  const [balance, setBalance] = useState<number>(0); // User's balance
  const [selectedPairs, setSelectedPairs] = useState<PriceData[]>([]); // Track selected pairs
  // Mobile responsive states
  const [isMobile, setIsMobile] = useState(false);
  const [activeView, setActiveView] = useState<"chart" | "trading" | "activity">("chart");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  // Track websocket connection to prevent duplicates
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null); // Animation frame ref for throttling price updates
  const pendingPricesRef = useRef<Record<string, PriceData>>({}); // Pending price updates

  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("disconnected");
  // Add state to track initial page load
  const initialLoadRef = useRef(true);
  const [selectedLeverage, setSelectedLeverage] = useState<string>("2"); // Default leverage is now 2x
  const [isCollapsed, setIsCollapsed] = useState(false); // State to track collapse
  const [activeTradeTab, setActiveTradeTab] = useState<"open" | "pending" | "closed">("open"); // State for active trade tab
  const [margin, setMargin] = useState<number>(0); // State to track margin
  const fetchBalanceCalled = useRef(false); // Track if fetchBalance has been called
  // Trade state
  const [openTrades, setOpenTrades] = useState<any[]>([]);
  const [pendingTrades, setPendingTrades] = useState<any[]>([]);
  const [closedTrades, setClosedTrades] = useState<any[]>([]);

  // Timezone state
  const [userTimezone, setUserTimezone] = useState("Etc/UTC");
  const [userProfile, setUserProfile] = useState<{ id: string; full_name?: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const checkScreenSize = () => {
      const isMobileView = window.innerWidth < 768;
      setIsMobile(isMobileView);
      
      // On initial load for mobile, show the market view
      if (initialLoadRef.current && isMobileView) {
        setShowMobileMenu(true);
        initialLoadRef.current = false;
      }
    };
    
    // Initial check
    checkScreenSize();
    
    // Add event listener for resize
    window.addEventListener("resize", checkScreenSize);
    
    // Clean up
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true);
    }
  }, [isMobile]);

  // Toggle mobile view
  const toggleMobileView = (view: "chart" | "trading" | "activity") => {
    setActiveView(view);
    // Hide mobile menu if it was open
    setShowMobileMenu(false);
  };

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
    // On mobile, also hide menu when toggling sidebar
    if (isMobile) {
      setShowMobileMenu(false);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  // Fetch user's balance from Supabase
  useEffect(() => {
    const fetchBalance = async () => {
      if (!currentUser) return;
      const { data, error } = await supabase
        .from("profiles") 
        .select("withdrawal_wallet")
        .eq("id", currentUser.id)
        .single();

      if (error) {
        console.error("Error fetching balance:", error);
      } else if (data) {
        setBalance(data.withdrawal_wallet || 0);
      }
    };

    if (!fetchBalanceCalled.current && currentUser) {
      fetchBalanceCalled.current = true;
      fetchBalance();
    }
  }, [currentUser]);

  // Setup WebSocket connection - refactored to prevent duplicates and with proper retry logic
  useEffect(() => {
    // Function to create and setup WebSocket
    const setupWebSocket = () => {
      // Clean up any existing WebSocket connection
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      // Clear any pending reconnection timer
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      
      try {
        // Create a new WebSocket connection
        setWsStatus("connecting");
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        // WebSocket event handlers
        ws.onopen = () => {
          console.log("WebSocket connected");
          setWsStatus("connected");
          reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            // Accept price, or fallback to bid, or ask
            const price =
              data.data?.price ??
              data.data?.bid ??
              data.data?.ask;
            if (data.symbol && price) {
              // Throttle price updates using requestAnimationFrame
              const prevPrice = parseFloat(localPrices[data.symbol]?.price || "0");
              const newPrice = parseFloat(price);
              pendingPricesRef.current[data.symbol] = {
                price: price.toString(),
                symbol: data.symbol,
                isPriceUp: newPrice > prevPrice,
              };
              if (!rafRef.current) {
                rafRef.current = window.requestAnimationFrame(() => {
                  setLocalPrices((prev) => ({
                    ...prev,
                    ...pendingPricesRef.current,
                  }));
                  pendingPricesRef.current = {};
                  rafRef.current = null;
                });
              }
            }
          } catch (error) {
            console.error("Error processing WebSocket message:", error);
          }
        };

        ws.onclose = (event) => {
          console.log(`WebSocket disconnected: ${event.code} ${event.reason}`);
          wsRef.current = null;
          setWsStatus("disconnected");
          
          // Don't attempt to reconnect if the component is unmounting
          // or if we've reached the maximum number of reconnection attempts
          if (reconnectAttemptsRef.current < WS_MAX_RECONNECT_ATTEMPTS) {
            reconnectAttemptsRef.current += 1;
            console.log(`Reconnecting... Attempt ${reconnectAttemptsRef.current} of ${WS_MAX_RECONNECT_ATTEMPTS}`);
            
            // Set a timer for reconnection with increasing delay
            const delay = WS_RECONNECT_DELAY * Math.min(reconnectAttemptsRef.current, 10);
            reconnectTimerRef.current = window.setTimeout(setupWebSocket, delay);
          } else {
            console.error("Maximum WebSocket reconnection attempts reached.");
            setWsStatus("error");
          }
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          setWsStatus("error");
        };
      } catch (error) {
        console.error("Error setting up WebSocket:", error);
        setWsStatus("error");
      }
    };
    
    // Delay the initial WebSocket connection
    const initialTimer = window.setTimeout(() => {
      setupWebSocket();
    }, WS_INITIAL_DELAY);
    
    // Clean up function
    return () => {
      // Clear any pending timers
      window.clearTimeout(initialTimer);
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      
      // Close the WebSocket if it exists
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        wsRef.current.close();
        wsRef.current = null;
      }
      // Cancel any pending animation frame
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []); // Empty dependency array ensures this runs only once

  // Update selected pair price when WebSocket data comes in
  useEffect(() => {
    if (selectedPair?.symbol && localPrices[selectedPair.symbol]?.price) {
      setSelectedPair(prev => prev ? { 
        ...prev, 
        price: localPrices[selectedPair.symbol].price 
      } : prev);
    }
  }, [localPrices, selectedPair?.symbol]);

  // Fetch closed trades from the trades table
  useEffect(() => {
    const fetchClosedTrades = async () => {
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("status", "closed")
        .order("closed_at", { ascending: false }); // Fetch closed trades ordered by closed_at

      if (error) {
        console.error("Error fetching closed trades:", error);
      } else {
        setClosedTrades(data || []);
      }
    };

    fetchClosedTrades();
  }, []); // Fetch only once on component mount

  // Fetch open and pending trades from DB
  useEffect(() => {
    const fetchTrades = async () => {
      // Open trades
      const { data: open, error: openError } = await supabase
        .from("trades")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (!openError && open) setOpenTrades(open);

      // Pending trades
      const { data: pending, error: pendingError } = await supabase
        .from("trades")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (!pendingError && pending) setPendingTrades(pending);
    };
    fetchTrades();
  }, []);

  const filteredPairs = Object.values(localPrices).filter((pair) => {
    const isCrypto = pair.symbol.endsWith("USDT");
    
    // Always show crypto pairs
    if (isCrypto) {
      return activeTab === "crypto" && pair.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    }
    
    // Always show forex pairs if forex tab is active
    return activeTab === "forex" && pair.symbol.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const formatPairName = (symbol: string) => {
    if (symbol.startsWith("FX:")) {
      return symbol.replace("FX:", "").replace("/", ""); // Remove FX: and /
    }
    if (symbol.startsWith("BINANCE:")) {
      return symbol.replace("BINANCE:", ""); // Remove BINANCE:
    }
    return symbol;
  };

  const getFullName = (symbol: string) => {
    const forexNames: Record<string, string> = {
      XAU: "Gold",
      EUR: "Euro",
      CHF: "Swiss Franc",
      JPY: "Yen",
      GBP: "Pounds",
      CAD: "Canadian Dollar",
      AUD: "Australian Dollar",
      USD: "US Dollar",
    };

    const cryptoNames: Record<string, string> = {
      BNBUSDT: "Binance Smart Chain",
      BTCUSDT: "Bitcoin",
      SOLUSDT: "Solana",
      ETHUSDT: "Ethereum",
      DOGEUSDT: "Dogecoin",
      LINKUSDT: "Chainlink",
      TRXUSDT: "Tron",
      ADAUSDT: "Cardano",
      DOTUSDT: "Polkadot",
    };

    if (symbol.endsWith("USDT")) {
      return cryptoNames[symbol] || "Unknown Crypto";
    }

    const baseCurrency = symbol.slice(0, 3);
    const quoteCurrency = symbol.slice(3);
    return `${forexNames[baseCurrency] || baseCurrency} Vs ${
      forexNames[quoteCurrency] || quoteCurrency
    }`;
  };

  const getCryptoImageForSymbol = (symbol: string) => {
    const cryptoImages: Record<string, string> = {
      BTCUSDT: "btc",
      ETHUSDT: "eth",
      SOLUSDT: "sol",
      DOGEUSDT: "doge",
      BNBUSDT: "bnb",
      LINKUSDT: "link",
      TRXUSDT: "trx",
      ADAUSDT: "ada",
      DOTUSDT: "dot",
      // Add more Crypto mappings here
    };

    const baseUrl = "https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public";
    // If symbol is not mapped, try to use the base asset (e.g., SOLUSDT -> sol)
    let cryptoKey = cryptoImages[symbol];
    if (!cryptoKey && symbol.endsWith("USDT")) {
      cryptoKey = symbol.replace("USDT", "").toLowerCase();
    }
    return cryptoKey
      ? `${baseUrl}/${cryptoKey}.svg`
      : `${baseUrl}/default.svg`;
  };

  // Fix getForexImageForSymbol to always use dash between base and quote
  const getForexImageForSymbol = (symbol: string) => {
    const baseUrl = "https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public";
    // Remove FX: or BINANCE: prefix, then split into base and quote, join with dash, and lowercase
    let cleanSymbol = symbol.replace(/^FX:|^BINANCE:/, "");
    if (cleanSymbol.includes("/")) {
      cleanSymbol = cleanSymbol.replace("/", "-");
    } else if (cleanSymbol.length === 6) {
      cleanSymbol = cleanSymbol.slice(0, 3) + "-" + cleanSymbol.slice(3);
    }
    cleanSymbol = cleanSymbol.toLowerCase();
    return `${baseUrl}/${cleanSymbol}.svg`;
  };

  const calculateVolumeWithLeverage = () => {
    if (!selectedPair) return "0.00";
    const price = parseFloat(selectedPair.price) || 0;
    const leverage = parseFloat(selectedLeverage) || 1;
    let volume = 0;
    if (selectedPair.symbol === "XAUUSD") {
      volume = (quantity * 100 * price) / leverage; // Gold (XAUUSD) volume divided by leverage
    } else if (selectedPair.symbol.endsWith("USDT")) {
      volume = (quantity * price) / leverage; // Crypto volume divided by leverage
    } else {
      volume = (quantity * 100000 * price) / leverage; // Forex volume divided by leverage
    }
    return volume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); // Format with 2 decimals
  };

  const getQuoteCurrency = () => {
    if (!selectedPair) return "";
    if (selectedPair.symbol === "XAUUSD") {
      return "USD"; // Gold (XAUUSD) quote currency
    } else if (selectedPair.symbol.endsWith("USDT")) {
      return "USDT"; // Crypto quote currency
    } else {
      return selectedPair.symbol.slice(3); // Forex quote currency
    }
  };

  const leverageOptions: Record<string, string[]> = {
    USDCHF: ["2", "5", "10", "20", "50", "100", "200", "500", "1000", "2000"],
    SOLUSDT: ["2", "5", "10", "20", "50", "100"],
    BNBUSDT: ["2", "5", "10", "20", "50", "100", "200", "500"],
    DOTUSDT: ["2", "5", "10", "20", "50", "100"],
    EURUSD: ["2", "5", "10", "20", "50", "100", "200", "500", "1000", "2000"],
    ETHUSDT: ["2", "5", "10", "20"],
    EURJPY: ["2", "5", "10", "20", "50", "100", "200", "500", "1000", "2000"],
    DOGEUSDT: ["1"],
    BTCUSDT: ["2", "5", "10", "20", "50", "100", "200", "500", "1000"],
    USDJPY: ["2", "5", "10", "20", "50", "100", "200", "500", "1000", "2000"],
    XAUUSD: ["2", "5", "10", "20", "50", "100", "200", "500", "1000"],
    TRXUSDT: ["2", "5", "10", "20", "50", "100"],
    AUDUSD: ["2", "5", "10", "20", "50", "100", "200", "500", "1000", "2000"],
    EURCHF: ["2", "5", "10", "20", "50", "100", "200", "500", "1000", "2000"],
    POLUSDT: ["2", "5", "10", "20", "50", "100"],
    LINKUSDT: ["2", "5", "10", "20", "50", "100"],
    GBPUSD: ["2", "5", "10", "20", "50", "100", "200", "500", "1000", "2000"],
    USDCAD: ["2", "5", "10", "20", "50", "100", "200", "500", "1000", "2000"],
    EURGBP: ["2", "5", "10", "20", "50", "100", "200", "500", "1000", "2000"],
    ADAUSDT: ["2", "5", "10", "20", "50", "100"],
  };

  // Add lots limits for all pairs
  const lotsLimits: Record<string, { min: number; max: number }> = {
    USDCHF: { min: 0.01, max: 100 },
    SOLUSDT: { min: 0.01, max: 100 },
    BNBUSDT: { min: 0.01, max: 100 },
    DOTUSDT: { min: 0.01, max: 100 },
    EURUSD: { min: 0.01, max: 100 },
    ETHUSDT: { min: 0.01, max: 100 },
    EURJPY: { min: 0.01, max: 100 },
    DOGEUSDT: { min: 1, max: 100000 },
    BTCUSDT: { min: 0.001, max: 10 },
    USDJPY: { min: 0.01, max: 100 },
    XAUUSD: { min: 0.01, max: 50 },
    TRXUSDT: { min: 10, max: 100000 },
    AUDUSD: { min: 0.01, max: 100 },
    EURCHF: { min: 0.01, max: 100 },
    POLUSDT: { min: 0.01, max: 100 },
    LINKUSDT: { min: 0.01, max: 100 },
    GBPUSD: { min: 0.01, max: 100 },
    USDCAD: { min: 0.01, max: 100 },
    EURGBP: { min: 0.01, max: 100 },
    ADAUSDT: { min: 1, max: 100000 },
    // Add more pairs as needed
  };

  const calculateMargin = () => {
    if (!selectedPair) return 0;
    const price = parseFloat(selectedPair.price) || 0;
    let leverage = parseFloat(selectedLeverage) || 1;
    let volume = 0;

    // Always apply 3x backend leverage for EURJPY and USDJPY
    if (selectedPair.symbol === "EURJPY" || selectedPair.symbol === "USDJPY") {
      leverage = leverage * 80;
    }

    if (selectedPair.symbol === "XAUUSD") {
      volume = quantity * 100 * price; // Gold (XAUUSD) volume
    } else if (selectedPair.symbol.endsWith("USDT")) {
      // Special multipliers for some crypto pairs
      let multiplier = 1;
      if (selectedPair.symbol === "DOGEUSDT" || selectedPair.symbol === "TRXUSDT") {
        multiplier = 100;
      } else if (selectedPair.symbol === "ADAUSDT") {
        multiplier = 50;
      } else if (selectedPair.symbol === "LINKUSDT") {
        multiplier = 30;
      } else if (selectedPair.symbol === "DOTUSDT") {
        multiplier = 10;
      }
      volume = quantity * price * multiplier;
    } else {
      volume = quantity * 100000 * price; // Forex volume
    }

    // Margin should always be volume divided by leverage
    return volume / leverage;
  };

  // Calculate usedMargin as the sum of margin_amount for open and pending trades
  const usedMargin = [
    ...openTrades,
    ...pendingTrades,
  ].reduce((sum, trade) => sum + (Number(trade.margin_amount) || 0), 0);

  useEffect(() => {
    const calculatedMargin = calculateMargin();
    setMargin(calculatedMargin);
  }, [quantity, selectedLeverage, selectedPair?.symbol, selectedPair?.price]); // Use primitive dependencies

  const handleBuy = () => {
    if (margin > balance) {
      alert("Insufficient balance to open this trade.");
      return;
    }
    
    if (selectedPair) {
      console.log(`Buying ${quantity} of ${selectedPair.symbol}`);
      // Add your buy logic here
    }
  };

  const handleSell = () => {
    if (margin > balance) {
      alert("Insufficient balance to open this trade.");
      return;
    }
    
    if (selectedPair) {
      console.log(`Selling ${quantity} of ${selectedPair.symbol}`);
      // Add your sell logic here
    }
  };

  // Select first forex pair on initial load
  useEffect(() => {
    // Only set selectedPair if not already set
    if (!selectedPair && Object.values(localPrices).length > 0 && activeTab === "forex") {
      const firstForexPair = Object.values(localPrices).find(pair => !pair.symbol.endsWith("USDT"));
      if (firstForexPair) {
        setSelectedPair(firstForexPair);
        setSelectedPairs([firstForexPair]);
        // Set leverage to max available for the pair
        const leverages = leverageOptions[firstForexPair.symbol || ""] || [];
        const maxLeverageForPair = Math.max(...leverages.map((l) => parseInt(l)));
        if (maxLeverageForPair !== -Infinity) {
          setSelectedLeverage(maxLeverageForPair.toString());
        }
      }
    }
    // eslint-disable-next-line
  }, [localPrices, activeTab]); // Only runs when localPrices or activeTab changes

  const handlePairClick = (pair: PriceData) => {
    // Always use the latest price from localPrices for the selected pair
    const latestPrice = localPrices[pair.symbol]?.price || pair.price;
    const updatedPair = { ...pair, price: latestPrice };

    setSelectedPair(updatedPair);
    setSelectedPairs((prev) => {
      const filtered = prev.filter((p) => p.symbol !== pair.symbol);
      return [...filtered, updatedPair].slice(-5);
    });

    // Always select the max leverage for the pair
    const leverages = leverageOptions[pair.symbol || ""] || [];
    const maxLeverageForPair = Math.max(...leverages.map((l) => parseInt(l)));

    if (maxLeverageForPair === -Infinity) {
      console.error(`No leverage options available for ${pair.symbol}`);
      return;
    }
    setSelectedLeverage(maxLeverageForPair.toString());
  };

  const handleLeverageChange = (newLeverage: string) => {
    const maxLeverageForPair = Math.max(
      ...(leverageOptions[selectedPair?.symbol || ""] || []).map((l) => parseInt(l))
    );
  
    if (parseInt(newLeverage) > maxLeverageForPair) {
      // Use the pair's max leverage without updating the database
      setSelectedLeverage(maxLeverageForPair.toString());
      console.log(
        `Selected leverage exceeds max leverage for this pair. Using max leverage: ${maxLeverageForPair}x`
      );
    } else {
      // Update leverage and save to the database
      setSelectedLeverage(newLeverage);
    }
  };

  function handleRemovePair(symbol: string): void {
    setSelectedPairs((prev) => prev.filter((pair) => pair.symbol !== symbol));
    if (selectedPair?.symbol === symbol) {
      setSelectedPair(null); // Deselect the pair if it's the one being removed
    }
  }

  const calculatePipValue = () => {
    if (!selectedPair) return { usd: "0.00", quote: "0.00" };
    const price = parseFloat(selectedPair.price) || 1; // Live price
    let pipSize = 0.0001; // Default pip size for forex
    let lotSize = 100000; // Default lot size for forex

    if (selectedPair.symbol.endsWith("USDT")) {
      pipSize = 1; // Pip size for crypto
      lotSize = 1; // Lot size for crypto
    } else if (selectedPair.symbol === "XAUUSD") {
      pipSize = 0.01; // Pip size for XAUUSD
      const value = (pipSize * quantity * 100);
      return { usd: value.toFixed(2), quote: value.toFixed(2) + " USD" };
    } else if (selectedPair.symbol.endsWith("JPY")) {
      pipSize = 0.01; // Pip size for JPY pairs
      lotSize = 100000; // Lot size for JPY pairs
    }

    const pipValueQuote = (pipSize * lotSize * quantity) / price; // Pip value in quote currency
    let pipValueUsd = pipValueQuote;
    let quoteCurrency = getQuoteCurrency();

    // If forex and quote currency is not USD, convert pip value to USD using quote/USD price if available
    if (
      selectedPair &&
      !selectedPair.symbol.endsWith("USDT") &&
      selectedPair.symbol !== "XAUUSD" &&
      quoteCurrency !== "USD"
    ) {
      const quoteUsdSymbol = quoteCurrency + "USD";
      const usdQuoteSymbol = "USD" + quoteCurrency;
      let conversionRate = 1;

      if (localPrices[quoteUsdSymbol]?.price) {
        conversionRate = parseFloat(localPrices[quoteUsdSymbol].price);
      } else if (localPrices[usdQuoteSymbol]?.price) {
        const val = parseFloat(localPrices[usdQuoteSymbol].price);
        if (val !== 0) conversionRate = 1 / val;
      }

      pipValueUsd = pipValueQuote * conversionRate;
    }

    return {
      usd: pipValueUsd.toFixed(2),
      quote: pipValueQuote.toFixed(2) + " " + quoteCurrency,
    };
  };

  // Format large numbers with K, M, B, T suffixes
  function formatLargeNumber(num: number): string {
    if (num >= 1e12) return (num / 1e12).toFixed(2).replace(/\.00$/, "") + "T";
    if (num >= 1e9)  return (num / 1e9).toFixed(2).replace(/\.00$/, "") + "B";
    if (num >= 1e6)  return (num / 1e6).toFixed(2).replace(/\.00$/, "") + "M";
    if (num >= 1e3)  return (num / 1e3).toFixed(2).replace(/\.00$/, "") + "K";
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Calculate the actual trade volume (not divided by leverage)
  const calculateActualVolume = () => {
    if (!selectedPair) return 0;
    const price = parseFloat(selectedPair.price) || 0;
    let volume = 0;
    if (selectedPair.symbol === "XAUUSD") {
      volume = quantity * 100 * price;
    } else if (selectedPair.symbol.endsWith("USDT")) {
      let multiplier = 1;
      if (selectedPair.symbol === "DOGEUSDT" || selectedPair.symbol === "TRXUSDT") {
        multiplier = 100;
      } else if (selectedPair.symbol === "ADAUSDT") {
        multiplier = 50;
      } else if (selectedPair.symbol === "LINKUSDT") {
        multiplier = 30;
      } else if (selectedPair.symbol === "DOTUSDT") {
        multiplier = 10;
      }
      volume = quantity * price * multiplier;
    } else {
      volume = quantity * 100000 * price;
    }
    return volume;
  };

  // Pagination state and logic
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const totalPages = Math.ceil(closedTrades.length / rowsPerPage);

  // Helper to get decimals for open/close price
  const getPriceDecimals = (symbol: string) => {
    if (symbol === "XAUUSD") return 2;
    if (symbol.endsWith("JPY")) return 3;
    if (symbol === "BTCUSDT" || symbol === "ETHUSDT" || symbol === "SOLUSDT" || symbol === "LINKUSDT" || symbol === "BNBUSDT") return 2;
    if (symbol === "DOGEUSDT") return 5;
    if (symbol === "ADAUSDT" || symbol === "TRXUSDT") return 4;
    if (symbol === "DOTUSDT") return 3;
    // Default: forex pairs (non-JPY, non-XSUPER, non-crypto)
    if (!symbol.endsWith("USDT")) return 5;
    // Fallback
    return 2;
  };

  const renderClosedTrades = useMemo(() => {
    return closedTrades.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map((trade) => {
      const decimals = getPriceDecimals(trade.pair);
      return (
        <tr key={trade.id} className="border-t border-border/50">
          <td className="px-4 py-2 flex items-center gap-2 text-foreground">
            <img
              src={
                trade.pair.endsWith("USDT")
                  ? getCryptoImageForSymbol(trade.pair)
                  : getForexImageForSymbol(trade.pair)
              }
              alt={trade.pair}
              className="h-6 w-6"
            />
            {formatPairName(trade.pair)}
          </td>
          <td className="px-4 py-2">
            <span
              className={`px-2 py-1 rounded-full text-white text-xs font-semibold transition-all ${
                trade.type === "Buy" ? "bg-blue-500 hover:bg-blue-600" : "bg-red-500 hover:bg-red-600"
              }`}
            >
              {trade.type.toUpperCase()}
            </span>
          </td>
          <td className="px-4 py-2">
            <span className="px-2 py-1 rounded-full bg-secondary text-foreground text-xs font-semibold hover:bg-muted/30 transition-all">
              {trade.lots.toFixed(2)}
            </span>
          </td>
          <td className="px-4 py-2 text-xs text-foreground">
            {Number(trade.open_price).toFixed(decimals)}
          </td>
          <td className="px-4 py-2 text-xs text-foreground">
            {Number(trade.close_price).toFixed(decimals)}
          </td>
          <td className="px-4 py-2 text-xs text-foreground">${Number(trade.margin_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          <td className="px-4 py-2">
            <span
              className={`px-2 py-1 rounded-full text-white text-xs font-semibold transition-all ${
                trade.leverage <= 20
                  ? "bg-green-500 hover:bg-green-600"
                  : trade.leverage <= 500
                  ? "bg-yellow-500 hover:bg-yellow-600"
                  : "bg-red-500 hover:bg-red-600"
              }`}
            >
              1:{trade.leverage}
            </span>
          </td>
          <td className="px-4 py-2 text-xs text-foreground">
            {new Date(trade.closed_at).toLocaleString("en-US", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "numeric",
              minute: "numeric",
              second: "numeric",
              hour12: true,
            })}
          </td>
          <td className={`px-4 py-2 text-xs ${Number(trade.pnl ?? 0) >= 0 ? "text-success" : "text-error"}`}>
            ${Number(trade.pnl ?? 0).toFixed(2)}
          </td>
        </tr>
      );
    });
  }, [closedTrades, currentPage, rowsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Add state for trading activity panel collapse, height, and resizing
  const [activityCollapsed, setActivityCollapsed] = useState(false);
  const [activityHeight, setActivityHeight] = useState(300);
  const activityMinHeight = 200;
  const activityMaxHeight = 500;
  const activityPanelRef = useRef<HTMLDivElement>(null);
  const resizing = useRef(false);
  const startY = useRef(0);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!resizing.current || !activityPanelRef.current) return;
      const panelRect = activityPanelRef.current.getBoundingClientRect();
      let newHeight = activityHeight + (startY.current - e.clientY);
      newHeight = Math.max(activityMinHeight, Math.min(activityMaxHeight, newHeight));
      setActivityHeight(newHeight);
    }
    function onMouseUp() {
      resizing.current = false;
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [activityHeight]);
  const onResizeStart = (e: React.MouseEvent) => {
    resizing.current = true;
    startY.current = e.clientY;
  };

  // For tab badges, update counts to use real trades:
  const openCount = openTrades.length;
  const pendingCount = pendingTrades.length;
  const closedCount = closedTrades.length;

  // Calculate free margin as balance minus used margin
  const freeMargin = balance - usedMargin;

  // Calculate margin level as a percentage
  const marginLevel = usedMargin > 0 ? (balance / usedMargin) * 100 : 0;

  // Calculate total PnL for open trades
  const totalOpenPnL = useMemo(() => {
    return openTrades.reduce((sum, trade) => {
      const currentPrice =
        localPrices[trade.pair]?.price !== undefined
          ? parseFloat(localPrices[trade.pair].price)
          : parseFloat(trade.open_price);
      const openPrice = parseFloat(trade.open_price);

      let pipSize = 0.0001;
      let lotSize = 100000;
      if (trade.pair.endsWith("USDT")) {
        pipSize = 1;
        lotSize = 1;
      } else if (trade.pair === "XAUUSD") {
        pipSize = 0.01;
        lotSize = 100;
      } else if (trade.pair.endsWith("JPY")) {
        pipSize = 0.01;
        lotSize = 100000;
      }
      const lots = Number(trade.lots) || 0;
      let pipValue = 0;
      if (trade.pair === "XAUUSD") {
        pipValue = pipSize * lots * 100;
      } else {
        pipValue = (pipSize * lotSize * lots) / (currentPrice || 1);
      }

      let pnl = 0;
      if (trade.pair.endsWith("USDT")) {
        if (trade.type?.toLowerCase() === "buy") {
          pnl = currentPrice - openPrice;
        } else if (trade.type?.toLowerCase() === "sell") {
          pnl = openPrice - currentPrice;
        }
      } else {
        if (trade.type?.toLowerCase() === "buy") {
          pnl = ((currentPrice - openPrice) / pipSize) * pipValue;
        } else if (trade.type?.toLowerCase() === "sell") {
          pnl = ((openPrice - currentPrice) / pipSize) * pipValue;
        }
      }
      return sum + pnl;
    }, 0);
  }, [openTrades, localPrices]);

  // Calculate total PnL for closed trades
  const totalClosedPnL = useMemo(() => {
    return closedTrades.reduce((sum, trade) => sum + (Number(trade.pnl) || 0), 0);
  }, [closedTrades]);

  // Determine if market is open (for disabling close buttons)
  const forexMarketStatus = getForexMarketStatus();
  const isForexMarketOpen = forexMarketStatus.isOpen;

  // Helper to check if a trade is a forex trade (not crypto)
  function isForexTrade(trade: any) {
    return !trade.pair.endsWith("USDT") && trade.pair !== "XAUUSD";
  }

  // Pass a function to ActivityPanel to determine if close should be disabled
  function isTradeCloseDisabled(trade: any) {
    if (isForexTrade(trade)) {
      return !isForexMarketOpen;
    }
    return false;
  }

  // Patch renderTrades to accept a disableClose function and pass disabled prop to Button
  function renderTrades(trades: any[]): React.ReactNode {
    // Group trades by pair and type (buy/sell)
    const grouped: Record<string, { 
      pair: string, 
      type: string, 
      trades: any[], 
      totalLots: number, 
      totalMargin: number, 
      totalLivePnl: number, 
      openedAt: string 
    }> = {};

    trades.forEach((trade) => {
      const key = `${trade.pair}|${(trade.type || "").toLowerCase()}`;
      if (!grouped[key]) {
        grouped[key] = {
          pair: trade.pair,
          type: (trade.type || "").toLowerCase(),
          trades: [],
          totalLots: 0,
          totalMargin: 0,
          totalLivePnl: 0,
          openedAt: trade.created_at,
        };
      }
      grouped[key].trades.push(trade);
      grouped[key].totalLots += Number(trade.lots) || 0;
      grouped[key].totalMargin += Number(trade.margin_amount) || 0;
      // Calculate live PnL for this trade
      const currentPrice =
        localPrices[trade.pair]?.price !== undefined
          ? parseFloat(localPrices[trade.pair].price)
          : parseFloat(trade.open_price);
      const openPrice = parseFloat(trade.open_price);

      let pipSize = 0.0001;
      let lotSize = 100000;
      if (trade.pair.endsWith("USDT")) {
        pipSize = 1;
        lotSize = 1;
      } else if (trade.pair === "XAUUSD") {
        pipSize = 0.01;
        lotSize = 100;
      } else if (trade.pair.endsWith("JPY")) {
        pipSize = 0.01;
        lotSize = 100000;
      }
      const lots = Number(trade.lots) || 0;
      let pipValue = 0;
      if (trade.pair === "XAUUSD") {
        pipValue = pipSize * lots * 100;
      } else {
        pipValue = (pipSize * lotSize * lots) / (currentPrice || 1);
      }

      let livePnl = 0;
      if (trade.pair.endsWith("USDT")) {
        if (trade.type?.toLowerCase() === "buy") {
          livePnl = currentPrice - openPrice;
        } else if (trade.type?.toLowerCase() === "sell") {
          livePnl = openPrice - currentPrice;
        }
      } else {
        if (trade.type?.toLowerCase() === "buy") {
          livePnl = ((currentPrice - openPrice) / pipSize) * pipValue;
        } else if (trade.type?.toLowerCase() === "sell") {
          livePnl = ((openPrice - currentPrice) / pipSize) * pipValue;
        }
      }
      grouped[key].totalLivePnl += livePnl;
      // Use earliest openedAt for group
      if (trade.created_at < grouped[key].openedAt) grouped[key].openedAt = trade.created_at;
    });

    // For each pair, check if both buy and sell exist and lots > 0 for both
    const pairTypes: Record<string, { buyLots: number, sellLots: number }> = {};
    Object.values(grouped).forEach((g) => {
      if (!pairTypes[g.pair]) pairTypes[g.pair] = { buyLots: 0, sellLots: 0 };
      if (g.type === "buy") pairTypes[g.pair].buyLots += g.totalLots;
      if (g.type === "sell") pairTypes[g.pair].sellLots += g.totalLots;
    });

    // Render grouped rows
    return Object.values(grouped).map((g) => {
      const decimals = getPriceDecimals(g.pair);
      const isHedged = pairTypes[g.pair].buyLots > 0 && pairTypes[g.pair].sellLots > 0;
      // Only mark as hedged if both buy and sell lots > 0
      // If more than one buy/sell, only the minimum lots are hedged, excess is not
      // But for display, we show badge if both exist

      // Use the first trade's open/close price for display, but lots/margin/pnl are summed
      const firstTrade = g.trades[0];
      const currentPrice =
        localPrices[g.pair]?.price !== undefined
          ? parseFloat(localPrices[g.pair].price)
          : parseFloat(firstTrade.open_price);

      return (
        <tr key={`${g.pair}|${g.type}`} className="border-t border-border/50">
          <td className="px-4 py-2 flex items-center gap-2">
            <img
              src={
                g.pair.endsWith("USDT")
                  ? getCryptoImageForSymbol(g.pair)
                  : getForexImageForSymbol(g.pair)
              }
              alt={g.pair}
              className="h-6 w-6"
            />
            {formatPairName(g.pair)}
          </td>
          <td className="px-4 py-2">
            {/* Show buy/sell and hedged badges in the type column */}
            <div className="flex gap-1 items-center">
              <span
                className={`px-2 py-1 rounded-full text-white text-xs font-semibold transition-all ${
                  g.type === "buy"
                    ? "bg-blue-500 hover:bg-blue-600"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {g.type.toUpperCase()}
              </span>
              {isHedged && (
                <span className="px-2 py-1 rounded-full bg-gray-500 text-white text-xs font-semibold transition-all ml-1">
                  Hedged
                </span>
              )}
            </div>
          </td>
          <td className="px-4 py-2">
            <span className="px-2 py-1 rounded-full bg-muted/20 text-xs font-semibold hover:bg-muted/30 transition-all">
              {g.totalLots.toFixed(2)}
            </span>
            {/* Show open positions count if more than 1 */}
            {g.trades.length > 0 && (
              <span className="ml-2 px-2 py-1 rounded-full bg-blue-500 text-white text-xs font-semibold">
                {g.trades.length}
              </span>
            )}
          </td>
          <td className="px-4 py-2 text-xs">
            {Number(firstTrade.open_price).toFixed(decimals)}
          </td>
          <td className="px-4 py-2 text-xs">
            {Number(currentPrice).toFixed(decimals)}
          </td>
          <td className="px-4 py-2 text-xs">
            ${g.totalMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </td>
          <td className="px-4 py-2">
            <span
              className={`px-2 py-1 rounded-full text-white text-xs font-semibold transition-all ${
                firstTrade.leverage <= 20
                  ? "bg-green-500 hover:bg-green-600"
                  : firstTrade.leverage <= 500
                  ? "bg-yellow-500 hover:bg-yellow-600"
                  : "bg-red-500 hover:bg-red-600"
              }`}
            >
              1:{firstTrade.leverage}
            </span>
          </td>
          <td className="px-4 py-2 text-xs">
            {new Date(g.openedAt).toLocaleString("en-US", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "numeric",
              minute: "numeric",
              second: "numeric",
              hour12: true,
            })}
          </td>
          <td className={`px-4 py-2 text-xs ${g.totalLivePnl >= 0 ? "text-green-500" : "text-red-500"}`}>
            ${g.totalLivePnl.toFixed(2)}
          </td>
          <td className="px-4 py-2 text-xs">
            {/* Show Close button for open trades (all trades in group are open) */}
            {g.trades.every((t) => t.status === "open") && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => g.trades.forEach((t) => handleCloseTrade(t))}
                className="w-full"
                disabled={isForexTrade(g.trades[0]) && !isForexMarketOpen}
                title={
                  isForexTrade(g.trades[0]) && !isForexMarketOpen
                    ? "Market is closed. You can only close forex trades when the market is open."
                    : "Close"
                }
              >
                Close
              </Button>
            )}
          </td>
        </tr>
      );
    });
  }

  // Add state for order type (market/limit)
  const [orderType, setOrderType] = useState<"market" | "limit">("market");

  async function handlePlaceTrade(type: "Buy" | "Sell") {
    if (!selectedPair) {
      toast({
        title: "No pair selected",
        description: "Please select a trading pair.",
        variant: "destructive",
      });
      return;
    }

    // Margin utilization check
    if (margin > freeMargin) {
      toast({
        title: "Insufficient Free Margin",
        description: `You only have $${freeMargin.toFixed(2)} free margin available.`,
        variant: "destructive",
      });
      return;
    }

    // Always use the latest price for the selected pair
    const latestPrice =
      localPrices[selectedPair.symbol]?.price || selectedPair.price;

    // Get user info
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      toast({
        title: "Authentication Error",
        description: "Please log in to place a trade.",
        variant: "destructive",
      });
      return;
    }

    // Prepare trade data, include order_type
    const tradeData = {
      user_id: user.id,
      pair: selectedPair.symbol,
      type,
      lots: quantity,
      open_price: parseFloat(latestPrice), // Use latest price here
      margin_amount: margin,
      leverage: parseInt(selectedLeverage),
      status: "open",
      created_at: new Date().toISOString(),
      pnl: 0,
      order_type: orderType, // "market" or "limit"
    };

    // Insert trade and fetch the inserted row with its real id
    const { data: inserted, error } = await supabase
      .from("trades")
      .insert([tradeData])
      .select()
      .single();

    if (error || !inserted) {
      toast({
        title: "Trade Failed",
        description: "Could not place trade. Please try again.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Trade Placed",
      description: `${type} order for ${selectedPair.symbol} placed successfully.`,
      variant: "default",
    });

    // Add the new trade with its real DB id to open trades
    setOpenTrades((prev) => [
      inserted,
      ...prev,
    ]);
  }

  // Replace handleCloseTrade with backend wallet update logic
  async function handleCloseTrade(trade: any) {
    // Defensive: ensure trade.id is a string and trimmed
    const tradeId = typeof trade.id === "string" ? trade.id.trim() : String(trade.id ?? "").trim();
    if (!tradeId) {
      toast({
        title: "Invalid Trade",
        description: "Trade ID is missing or invalid.",
        variant: "destructive",
      });
      return;
    }

    const currentPrice =
      localPrices[trade.pair]?.price !== undefined
        ? parseFloat(localPrices[trade.pair].price)
        : parseFloat(trade.open_price);

    // Calculate PnL
    let pnl = 0;
    const openPrice = parseFloat(trade.open_price);
    let pipSize = 0.0001;
    let lotSize = 100000;
    if (trade.pair.endsWith("USDT")) {
      pipSize = 1;
      lotSize = 1;
    } else if (trade.pair === "XAUUSD") {
      pipSize = 0.01;
      lotSize = 100;
    } else if (trade.pair.endsWith("JPY")) {
      pipSize = 0.01;
      lotSize = 100000;
    }
    const lots = Number(trade.lots) || 0;
    let pipValue = 0;
    if (trade.pair === "XAUUSD") {
      pipValue = pipSize * lots * 100;
    } else {
      pipValue = (pipSize * lotSize * lots) / (currentPrice || 1);
    }

    if (trade.pair.endsWith("USDT")) {
      if (trade.type?.toLowerCase() === "buy") {
        pnl = currentPrice - openPrice;
      } else if (trade.type?.toLowerCase() === "sell") {
        pnl = openPrice - currentPrice;
      }
    } else {
      if (trade.type?.toLowerCase() === "buy") {
        pnl = ((currentPrice - openPrice) / pipSize) * pipValue;
      } else if (trade.type?.toLowerCase() === "sell") {
        pnl = ((openPrice - currentPrice) / pipSize) * pipValue;
      }
    }

    // Call backend function to close trade and update wallet
    const { data, error } = await supabase.rpc("close_trade", {
      p_trade_id: tradeId,
      p_close_price: currentPrice,
      p_pnl: pnl,
    });

    if (error) {
      toast({
        title: "Close Trade Failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Optionally update UI state here if needed (refresh trades/balance)
    setOpenTrades((prev) => prev.filter((t) => t.id !== trade.id));
    setClosedTrades((prev) => [
      {
        ...trade,
        status: "closed",
        close_price: currentPrice,
        closed_at: new Date().toISOString(),
        pnl,
      },
      ...prev,
    ]);

    // Optionally, update balance (add only pnl)
    setBalance((prev) => prev + pnl);

    toast({
      title: "Trade Closed",
      description: `Trade for ${trade.pair} closed.`,
      variant: "default",
    });
  }

  // Add function to close all open trades
  const closeAllTrades = async () => {
    if (openTrades.length === 0) {
      toast({
        title: "No Open Trades",
        description: "There are no open trades to close.",
        variant: "default",
      });
      return;
    }
    
    // Remove the browser confirmation since we're using our custom dialog
    // if (!confirm(`Are you sure you want to close all ${openTrades.length} open trades?`)) {
    //   return;
    // }
    
    // Close each open trade
    let closedCount = 0;
    let totalPnl = 0;
    
    for (const trade of openTrades) {
      try {
        const currentPrice =
          localPrices[trade.pair]?.price !== undefined
            ? parseFloat(localPrices[trade.pair].price)
            : parseFloat(trade.open_price);
        
        // Calculate PnL (using existing logic)
        let pnl = 0;
        const openPrice = parseFloat(trade.open_price);
        let pipSize = 0.0001;
        let lotSize = 100000;
        if (trade.pair.endsWith("USDT")) {
          pipSize = 1;
          lotSize = 1;
        } else if (trade.pair === "XAUUSD") {
          pipSize = 0.01;
          lotSize = 100;
        } else if (trade.pair === "EURJPY" || trade.pair === "USDJPY") {
          pipSize = 0.01;
          lotSize = 100000;
        }
        const lots = Number(trade.lots) || 0;
        let pipValue = 0;
        if (trade.pair === "XAUUSD") {
          pipValue = pipSize * lots * 100;
        } else {
          pipValue = (pipSize * lotSize * lots) / (currentPrice || 1);
        }

        if (trade.pair.endsWith("USDT")) {
          if (trade.type?.toLowerCase() === "buy") {
            pnl = currentPrice - openPrice;
          } else if (trade.type?.toLowerCase() === "sell") {
            pnl = openPrice - currentPrice;
          }
        } else {
          if (trade.type?.toLowerCase() === "buy") {
            pnl = ((currentPrice - openPrice) / pipSize) * pipValue;
          } else if (trade.type?.toLowerCase() === "sell") {
            pnl = ((openPrice - currentPrice) / pipSize) * pipValue;
          }
        }
        
        // Update trade in DB
        await supabase
          .from("trades")
          .update({
            status: "closed",
            close_price: currentPrice,
            closed_at: new Date().toISOString(),
            pnl,
          })
          .eq("id", trade.id);
          
        closedCount++;
        totalPnl += pnl;
      } catch (error) {
        console.error("Error closing trade:", error);
      }
    }
    
    // Update user's balance
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id) {
        const newBalance = balance + totalPnl;
        await supabase
          .from("profiles")
          .update({ withdrawal_wallet: newBalance })
          .eq("id", user.id);
        
        // Update local balance
        setBalance(newBalance);
      }
    } catch (e) {
      console.error("Error updating balance:", e);
    }
    
    // Update UI
    const closedTradesData = openTrades.map(trade => ({
      ...trade,
      status: "closed",
      close_price: localPrices[trade.pair]?.price || trade.open_price,
      closed_at: new Date().toISOString(),
      // Use the calculated pnl from above
    }));
    
    setClosedTrades(prev => [...closedTradesData, ...prev]);
    setOpenTrades([]);
    
    toast({
      title: "Trades Closed",
      description: `Successfully closed ${closedCount} trades with total P&L: $${totalPnl.toFixed(2)}`,
      variant: "default",
    });
  };

  // Fix: Close all trades button in the header
  const handleCloseAllTrades = () => {
    closeAllTrades();
  };

    function getTradingViewSymbol(selectedPair: PriceData | null): string {
        if (!selectedPair) return "";
        const { symbol } = selectedPair;

        // Crypto: TradingView expects "BINANCE:BTCUSDT"
        if (symbol.endsWith("USDT")) {
            return `BINANCE:${symbol}`;
        }
        // Gold: TradingView expects "OANDA:XAUUSD"
        if (symbol === "XAUUSD") {
            return "OANDA:XAUUSD";
        }
        // Forex: TradingView expects "FX:EURUSD"
        if (symbol.startsWith("FX:")) {
            return symbol;
        }
        // If symbol is already prefixed (e.g., "OANDA:", "BINANCE:"), return as is
        if (symbol.includes(":")) {
            return symbol;
        }
        // Default: prefix with FX:
        return `FX:${symbol}`;
    }

  // Add forex market status helper
  function getForexMarketStatus() {
    const now = new Date();
    const utcDay = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();

    // Forex market opens Sunday 22:00 UTC, closes Friday 21:00 UTC
    let isOpen = false;
    let nextEventType = "";
    let nextEventDate = new Date(now);

    // Calculate if market is open
    if (
      (utcDay > 0 && utcDay < 5) || // Monday-Thursday: always open
      (utcDay === 5 && utcHour < 21) || // Friday before 21:00 UTC: open
      (utcDay === 0 && (utcHour > 22 || (utcHour === 22 && utcMinute >= 0))) // Sunday after 22:00 UTC: open
    ) {
      isOpen = true;
    }

    if (isOpen) {
      // Next event is close: Friday 21:00 UTC
      nextEventType = "closes";
      // Find next Friday
      const daysUntilFriday = (5 - utcDay + 7) % 7;
      nextEventDate.setUTCDate(now.getUTCDate() + daysUntilFriday);
      nextEventDate.setUTCHours(21, 0, 0, 0);
      // If today is Friday and after 21:00, move to next week's Friday
      if (utcDay === 5 && utcHour >= 21) {
        nextEventDate.setUTCDate(nextEventDate.getUTCDate() + 7);
      }
    } else {
      // Next event is open: Sunday 22:00 UTC
      nextEventType = "opens";
      // Find next Sunday
      const daysUntilSunday = (7 - utcDay) % 7;
      nextEventDate.setUTCDate(now.getUTCDate() + daysUntilSunday);
      nextEventDate.setUTCHours(22, 0, 0, 0);
      // If today is Sunday and before 22:00, it's this Sunday
      if (utcDay === 0 && utcHour < 22) {
        nextEventDate.setUTCHours(22, 0, 0, 0);
      }
    }

    const formattedTime = nextEventDate.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC'
    }) + ' UTC';

    return { isOpen, nextEventType, nextEventDate, formattedTime };
  }

  // Add this helper to format price with big digits for bid/ask
  const renderPriceWithBigDigits = (value: number | string | undefined, decimals: number) => {
    if (value === undefined) return "-";
    const str = Number(value).toFixed(decimals);

    if (decimals === 2) {
      // Make the digit before the decimal and the decimal point bigger
      const dotIdx = str.indexOf(".");
      if (dotIdx <= 0) return str;
      const before = str.slice(0, dotIdx - 1);
      const big = str.slice(dotIdx - 1, dotIdx + 1); // digit before + "."
      const after = str.slice(dotIdx + 1);
      return (
        <>
          {before}
          <span className="text-lg font-bold">{big}</span>
          {after}
        </>
      );
    } else if (decimals > 2) {
      // Make the last 2 digits bigger
      const normal = str.slice(0, -2);
      const big = str.slice(-2);
      return (
        <>
          {normal}
          <span className="text-lg font-bold">{big}</span>
        </>
      );
    }
    // fallback
    return str;
  };

  return (
    <>
      <div className="relative">
        {/* Animations styles */}
        <style>
          {`
            @keyframes price-up {
              0% { color: #16a34a; }
              100% { color: #16a34a; }
            }
            @keyframes price-down {
              0% { color: #dc2626; }
              100% { color: #dc2626; }
            }
            .animate-price-up {
              animation: price-up 1s;
            }
            .animate-price-down {
              animation: price-down 1s;
            }
            .tradingview-container {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100%;
            }
            
            /* Market status styles */
            .market-badge {
              display: inline-flex;
              align-items: center;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 600;
              margin-left: 6px;
              white-space: nowrap;
            }
            .market-open {
              background-color: rgba(22, 163, 74, 0.2);
              color: rgb(34, 197, 94);
            }
            .market-closed {
              background-color: rgba(220, 38, 38, 0.2);
              color: rgb(248, 113, 113);
            }
            
            /* Mobile styles */
            @media (max-width: 767px) {
              .mobile-hidden {
                display: none;
              }
              .mobile-full-width {
                width: 100% !important;
              }
              .mobile-full-height {
                height: calc(100vh - 60px - 56px) !important; /* Adjusted for nav bar */
              }
              .mobile-sidebar {
                position: fixed;
                top: 60px; /* Below navbar */
                left: 0;
                right: 0;
                bottom: 56px; /* Above bottom nav */
                width: 100%;
                height: calc(100vh - 60px - 56px); /* Full height minus navbar and bottom nav */
                z-index: 100;
                background-color: var(--background);
                overflow-y: auto;
                padding-bottom: 20px; /* Extra padding at bottom for usability */
              }
              .mobile-menu {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                height: 56px;
                background: #1a1b1e;
                display: flex;
                justify-content: space-around;
                padding: 0;
                border-top: 1px solid rgba(255,255,255,0.1);
                z-index: 50;
                box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
              }
              .mobile-menu-button {
                flex: 1;
                height: 56px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                color: #a1a1aa;
                transition: all 0.2s;
                gap: 4px;
              }
              .mobile-menu-button.active {
                background: rgba(255,255,255,0.05);
                color: #ffffff;
                border-top: 2px solid #3b82f6;
              }
              .mobile-menu-button svg {
                width: 20px;
                height: 20px;
              }
            }
          `}
        </style>

        {/* Navbar Component */}
        <Navbar 
          balance={balance} 
          isMobile={isMobile} 
          toggleMobileMenu={toggleMobileMenu} 
        />

        <div className="relative flex flex-col md:flex-row">
          {/* Mobile Menu Overlay */}
          {isMobile && showMobileMenu && (
            <div 
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowMobileMenu(false)}
            />
          )}

          {/* Sidebar - always full screen when shown on mobile */}
          {(!isMobile || (isMobile && showMobileMenu)) && (
            <div className={isMobile ? "fixed inset-0 z-50 pt-[60px] pb-[56px]" : ""}>
              <Sidebar
                isCollapsed={isMobile ? false : isCollapsed}
                toggleCollapse={toggleCollapse}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                filteredPairs={filteredPairs}
                selectedPair={selectedPair}
                handlePairClick={handlePairClick}
                formatPairName={formatPairName}
                getFullName={getFullName}
                getCryptoImageForSymbol={getCryptoImageForSymbol}
                getForexImageForSymbol={getForexImageForSymbol}
                isMobile={isMobile}
                closeMobileMenu={() => setShowMobileMenu(false)}
                navigateToTradeTab={() => toggleMobileView("trading")} 
              />
            </div>
          )}

          {/* Main content area with conditional visibility on mobile */}
          <div className={`flex-1 flex ${isMobile ? "flex-col" : "flex-row"}`}>
            {/* Chart Component - visible on mobile only when activeView is chart */}
            <div className={`${isMobile && activeView !== "chart" ? "hidden" : "flex-1"}`}>
              <ChartComponent 
                symbol={getTradingViewSymbol(selectedPair)}
                timezone={userTimezone}
                isCollapsed={isCollapsed}
                activityCollapsed={activityCollapsed}
                activityHeight={activityHeight}
                totalPnL={totalOpenPnL}
                closeAllTrades={closeAllTrades}
              />
            </div>

            {/* Trading Panel - visible on mobile only when activeView is trading */}
            <div className={`${isMobile && activeView !== "trading" ? "hidden" : ""} ${isMobile ? "w-full h-full" : ""}`}>
              {isMobile && LazyTradingPanel ? (
                <Suspense fallback={<div className="p-4 text-center">Loading trading panel...</div>}>
                  <LazyTradingPanel
                    selectedPair={selectedPair}
                    quantity={quantity}
                    setQuantity={setQuantity}
                    selectedLeverage={selectedLeverage}
                    handleLeverageChange={handleLeverageChange}
                    leverageOptions={leverageOptions}
                    margin={margin}
                    balance={balance}
                    freeMargin={freeMargin}
                    usedMargin={usedMargin}
                    localPrices={localPrices}
                    handlePlaceTrade={handlePlaceTrade}
                    calculatePipValue={calculatePipValue}
                    calculateVolumeWithLeverage={calculateVolumeWithLeverage}
                    getQuoteCurrency={getQuoteCurrency}
                    calculateActualVolume={calculateActualVolume}
                    formatLargeNumber={formatLargeNumber}
                    orderType={orderType}
                    setOrderType={setOrderType}
                    getFullName={getFullName}
                    getCryptoImageForSymbol={getCryptoImageForSymbol}
                    getForexImageForSymbol={getForexImageForSymbol}
                    isMobile={isMobile}
                    timezone={userTimezone}
                    totalOpenPnL={totalOpenPnL}
                    closeAllTrades={closeAllTrades}
                    openCount={openCount}
                    lotsLimits={lotsLimits}
                  />
                </Suspense>
              ) : (
                !isMobile && (
                  <TradingPanel
                    selectedPair={selectedPair}
                    quantity={quantity}
                    setQuantity={setQuantity}
                    selectedLeverage={selectedLeverage}
                    handleLeverageChange={handleLeverageChange}
                    leverageOptions={leverageOptions}
                    margin={margin}
                    balance={balance}
                    freeMargin={freeMargin}
                    usedMargin={usedMargin}
                    localPrices={localPrices}
                    handlePlaceTrade={handlePlaceTrade}
                    calculatePipValue={calculatePipValue}
                    calculateVolumeWithLeverage={calculateVolumeWithLeverage}
                    getQuoteCurrency={getQuoteCurrency}
                    calculateActualVolume={calculateActualVolume}
                    formatLargeNumber={formatLargeNumber}
                    orderType={orderType}
                    setOrderType={setOrderType}
                    getFullName={getFullName}
                    getCryptoImageForSymbol={getCryptoImageForSymbol}
                    getForexImageForSymbol={getForexImageForSymbol}
                    isMobile={isMobile}
                    timezone={userTimezone}
                    totalOpenPnL={totalOpenPnL}
                    closeAllTrades={closeAllTrades}
                    openCount={openCount}
                    lotsLimits={lotsLimits}
                  />
                )
              )}
            </div>
          </div>
        </div>

        {/* Activity Panel - Only show in mobile when activeView is "activity" */}
        {isMobile && activeView === "activity" ? (
          LazyActivityPanel ? (
            <Suspense fallback={<div className="p-4 text-center">Loading activity...</div>}>
              <LazyActivityPanel
                isCollapsed={isCollapsed}
                activityCollapsed={false} // Always expanded in mobile view
                setActivityCollapsed={setActivityCollapsed}
                activityHeight={activityHeight}
                activeTradeTab={activeTradeTab}
                setActiveTradeTab={setActiveTradeTab}
                openCount={openCount}
                pendingCount={pendingCount}
                closedCount={closedCount}
                totalOpenPnL={totalOpenPnL}
                totalClosedPnL={totalClosedPnL}
                renderOpenTrades={(trades) => renderTrades(trades)}
                renderPendingTrades={(trades) => renderTrades(trades)}
                renderClosedTrades={renderClosedTrades}
                currentPage={currentPage}
                totalPages={totalPages}
                handlePageChange={handlePageChange}
                balance={balance}
                usedMargin={usedMargin}
                freeMargin={freeMargin}
                marginLevel={marginLevel}
                onResizeStart={onResizeStart}
                openTrades={openTrades}
                pendingTrades={pendingTrades}
                localPrices={localPrices}
                handleCloseTrade={handleCloseTrade}
                formatPairName={formatPairName}
                getCryptoImageForSymbol={getCryptoImageForSymbol}
                getForexImageForSymbol={getForexImageForSymbol}
                getPriceDecimals={getPriceDecimals}
                closedTrades={closedTrades}
                fullPage={true} // Set fullPage mode to true for mobile
              />
            </Suspense>
          ) : null
        ) : !isMobile && (
          // Desktop version - standard bottom panel
          <ActivityPanel
            isCollapsed={isCollapsed}
            activityCollapsed={activityCollapsed}
            setActivityCollapsed={setActivityCollapsed}
            activityHeight={activityHeight}
            activeTradeTab={activeTradeTab}
            setActiveTradeTab={setActiveTradeTab}
            openCount={openCount}
            pendingCount={pendingCount}
            closedCount={closedCount}
            totalOpenPnL={totalOpenPnL}
            totalClosedPnL={totalClosedPnL}
            renderOpenTrades={(trades) => renderTrades(trades)}
            renderPendingTrades={(trades) => renderTrades(trades)}
            renderClosedTrades={renderClosedTrades}
            currentPage={currentPage}
            totalPages={totalPages}
            handlePageChange={handlePageChange}
            balance={balance}
            usedMargin={usedMargin}
            freeMargin={freeMargin}
            marginLevel={marginLevel}
            onResizeStart={onResizeStart}
            openTrades={openTrades}
            pendingTrades={pendingTrades}
            localPrices={localPrices}
            handleCloseTrade={handleCloseTrade}
            formatPairName={formatPairName}
            getCryptoImageForSymbol={getCryptoImageForSymbol}
            getForexImageForSymbol={getForexImageForSymbol}
            getPriceDecimals={getPriceDecimals}
            closedTrades={closedTrades}
            fullPage={false} // Standard bottom panel for desktop
          />
        )}

        {/* Mobile Bottom Navigation - only visible on mobile */}
        {isMobile && (
          <div className="mobile-menu">
            <button 
              className={`mobile-menu-button ${showMobileMenu && activeView !== "trading" && activeView !== "activity" ? "active" : ""}`}
              onClick={() => {
                toggleMobileMenu();
                // Reset the activeView to prevent trade/activity from remaining selected
                setActiveView(showMobileMenu ? "chart" : "chart");
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="18" rx="2" ry="2"></rect>
                <line x1="8" y1="12" x2="16" y2="12"></line>
                <line x1="8" y1="16" x2="16" y2="16"></line>
                <line x1="8" y1="8" x2="16" y2="8"></line>
              </svg>
              <span>Market</span>
            </button>
            
            <button
              className={`mobile-menu-button ${activeView === "trading" ? "active" : ""}`}
              onClick={() => {
                toggleMobileView("trading");
                setShowMobileMenu(false); // Always hide mobile menu when selecting trade
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              <span>Trade</span>
            </button>
            
            <button

              className={`mobile-menu-button ${activeView === "activity" ? "active" : ""}`}
              onClick={() => {
                toggleMobileView("activity");
                setShowMobileMenu(false); // Always hide mobile menu when selecting activity
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20V10"></path>
                <path d="M18 20V4"></path>
                <path d="M6 20v-6"></path>
              </svg>
              <span>Activity</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default TradingStation;
