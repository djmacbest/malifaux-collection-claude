

// ===== FILE 4: frontend/src/pages/PhotoDetail.js =====
// Copy this content and save as: frontend/src/pages/PhotoDetail.js

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const PhotoDetail = () => {
  const { id } = useParams();
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPhoto();
  }, [id]);

  const loadPhoto = async () => {
    try {
      const response = await axios.get(`/photos/${id}`);
      setPhoto(response.data.photo);
    } catch (error) {
      console.error('Error loading photo:', error);
      if (error.response?.status === 404) {
        setError('Photo not found');
      } else {
        setError('Failed to load photo');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading photo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="error-message">{error}</div>
        <Link to="/gallery" style={{ 
          background: '#007bff', 
          color: 'white', 
          padding: '10px 20px', 
          textDecoration: 'none', 
          borderRadius: '4px',
          marginTop: '10px',
          display: 'inline-block'
        }}>
          Back to Gallery
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 400px', 
        gap: '30px', 
        marginBottom: '30px' 
      }}>
        <div style={{ 
          background: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
          overflow: 'hidden' 
        }}>
          <img 
            src={`http://localhost:3001${photo.image_url}`}
            alt={photo.caption || 'Miniature photo'}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>

        <div style={{ 
          background: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
          padding: '20px',
          height: 'fit-content'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '20px',
            paddingBottom: '15px',
            borderBottom: '1px solid #eee'
          }}>
            <Link to={`/profile/${photo.user_id}`} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              textDecoration: 'none', 
              color: '#333' 
            }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                background: '#007bff', 
                color: 'white', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontWeight: 'bold' 
              }}>
                {photo.username?.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontWeight: '500' }}>{photo.username}</span>
            </Link>
          </div>

          {photo.miniature_name && (
            <div style={{ 
              marginBottom: '15px', 
              padding: '10px', 
              background: '#f8f9fa', 
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              <strong>Miniature:</strong> {photo.miniature_name}
            </div>
          )}

          {photo.caption && (
            <div style={{ marginBottom: '15px', lineHeight: 1.6 }}>
              {photo.caption}
            </div>
          )}

          <div style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
            Posted {new Date(photo.created_at).toLocaleDateString()}
          </div>

          <div style={{ borderTop: '1px solid #eee', paddingTop: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '16px', color: '#666' }}>
                ❤️ {photo.likes_count} {photo.likes_count === 1 ? 'like' : 'likes'}
              </span>
            </div>
            
            <div style={{ color: '#666' }}>
              Comments functionality coming soon!
            </div>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <Link to="/gallery" style={{ 
          background: '#6c757d', 
          color: 'white', 
          padding: '10px 20px', 
          textDecoration: 'none', 
          borderRadius: '4px'
        }}>
          ← Back to Gallery
        </Link>
      </div>
    </div>
  );
};

export default PhotoDetail;