import { Navbar } from "@/components/shared/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Fees = () => {
  const tradingFees = [
    { type: 'Crypto Spot', maker: '0.1%', taker: '0.1%', description: 'Standard trading fees for cryptocurrency spot trading' },
    { type: 'Crypto Futures', maker: '0.02%', taker: '0.04%', description: 'Fees for cryptocurrency futures contracts' },
    { type: 'Forex Major', maker: '0.8 pips', taker: '1.2 pips', description: 'Fees for major forex pairs like EUR/USD, GBP/USD' },
    { type: 'Forex Minor', maker: '1.2 pips', taker: '1.8 pips', description: 'Fees for minor forex pairs' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-4xl mx-auto px-4 pt-24">
        <Card>
          <CardHeader>
            <CardTitle>Trading Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Market Type</TableHead>
                  <TableHead>Maker Fee</TableHead>
                  <TableHead>Taker Fee</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tradingFees.map((fee) => (
                  <TableRow key={fee.type}>
                    <TableCell className="font-medium">{fee.type}</TableCell>
                    <TableCell>{fee.maker}</TableCell>
                    <TableCell>{fee.taker}</TableCell>
                    <TableCell className="text-muted-foreground">{fee.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Fees;
