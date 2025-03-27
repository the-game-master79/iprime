import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { List, ListItem } from "@/components/ui/list";

export function InfoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[425px] md:max-w-[600px] rounded-xl">
        <DialogHeader>
          <DialogTitle>CloudForex Guide</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="investors" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="investors" className="flex-1">For Investors</TabsTrigger>
            <TabsTrigger value="affiliates" className="flex-1">For Affiliates</TabsTrigger>
          </TabsList>

          <TabsContent value="investors" className="mt-4">
            <div className="relative bg-muted p-4 rounded-lg">
              <List className="flex-1">
                <ListItem className="flex items-start gap-4 pb-8 relative">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full text-primary font-semibold">1</div>
                    <div className="w-[2px] h-full bg-primary/10 absolute top-8"></div>
                  </div>
                  <span className="flex-1 pt-1.5">Deposit Amount as per your choice</span>
                </ListItem>
                <ListItem className="flex items-start gap-4 pb-8 relative">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full text-primary font-semibold">2</div>
                    <div className="w-[2px] h-full bg-primary/10 absolute top-8"></div>
                  </div>
                  <span className="flex-1 pt-1.5">Select the plan and click on Invest Now</span>
                </ListItem>
                <ListItem className="flex items-start gap-4 pb-8 relative">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full text-primary font-semibold">3</div>
                    <div className="w-[2px] h-full bg-primary/10 absolute top-8"></div>
                  </div>
                  <span className="flex-1 pt-1.5">Do your KYC and proceed for withdrawals</span>
                </ListItem>
                <ListItem className="flex items-start gap-4 pb-8 relative">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full text-primary font-semibold">4</div>
                    <div className="w-[2px] h-full bg-primary/10 absolute top-8"></div>
                  </div>
                  <span className="flex-1 pt-1.5">Limit of $50 is kept per day, and it keeps increasing upto $1,500 per month</span>
                </ListItem>
                <ListItem className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full text-primary font-semibold">5</div>
                  </div>
                  <span className="flex-1 pt-1.5">You can pre-close your plan investment anytime, following charges deduction</span>
                </ListItem>
              </List>
            </div>
          </TabsContent>

          <TabsContent value="affiliates" className="mt-4">
            <div className="relative bg-muted p-4 rounded-lg">
              <List className="flex-1">
                <ListItem className="flex items-start gap-4 pb-8 relative">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full text-primary font-semibold">1</div>
                    <div className="w-[2px] h-full bg-primary/10 absolute top-8"></div>
                  </div>
                  <span className="flex-1 pt-1.5">Copy the Referral URL and send to your friend</span>
                </ListItem>
                <ListItem className="flex items-start gap-4 pb-8 relative">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full text-primary font-semibold">2</div>
                    <div className="w-[2px] h-full bg-primary/10 absolute top-8"></div>
                  </div>
                  <span className="flex-1 pt-1.5">Earnings can be gathered from 10 Levels with Invite Bonus, Global Pool Bonus, and Rank Bonus</span>
                </ListItem>
                <ListItem className="flex items-start gap-4 pb-8 relative">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full text-primary font-semibold">3</div>
                    <div className="w-[2px] h-full bg-primary/10 absolute top-8"></div>
                  </div>
                  <span className="flex-1 pt-1.5">No limit for earnings and no limit for withdrawals</span>
                </ListItem>
                <ListItem className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full text-primary font-semibold">4</div>
                  </div>
                  <span className="flex-1 pt-1.5">More team invites = More Earnings</span>
                </ListItem>
              </List>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
