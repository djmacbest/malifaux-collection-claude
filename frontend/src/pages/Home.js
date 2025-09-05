// ===== FILE 1: frontend/src/pages/Home.js =====
// Copy this content and save as: frontend/src/pages/Home.js

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Welcome to Malifaux Collection</h1>
      <p>A community platform for Malifaux miniature collectors to showcase painted figures, track their collections, and connect with fellow hobbyists.</p>
      
      {isAuthenticated ? (
        <div>
          <h2>Welcome back, {user?.username}!</h2>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
            <Link to="/collection" style={{ 
              background: '#007bff', 
              color: 'white', 
              padding: '10px 20px', 
              textDecoration: 'none', 
              borderRadius: '4px' 
            }}>
              My Collection
            </Link>
            <Link to="/gallery" style={{ 
              background: '#6c757d', 
              color: 'white', 
              padding: '10px 20px', 
              textDecoration: 'none', 
              borderRadius: '4px' 
            }}>
              Browse Gallery
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: '30px' }}>
          <Link to="/signup" style={{ 
            background: '#007bff', 
            color: 'white', 
            padding: '12px 24px', 
            textDecoration: 'none', 
            borderRadius: '4px',
            marginRight: '10px'
          }}>
            Join the Community
          </Link>
          <Link to="/gallery" style={{ 
            background: '#6c757d', 
            color: 'white', 
            padding: '12px 24px', 
            textDecoration: 'none', 
            borderRadius: '4px' 
          }}>
            Browse Gallery
          </Link>
        </div>
      )}
      
      <div style={{ marginTop: '50px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px', maxWidth: '1000px', margin: '50px auto' }}>
        <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📦</div>
          <h3>Track Your Collection</h3>
          <p>Keep track of all your Malifaux miniatures, mark painting progress, and organize by faction.</p>
        </div>
        <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📸</div>
          <h3>Share Your Work</h3>
          <p>Upload photos of your painted miniatures and show off your painting skills to the community.</p>
        </div>
        <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>💬</div>
          <h3>Connect & Discuss</h3>
          <p>Like and comment on others' work, get inspiration, and share painting tips.</p>
        </div>
      </div>
    </div>
  );
};

export default Home;