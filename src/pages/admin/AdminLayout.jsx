// src/pages/admin/AdminLayout.jsx
// Admin area layout with sidebar navigation

import { Outlet, NavLink, Link } from "react-router-dom";
import styled from "styled-components";
import {
  LayoutDashboard,
  Users,
  Theater,
  Calendar,
  Star,
  AlertCircle,
  Wallet,
  ShieldAlert,
  FileText,
  Home,
  UserPlus,
  Megaphone,
  Gift,
  Share2,
  Quote,
} from "lucide-react";

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/entertainers", label: "Entertainers", icon: Theater },
  { to: "/admin/bookings", label: "Bookings", icon: Calendar },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/disputes", label: "Disputes", icon: AlertCircle },
  { to: "/admin/finances", label: "Finances", icon: Wallet },
  { to: "/admin/safety", label: "Safety", icon: ShieldAlert },
  { to: "/admin/leads", label: "Leads", icon: UserPlus },
  { to: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
  { to: "/admin/promotions", label: "Promotions", icon: Gift },
  { to: "/admin/referrals", label: "Referrals", icon: Share2 },
  { to: "/admin/testimonials", label: "Testimonials", icon: Quote },
  { to: "/admin/logs", label: "Audit Logs", icon: FileText },
];

export default function AdminLayout() {
  return (
    <Wrap>
      <Sidebar>
        <SidebarHeader>
          <SidebarTitle>Admin</SidebarTitle>
          <BackLink to="/">← App</BackLink>
        </SidebarHeader>
        <Nav>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavItem key={to} to={to} end={to === "/admin/dashboard"}>
              <Icon size={18} />
              <span>{label}</span>
            </NavItem>
          ))}
        </Nav>
      </Sidebar>
      <Main>
        <Outlet />
      </Main>
    </Wrap>
  );
}

const Wrap = styled.div`
  display: flex;
  min-height: 100%;
  background: ${({ theme }) => theme.bg};
`;

const Sidebar = styled.aside`
  width: 220px;
  flex-shrink: 0;
  background: ${({ theme }) => theme.card};
  border-right: 1px solid ${({ theme }) => theme.border};
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SidebarHeader = styled.div`
  padding: 0 16px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.border};
  margin-bottom: 8px;
`;

const SidebarTitle = styled.h2`
  margin: 0 0 8px;
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
`;

const BackLink = styled(Link)`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.muted};
  text-decoration: none;
  &:hover {
    color: ${({ theme }) => theme.text};
  }
`;

const Nav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const NavItem = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  color: ${({ theme }) => theme.muted};
  text-decoration: none;
  font-size: 0.9rem;
  border-radius: 0 8px 8px 0;
  border-left: 3px solid transparent;

  &.active {
    background: ${({ theme }) => theme.bgAlt};
    color: ${({ theme }) => theme.primary};
    border-left-color: ${({ theme }) => theme.primary};
  }
  &:hover:not(.active) {
    background: ${({ theme }) => theme.bgAlt};
    color: ${({ theme }) => theme.text};
  }
`;

const Main = styled.main`
  flex: 1;
  min-width: 0;
  padding: 20px;
  overflow-y: auto;
`;
