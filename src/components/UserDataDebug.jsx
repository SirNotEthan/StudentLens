import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const UserDataDebug = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: '1rem', border: '1px solid #ccc', margin: '1rem', borderRadius: '5px' }}>
        <h3>🔄 User Data Debug - Loading...</h3>
        <p>Fetching user data from backend...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: '1rem', border: '1px solid #red', margin: '1rem', borderRadius: '5px', backgroundColor: '#ffebee' }}>
        <h3>❌ User Data Debug - No User Found</h3>
        <p>No user data available. User might not be logged in.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem', border: '1px solid #green', margin: '1rem', borderRadius: '5px', backgroundColor: '#e8f5e8' }}>
      <h3>✅ User Data Debug - Loaded Successfully</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
        <div><strong>ID:</strong> {user.id}</div>
        <div><strong>Email:</strong> {user.email}</div>
        <div><strong>Username:</strong> {user.username || 'Not set'}</div>
        <div><strong>First Name:</strong> {user.firstName || 'Not set'}</div>
        <div><strong>Last Name:</strong> {user.lastName || 'Not set'}</div>
        <div><strong>Full Name:</strong> {user.fullName || 'Not set'}</div>
        <div><strong>Role:</strong> {user.role}</div>
        <div><strong>Active:</strong> {user.isActive ? '✓' : '✗'}</div>
        <div><strong>Login Streak:</strong> {user.streak || 0} days</div>
        <div><strong>Provider:</strong> {user.provider}</div>
        <div><strong>Needs Setup:</strong> {user.needsSetup ? '✓' : '✗'}</div>
        <div><strong>Bio:</strong> {user.bio || 'Not set'}</div>
        <div><strong>Profile Image:</strong> {user.profileImage || 'Not set'}</div>
        <div><strong>Created:</strong> {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Not set'}</div>
        <div><strong>Updated:</strong> {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'Not set'}</div>
        <div><strong>Last Login:</strong> {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Not set'}</div>
      </div>
      <div style={{ marginTop: '1rem' }}>
        <strong>Permissions ({(user.permissions || []).length}):</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.5rem' }}>
          {(user.permissions || []).length > 0 ? (
            user.permissions.map(permission => (
              <span key={permission} style={{
                background: '#e3f2fd',
                padding: '0.25rem 0.5rem',
                borderRadius: '3px',
                fontSize: '0.8rem'
              }}>
                {permission}
              </span>
            ))
          ) : (
            <span style={{ color: '#666', fontStyle: 'italic' }}>No permissions</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDataDebug;