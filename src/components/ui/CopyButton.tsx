import React, { useState } from "react";
import { Button } from "./button";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  text: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => console.error('Failed to copy text: ', err));
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={handleCopy}
      className="h-5 w-5 p-0 rounded-full hover:bg-muted/20 opacity-70 hover:opacity-100"
      title="Copy ID"
    >
      {copied ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
    </Button>
  );
};

export default CopyButton;
