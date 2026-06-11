import { NavLink, Outlet } from 'react-router-dom';
import './Layout.css';

const navItems = [
  { to: '/stickers', label: '素材库', icon: '🎨' },
  { to: '/tags', label: '标签管理', icon: '🏷️' },
  { to: '/calendar', label: '创作日历', icon: '📅' },
  { to: '/collage', label: '虚拟拼贴台', icon: '✂️' },
  { to: '/archive', label: '作品归档', icon: '📁' },
  { to: '/statistics', label: '数据统计', icon: '📊' }
];

export default function Layout() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🌸</span>
            <h1 className="logo-text">手账素材坊</h1>
          </div>
          <p className="logo-subtitle">记录生活的每一个美好瞬间</p>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p className="footer-text">✦ 用心拼贴，记录美好 ✦</p>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
