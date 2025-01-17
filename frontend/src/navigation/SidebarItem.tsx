import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaAngleLeft, FaExternalLinkAlt } from 'react-icons/fa';
import { SubMenuItem } from './types';

interface SidebarItemProps {
  icon: ReactNode;
  text: string;
  isActive: boolean;
  onClick: () => void;
  isExpanded: boolean;
  subMenu?: SubMenuItem[];
  activeSubMenu?: string;
  isSubMenuOpen: boolean;
  onToggleSubMenu: () => void;
  href?: string;
}

export function SidebarItem({ 
  icon, 
  text, 
  isActive, 
  onClick, 
  isExpanded, 
  subMenu, 
  activeSubMenu,
  isSubMenuOpen,
  onToggleSubMenu,
  href
}: SidebarItemProps) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.submenu-toggle')) {
      onToggleSubMenu();
      return;
    }

    if (href) {
      window.open(href, '_blank');
      return;
    }

    if (subMenu) {
      navigate(subMenu[0].path);
    }
    onClick();
  };

  return (
    <>
      <li 
        className={`cursor-pointer hover:text-primary p-4 rounded 
          ${isActive ? 'font-bold text-primary' : 'text-base-content/70'}
          ${isExpanded ? '' : 'flex justify-center'}`}
        onClick={handleClick}
      >
        <a className={`flex items-center ${isExpanded ? 'space-x-2' : 'justify-center'}`}>
          <span className={isExpanded ? '' : 'text-xl'}>{icon}</span>
          {isExpanded && (
            <div className="flex items-center justify-between flex-1">
              <span>{text}</span>
              {href && <FaExternalLinkAlt className="ml-2" />}
              {subMenu && (
                <FaAngleLeft 
                  className={`submenu-toggle transform transition-transform duration-200 
                    ${isSubMenuOpen ? 'rotate-90' : '-rotate-0'}`} 
                />
              )}
            </div>
          )}
        </a>
      </li>
      {isExpanded && subMenu && (
        <div className={`ml-8 overflow-hidden transition-all duration-200 ease-in-out
          ${isSubMenuOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
          {subMenu.map(item => (
            <li
              key={item.id}
              className={`cursor-pointer p-2 rounded hover:text-primary ${
                activeSubMenu === item.id ? 'font-semibold text-primary' : 'text-base-content/70'
              }`}
              onClick={() => navigate(item.path)}
            >
              <span>{item.text}</span>
            </li>
          ))}
        </div>
      )}
    </>
  );
} 