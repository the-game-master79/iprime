import React from "react";

export const AffiliateRankCard: React.FC<{
  businessStats: {
    currentRank: string;
    nextRank: { title: string; bonus: number; business_amount: number } | null;
    totalVolume: number;
  };
}> = ({ businessStats }) => (
  <div className="bg-secondary rounded-2xl p-6">
    <div className="h-full flex flex-col justify-between">
      <div className="mb-2">
        <h3
          className="font-medium truncate"
          style={{
            fontSize: "clamp(1.1rem, 4vw, 2rem)", // Smaller responsive font size
            lineHeight: 1.1,
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={businessStats.currentRank || 'New Member'}
        >
          {businessStats.currentRank || 'New Member'}
        </h3>
      </div>
      {businessStats.nextRank && (
        <div className="space-y-2 mt-auto">
          <div className="flex justify-between items-center mb-1">
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
              Next: {businessStats.nextRank.title}
            </span>
            <span className="bg-primary text-white rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap">
              {(businessStats.nextRank.business_amount - businessStats.totalVolume).toLocaleString()} USD required
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500"
              style={{ 
                width: `${(businessStats.totalVolume / businessStats.nextRank.business_amount) * 100}%` 
              }}
            />
          </div>
        </div>
      )}
    </div>
  </div>
);
