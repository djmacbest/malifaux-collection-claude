// ===== FILE 1: frontend/src/pages/Collection.js =====
// Copy this content and save as: frontend/src/pages/Collection.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Collection = () => {
  const [miniatures, setMiniatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadCollection();
  }, []);

  const loadCollection = async () => {
    try {
      const response = await axios.get('/miniatures/my-collection');
      setMiniatures(response.data.miniatures);
    } catch (error) {
      console.error('Error loading collection:', error);
      setError('Failed to load collection');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your collection...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>My Collection</h1>
        <button 
          style={{ 
            background: '#007bff', 
            color: 'white', 
            padding: '10px 20px', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          onClick={() => setShowAddForm(true)}
        >
          Add Miniature
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {miniatures.length === 0 ? (
        <div className="empty-state">
          <h3>Your collection is empty</h3>
          <p>Add your first miniature to get started!</p>
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
            onClick={() => setShowAddForm(true)}
          >
            Add Your First Miniature
          </button>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: '20px' 
        }}>
          {miniatures.map(miniature => (
            <div key={miniature.id} style={{ 
              background: 'white', 
              padding: '20px', 
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h3>{miniature.name}</h3>
              <p><strong>Faction:</strong> {miniature.faction}</p>
              <p><strong>Status:</strong> {miniature.status}</p>
              {miniature.notes && <p><strong>Notes:</strong> {miniature.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {showAddForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h2>Add Miniature</h2>
            <p style={{ marginBottom: '20px' }}>Add miniature form coming soon!</p>
            <button 
              onClick={() => setShowAddForm(false)}
              style={{ 
                background: '#6c757d', 
                color: 'white', 
                padding: '10px 20px', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Collection;