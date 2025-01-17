import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import { FaBars, FaAngleLeft } from 'react-icons/fa';
import { SidebarItem } from './SidebarItem';
import { navItems } from './config';
import { NavItem } from './types';

export function Navigation() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [activeSubMenu, setActiveSubMenu] = useState<string>("");
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set());
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const pathParts = location.pathname.slice(1).split('/');
    const mainPath = pathParts[0] || "dashboard";
    
    let subPath = "";
    if (pathParts[1]) {
      if (pathParts[1] === "ssh-key") {
        subPath = "keys";
      } else if (pathParts[1] === "launch-script") {
        subPath = "scripts";
      } else if (pathParts[1] === "index") {
        subPath = "instances";
      }
    }
    
    setActiveTab(mainPath);
    setActiveSubMenu(subPath);
  }, [location]);

  const toggleSubMenu = (menuId: string) => {
    setOpenMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(menuId)) {
        newSet.delete(menuId);
      } else {
        newSet.add(menuId);
      }
      return newSet;
    });
  };

  const handleMenuClick = (item: NavItem) => {
    if (item.href) {
      window.open(item.href, '_blank');
      return;
    }

    if (item.subMenu) {
      setOpenMenus(prev => {
        const newSet = new Set(prev);
        newSet.add(item.id);
        return newSet;
      });
      navigate(item.subMenu[0].path);
    } else {
      navigate(item.id);
    }
  };

  return (
    <div className={`bg-base-100 border-base-200 border-r-2 ${isExpanded ? 'w-64' : 'w-16'} transition-all duration-300 ease-in-out flex flex-col`}>
      <div className={`p-4 flex border-base-200 ${isExpanded ? 'justify-between' : 'justify-center'} items-center border-b`}>
        {isExpanded && <h2 className="text-1xl font-bold">Menu</h2>}
        <button onClick={() => setIsExpanded(!isExpanded)} className="hover:text-primary">
          {isExpanded ? <FaAngleLeft /> : <FaBars />}
        </button>
      </div>
      <ul className="mt-4 flex-grow">
        {navItems.map(item => (
          <SidebarItem 
            key={item.id}
            icon={item.icon}
            text={item.text}
            isActive={activeTab === item.id}
            onClick={() => handleMenuClick(item)}
            isExpanded={isExpanded}
            subMenu={item.subMenu}
            activeSubMenu={activeSubMenu}
            isSubMenuOpen={openMenus.has(item.id)}
            onToggleSubMenu={() => toggleSubMenu(item.id)}
            href={item.href}
          />
        ))}
      </ul>
    </div>
  );
} 