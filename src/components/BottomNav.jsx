// src/components/BottomNav.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import styled from "styled-components";
import {
  Home as HomeIcon,
  CalendarCheck as BookingsIcon,
  LayoutList as ListingsIcon,
  MessageCircle as MessagesIcon,
  User as ProfileIcon,
} from "lucide-react";
import { useRole } from "../context/RoleContext";

export default function BottomNav() {
  const { isEntertainer } = useRole();

  // Bookings: entertainers go to Jobs dashboard, clients to their dashboard
  const bookingsTo = isEntertainer ? "/talent" : "/client";

  return (
    <Navbar $fiveItems={false}>
      {isEntertainer ? (
        <NavItem to="/listings">
          <ListingsIcon size={22} />
          <Label>Listings</Label>
        </NavItem>
      ) : (
        <NavItem to="/" end>
          <HomeIcon size={22} />
          <Label>Home</Label>
        </NavItem>
      )}

      <NavItem to={bookingsTo}>
        <BookingsIcon size={22} />
        <Label>Bookings</Label>
      </NavItem>

      <NavItem to="/inbox">
        <MessagesIcon size={22} />
        <Label>Messages</Label>
      </NavItem>

      <NavItem to="/profile">
        <ProfileIcon size={22} />
        <Label>Profile</Label>
      </NavItem>
    </Navbar>
  );
}

const Navbar = styled.nav`
  width: 100%;
  height: 60px;
  background: var(--bg-card);
  display: grid;
  grid-template-columns: ${({ $fiveItems }) => ($fiveItems ? "repeat(5, 1fr)" : "repeat(4, 1fr)")};
  align-items: center;
`;

const NavItem = styled(NavLink)`
  text-decoration: none;
  color: var(--text-muted);
  font-size: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 4px;
  min-width: 44px;
  min-height: 44px;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.15s ease;

  &.active {
    color: var(--primary);
    font-weight: 600;
  }

  svg {
    stroke: currentColor;
    flex-shrink: 0;
  }
`;

const Label = styled.span`
  line-height: 1.4;
  white-space: nowrap;
  text-overflow: ellipsis;
  max-width: 100%;
  text-align: center;
  padding-bottom: 2px;
`;
