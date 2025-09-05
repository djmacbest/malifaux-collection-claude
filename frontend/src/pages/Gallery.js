// ===== FILE 2: frontend/src/pages/Gallery.js =====
// Copy this content and save as: frontend/src/pages/Gallery.js

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const Gallery = () => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      const response = await axios.get('/photos/gallery?page=1&limit=20');
      setPhotos(response.data.photos);
    } catch (error) {
      console.error('Error loading photos:', error);
      setError('Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading gallery...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Community Gallery</h1>
        {isAuthenticated && (
          <button 
            style={{ 
              background: '#007bff', 
              color: 'white', 
              padding: '10px 20px', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Upload Photo
          </button>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {!isAuthenticated && (
        <div style={{ 
          background: '#e3f2fd', 
          padding: '15px', 
          borderRadius: '8px', 
          textAlign: 'center', 
          marginBottom: '30px',
          border: '1px solid #bbdefb'
        }}>
          <p>
            <Link to="/login" style={{ color: '#007bff', textDecoration: 'none' }}>Sign in</Link> or{' '}
            <Link to="/signup" style={{ color: '#007bff', textDecoration: 'none' }}>create an account</Link> to upload photos and interact with the community!
          </p>
        </div>
      )}

      {photos.length === 0 ? (
        <div className="empty-state">
          <h3>No photos yet</h3>
          <p>Be the first to share your painted miniatures!</p>
          {isAuthenticated && (
            <button 
              style={{ 
                background: '#007bff', 
                color: 'white', 
                padding: '12px 24px', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              Upload First Photo
            </button>
          )}
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
          gap: '20px' 
        }}>
          {photos.map(photo => (
            <div key={photo.id} style={{ 
              background: 'white', 
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              <img 
                src={`http://localhost:3001${photo.image_url}`}
                alt={photo.caption || 'Miniature photo'}
                style={{ width: '100%', height: '300px', objectFit: 'cover' }}
              />
              <div style={{ padding: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <strong>{photo.username}</strong>
                </div>
                {photo.caption && <p>{photo.caption}</p>}
                <div style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
                  ❤️ {photo.likes_count} 💬 {photo.comments_count}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Gallery;