import React from 'react';
import { User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  joinedDate: string;
  earnings: number;
  referrals?: TeamMember[];
}

interface TeamLevelProps {
  member: TeamMember;
  level: number;
}

export const TeamLevelStructure: React.FC<TeamLevelProps> = ({ member, level }) => {
  return (
    <div className="ml-6">
      <Card className="mb-2">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <User className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">Level {level}</p>
                  <p className="text-sm text-muted-foreground">${member.earnings}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {member.referrals && member.referrals.length > 0 && (
        <div className="border-l-2 border-dashed border-border pl-4">
          {member.referrals.map((referral) => (
            <TeamLevelStructure
              key={referral.id}
              member={referral}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};
