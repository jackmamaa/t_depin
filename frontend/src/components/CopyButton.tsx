import { useState } from 'react';
import { FaRegCopy } from "react-icons/fa";
import Tips from './Tips';

interface CopyButtonProps {
  text?: string;
  successMessage?: string;
  className?: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({
  text = "",
  successMessage = "Copied!",
  className = ""
}) => {
  const [showTip, setShowTip] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setShowTip(true);
      setTimeout(() => {
        setShowTip(false);
      }, 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  return (
    <Tips 
      content={
        <div className="text-success border-1">
          {successMessage}
        </div>
      }
      showIcon={false}
      show={showTip}
      hover={false}
    >
      <FaRegCopy 
        onClick={handleCopy}
        className={`cursor-pointer text-primary/75 hover:text-primary pl-1 ${className}`}
      />
    </Tips>
  );
};

export default CopyButton;
