

// ===== FILE 4: frontend/src/components/Navbar.js =====
// Copy this content and save as: frontend/src/components/Navbar.js

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMobileMenuOpen(false);
  };

  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav style={{ 
      backgroundColor: '#fff', 
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      zIndex: 100, 
      height: '70px' 
    }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '0 20px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        height: '100%' 
      }}>
        <Link 
          to="/" 
          onClick={handleLinkClick}
          style={{ 
            textDecoration: 'none', 
            color: '#007bff', 
            fontSize: '20px', 
            fontWeight: 'bold' 
          }}
        >
          Malifaux Collection
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link 
            to="/gallery" 
            onClick={handleLinkClick}
            style={{ 
              textDecoration: 'none', 
              color: isActive('/gallery') ? '#007bff' : '#333', 
              fontWeight: '500', 
              padding: '8px 12px', 
              borderRadius: '4px',
              backgroundColor: isActive('/gallery') ? '#f8f9fa' : 'transparent'
            }}
          >
            Gallery
          </Link>

          {isAuthenticated ? (
            <>
              <Link 
                to="/collection" 
                onClick={handleLinkClick}
                style={{ 
                  textDecoration: 'none', 
                  color: isActive('/collection') ? '#007bff' : '#333', 
                  fontWeight: '500', 
                  padding: '8px 12px', 
                  borderRadius: '4px',
                  backgroundColor: isActive('/collection') ? '#f8f9fa' : 'transparent'
                }}
              >
                My Collection
              </Link>
              <Link 
                to="/profile" 
                onClick={handleLinkClick}
                style={{ 
                  textDecoration: 'none', 
                  color: isActive('/profile') ? '#007bff' : '#333', 
                  fontWeight: '500', 
                  padding: '8px 12px', 
                  borderRadius: '4px',
                  backgroundColor: isActive('/profile') ? '#f8f9fa' : 'transparent'
                }}
              >
                Profile
              </Link>
              <button 
                onClick={handleLogout}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#333', 
                  fontWeight: '500', 
                  padding: '8px 12px', 
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Logout
              </button>
              <span style={{ color: '#666', fontSize: '14px' }}>
                Welcome, {user?.username}!
              </span>
            </>
          ) : (
            <>
              <Link 
                to="/login" 
                onClick={handleLinkClick}
                style={{ 
                  textDecoration: 'none', 
                  color: isActive('/login') ? '#007bff' : '#333', 
                  fontWeight: '500', 
                  padding: '8px 12px', 
                  borderRadius: '4px',
                  backgroundColor: isActive('/login') ? '#f8f9fa' : 'transparent'
                }}
              >
                Login
              </Link>
              <Link 
                to="/signup" 
                onClick={handleLinkClick}
                style={{ 
                  textDecoration: 'none', 
                  color: 'white', 
                  fontWeight: '500', 
                  padding: '8px 12px', 
                  borderRadius: '4px',
                  backgroundColor: '#007bff'
                }}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;