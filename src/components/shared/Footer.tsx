import { Link } from "react-router-dom";
import { useTheme } from "@/hooks/use-theme";
import { TwitterLogo, InstagramLogo, FacebookLogo, YoutubeLogo, CreditCard } from "phosphor-react";

export const Footer = () => {
  const { theme } = useTheme();
  return (
    <footer className="border-t border-border rounded-t-2xl bg-background/5 py-8 md:py-12">
      <div className="container max-w-[1200px] mx-auto px-4 flex flex-col gap-6">
        {/* Row 1: Logo */}
        <div className="flex justify-start mb-2">
          <a href="#hero" onClick={e => { e.preventDefault(); document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' }); }} className="focus:outline-none">
            <img
              src={theme === "dark" ? "/arthaa-dark.svg" : "/arthaa-light.svg"}
              alt="Arthaa Logo"
              className="h-6 w-auto cursor-pointer"
            />
          </a>
        </div>
        {/* Row 2: Links (left) and Socials (right) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
          <div className="flex flex-col md:flex-row gap-5 md:gap-10 items-start md:items-center">
            <Link to="/company" className="text-base text-muted-foreground hover:text-foreground transition-colors">
              Company
            </Link>
            <Link to="/partners" className="text-base text-muted-foreground hover:text-foreground transition-colors">
              Partners
            </Link>
            <Link to="/legal/terms" className="text-base text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <Link to="/legal/privacy" className="text-base text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link
              to="#"
              className="text-base text-muted-foreground hover:text-foreground"
              onClick={e => {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent("open-contact-dialog"));
              }}
            >
              Contact Us
            </Link>
          </div>
          <div className="flex gap-4 items-center mt-4 md:mt-0 justify-start md:justify-end w-full md:w-auto">
            <a href="https://x.com/arthaa_pro" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">
              <TwitterLogo size={20} weight="fill" />
            </a>
            <a href="https://www.instagram.com/arthaa.pro/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <InstagramLogo size={20} weight="fill" />
            </a>
            <a href="https://www.facebook.com/arthaa.pro" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <FacebookLogo size={20} weight="fill" />
            </a>
            <a href="https://www.youtube.com/@arthaa_pro" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
              <YoutubeLogo size={20} weight="fill" />
            </a>
          </div>
        </div>
        {/* Row 3: Disclaimer */}
        <div className="w-full text-xs text-muted-foreground leading-relaxed mt-4">
          <strong>Disclaimer:</strong> Arthaa Technologies Ltd is an international trading technology service provider offering access to AI-powered trading tools for forex and cryptocurrency markets. Arthaa does not provide financial advice, portfolio management, or brokerage services. Our platform enables self-directed trading via third-party liquidity providers and market data aggregators.<br /><br />
          <strong>Risk Warning:</strong> Trading leveraged instruments such as forex and cryptocurrencies involves substantial risk and may not be suitable for all investors. You may lose all your invested capital. Past performance is not indicative of future results. Please trade responsibly and ensure you understand the risks involved.<br />
          <br />
          Arthaa does not operate in or offer services to residents of jurisdictions where such services would be contrary to local laws or regulations, including but not limited to the United States, Canada, the United Kingdom, and countries under international sanctions.<br /><br />
          The content provided on this website does not constitute investment advice, financial consultation, or a solicitation to engage in any financial activity. All interactions with this platform are voluntary and at the sole discretion of the user.<br /><br />
          Arthaa maintains a high standard of security and data protection in line with industry best practices, including the use of encryption, secure processing, and continuous system audits.<br /><br />
        </div>
        {/* Divider */}
        <div className="w-full border-t border-muted-foreground/20 my-2"></div>
        {/* Row 4: Payment/Security/Token Logos (left) and Copyright (right) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full text-xs text-muted-foreground mt-2 gap-2">
          <div className="flex gap-3 items-center mb-2 md:mb-0 flex-wrap">
            <div className="flex items-center px-2 py-1 bg-background/60 shadow-sm">
              <CreditCard size={20} weight="fill" className="text-foreground mr-2" />
              <span className="font-medium text-foreground text-[13px] tracking-tight">Credit / Debit Card</span>
            </div>
            <img src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/pci-dss.svg" alt="PCI DSS" className="h-6 w-auto" />
            <img src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/btcusd.svg" alt="Bitcoin" className="h-6 w-auto" />
            <img src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/usdt.svg" alt="USDT" className="h-6 w-auto" />
            <img src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/trxusd.svg" alt="Tron" className="h-6 w-auto" />
            <img src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/ethusd.svg" alt="Ethereum" className="h-6 w-auto" />
            <img src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/solusd.svg" alt="Solana" className="h-6 w-auto" />
            <img src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/bnbusd.svg" alt="BNB" className="h-6 w-auto" />
            <img src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/adausd.svg" alt="Cardano" className="h-6 w-auto" />
            <span className="border border-foreground text-foreground rounded px-2 py-2 font-bold text-xs flex items-center gap-1 ml-2" style={{lineHeight:1}}>
              18+
            </span>
            <span className="ml-2 font-semibold text-[13px] tracking-tight text-warning" style={{fontFamily:'inherit', display: 'block', lineHeight: 1.2}}>
              Trade<br />Responsibly
            </span>
          </div>
          <div className="flex justify-start md:justify-end w-full md:w-auto">
            © {new Date().getFullYear()} Arthaa. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};
