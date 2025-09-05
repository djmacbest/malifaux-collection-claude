

// ===== FILE 3: frontend/src/pages/Profile.js =====
// Copy this content and save as: frontend/src/pages/Profile.js

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Profile = () => {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = !userId || (currentUser && userId == currentUser.id);

  useEffect(() => {
    if (isOwnProfile) {
      setProfileUser(currentUser);
      setLoading(false);
    } else {
      // For now, just show a placeholder
      setProfileUser({ username: 'Other User', id: userId });
      setLoading(false);
    }
  }, [userId, currentUser, isOwnProfile]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="empty-state">
        <div className="error-message">User not found</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ 
        background: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
        padding: '30px', 
        marginBottom: '30px' 
      }}>
        <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
          <div style={{ 
            width: '120px', 
            height: '120px', 
            borderRadius: '50%', 
            background: '#007bff', 
            color: 'white', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '3rem', 
            fontWeight: 'bold' 
          }}>
            {profileUser.username?.charAt(0).toUpperCase()}
          </div>
          
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: '0 0 10px 0', fontSize: '2rem' }}>
              {profileUser.username}
            </h1>
            {profileUser.bio && (
              <p style={{ color: '#666', marginBottom: '20px', lineHeight: 1.6 }}>
                {profileUser.bio}
              </p>
            )}
            
            <div style={{ display: 'flex', gap: '30px' }}>
              <div style={{ textAlign: 'center' }}>
                <strong style={{ display: 'block', fontSize: '1.5rem' }}>0</strong>
                <span style={{ color: '#666', fontSize: '14px' }}>Miniatures</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <strong style={{ display: 'block', fontSize: '1.5rem' }}>0</strong>
                <span style={{ color: '#666', fontSize: '14px' }}>Photos</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <strong style={{ display: 'block', fontSize: '1.5rem' }}>0</strong>
                <span style={{ color: '#666', fontSize: '14px' }}>Painted</span>
              </div>
            </div>
          </div>

          {isOwnProfile && (
            <div>
              <button 
                style={{ 
                  background: '#6c757d', 
                  color: 'white', 
                  padding: '10px 20px', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Edit Profile
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        background: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
        marginBottom: '30px', 
        overflow: 'hidden' 
      }}>
        <button style={{ 
          flex: 1, 
          padding: '15px 20px', 
          border: 'none', 
          background: '#007bff', 
          color: 'white', 
          cursor: 'pointer' 
        }}>
          Photos (0)
        </button>
        <button style={{ 
          flex: 1, 
          padding: '15px 20px', 
          border: 'none', 
          background: 'transparent', 
          color: '#666', 
          cursor: 'pointer' 
        }}>
          Collection (0)
        </button>
      </div>

      <div className="empty-state">
        <h3>No content yet</h3>
        <p>{isOwnProfile ? 'Upload your first photo or add miniatures!' : 'This user hasn\'t shared anything yet.'}</p>
      </div>
    </div>
  );
};

export default Profile;