import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { CommissionStructure } from "@/lib/db/commission";
import { Plus } from "lucide-react";

interface CommissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commissions: CommissionStructure[];
  onSave: (commissions: CommissionStructure[]) => Promise<void>;
}

export function CommissionDialog({ open, onOpenChange, commissions, onSave }: CommissionDialogProps) {
  const [editedCommissions, setEditedCommissions] = useState<CommissionStructure[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditedCommissions(commissions);
  }, [commissions]);

  const handleAddNewLevel = () => {
    const nextLevel = editedCommissions.length + 1;
    const newCommission: CommissionStructure = {
      id: Date.now(), // temporary id for new row
      level: nextLevel,
      percentage: 0,
      description: `Level ${nextLevel} referrals`,
      created_at: new Date(),
      updated_at: new Date()
    };
    setEditedCommissions([...editedCommissions, newCommission]);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editedCommissions);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save commissions:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Commission Structure</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Column Headers */}
          <div className="grid grid-cols-4 items-center gap-4 font-medium">
            <div className="col-span-1">Level</div>
            <div className="col-span-1">Percentage</div>
            <div className="col-span-2">Description</div>
          </div>
          
          {/* Commission Rows */}
          {editedCommissions.map((commission, index) => (
            <div key={commission.id} className="grid grid-cols-4 items-center gap-4">
              <Input
                className="col-span-1"
                value={commission.level}
                disabled
              />
              <Input
                className="col-span-1"
                value={commission.percentage}
                type="number"
                onChange={(e) => {
                  const newCommissions = [...editedCommissions];
                  newCommissions[index] = {
                    ...commission,
                    percentage: parseFloat(e.target.value)
                  };
                  setEditedCommissions(newCommissions);
                }}
              />
              <Input
                className="col-span-2"
                value={commission.description}
                onChange={(e) => {
                  const newCommissions = [...editedCommissions];
                  newCommissions[index] = {
                    ...commission,
                    description: e.target.value
                  };
                  setEditedCommissions(newCommissions);
                }}
              />
            </div>
          ))}

          {/* Add New Level Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleAddNewLevel}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Level
          </Button>
        </div>
        <DialogFooter>
          <Button 
            type="submit" 
            onClick={handleSave} 
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
