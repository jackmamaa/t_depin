import { useEffect, useState } from 'react';
import Tips from './Tips';

interface PopupWindowProps {
  title: string
  content: React.ReactNode
  onClose?: () => void
  onConfirm: () => void
  closeText?: string
  confirmText?: string
  maskClose?: boolean
  tips?: string
  confirmDisabled?: boolean
}

const PopupWindow: React.FC<PopupWindowProps> = ({
  title,
  content,
  onClose,
  onConfirm,
  closeText,
  confirmText = 'Confirm',
  maskClose = true,
  tips,
  confirmDisabled = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    return () => setIsVisible(false);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose?.(), 200);
  };

  return (
    <div 
      className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-200 ease-in-out ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={(e) => {
        e.stopPropagation();
        if (maskClose) {
          handleClose();
        }
      }}
    >
      <div className={`absolute inset-0 bg-black transition-opacity duration-200 ${
        isVisible ? 'opacity-20' : 'opacity-0'
      }`}/>
      <div 
        className={`card bg-base-100 shadow-lg p-4 relative z-10 transition-all duration-200 transform ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={handleClose} className="absolute right-4 font-bold text-base-content hover:text-primary transition-opacity">
          ✕
        </button>
        <div className="flex items-baseline gap-2">
          <h1 className="label-text text-lg font-semibold text-base-content">{title}</h1>
          {tips && <Tips content={tips} />}
        </div>
        <hr className="my-2 border-base-300" />
        <div className="p-4">
          {content}
        </div>
        <div className="mt-4 gap-2 flex justify-end">
          {closeText && (
            <button onClick={handleClose} className="btn btn-sm btn-ghost">
              {closeText}
            </button>
          )}
          <button 
            onClick={onConfirm} 
            className='btn btn-primary btn-sm'
            disabled={confirmDisabled}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PopupWindow; 