import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User } from "@phosphor-icons/react";

export const DashboardTopbar = () => {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between py-4">
      <div className="container mx-auto max-w-[1200px] px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cloudforex.svg" 
              alt="CloudForex" 
              className="h-12 w-auto cursor-pointer hover:opacity-80"
              onClick={() => window.location.reload()}
            />
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              className="hover:opacity-80 h-12"
              style={{ backgroundColor: '#FFA500' }}
              onClick={() => navigate('/trade')}
            >
              <img 
                src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cloudtrade.svg" 
                alt="CloudTrade" 
                className="h-20 w-20"
              />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full hover:bg-primary/10"
              onClick={() => navigate('/profile')}
            >
              <Avatar className="h-8 w-8 bg-primary/90 hover:bg-primary">
                <AvatarFallback className="bg-primary">
                  <User weight="fill" className="h-5 w-5 text-primary-foreground" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
