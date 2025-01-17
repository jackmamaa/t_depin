import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaInfoCircle } from 'react-icons/fa';

interface TipsProps {
  content: string | React.ReactNode;
  showIcon?: boolean;
  children?: React.ReactNode;
  show?: boolean;
  hover?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const Tips: React.FC<TipsProps> = ({ 
  content, 
  showIcon = true, 
  children,
  show = false,
  hover = true,
  onMouseEnter,
  onMouseLeave
}) => {
  const [hoverVisible, setHoverVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const iconRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if ((show || hoverVisible) && iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top,
        left: rect.left + rect.width / 2
      });
    }
  }, [show, hoverVisible]);

  const handleMouseEnter = () => {
    if (hover) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setHoverVisible(true);
    }
    onMouseEnter?.();
  };

  const handleMouseLeave = () => {
    if (hover) {
      timeoutRef.current = setTimeout(() => {
        setHoverVisible(false);
      }, 300);
    }
    onMouseLeave?.();
  };

  const isVisible = show || (hover && hoverVisible);

  return (
    <>
      <div
        ref={iconRef}
        className="cursor-pointer inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {showIcon ? (
          <FaInfoCircle className="text-base-content opacity-50 text-xs" />
        ) : (
          children
        )}
      </div>
      {createPortal(
        <div 
          className={`fixed z-[9999] transition-opacity duration-300 ease-in-out ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            top: position.top - 8,
            left: position.left,
            transform: 'translate(-50%, -100%)',
            visibility: isVisible ? 'visible' : 'hidden'
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="bg-base-100 rounded-md shadow-lg p-2 text-sm text-base-content whitespace-normal border border-base-300"
            style={{
              width: 'max-content',
              maxWidth: '40vh'
            }}
          >
            {typeof content === 'string' ? content : content}
            <div className="absolute left-1/2 -bottom-1 w-2 h-2 bg-base-100 transform -translate-x-1/2 rotate-45 border-b border-r border-base-300"></div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default Tips; 