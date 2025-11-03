import { useState, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { getSharedQueryClient } from '@hs-mono-repo/shared-api-client';
import { useProfile } from '../hooks/useProfile';
import type { UpdateProfileRequest } from '@hs-mono-repo/shared-api-client';
import './ProfilePage.css';

export interface ProfilePageProps {
  userId?: string;
  theme?: 'light' | 'dark';
  onUpdate?: (data: any) => void;
}

function ProfilePageContent({ userId = 'demo-user', theme = 'light', onUpdate }: ProfilePageProps) {
  const {
    profile,
    isLoading,
    isError,
    error,
    updateProfile,
    isUpdating,
    updateError,
  } = useProfile(userId);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UpdateProfileRequest>({});

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name,
        email: profile.email,
        bio: profile.bio,
        avatar: profile.avatar,
      });
    }
  }, [profile]);

  const handleSave = () => {
    updateProfile(formData, {
      onSuccess: (data) => {
        setIsEditing(false);
        onUpdate?.(data);
      },
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`profile-page profile-page--${theme}`}>
        <div className="profile-loading">
          <div className="spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className={`profile-page profile-page--${theme}`}>
        <div className="profile-error">
          <h2>Error Loading Profile</h2>
          <p>{error?.message || 'Failed to load profile data'}</p>
          <button onClick={() => window.location.reload()} className="btn-retry">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No profile data
  if (!profile) {
    return (
      <div className={`profile-page profile-page--${theme}`}>
        <div className="profile-empty">
          <p>No profile data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`profile-page profile-page--${theme}`} data-user-id={userId}>
      <div className="profile-header">
        <h1>User Profile</h1>
        <button
          onClick={() => {
            if (isEditing) {
              // Reset form data on cancel
              setFormData({
                name: profile.name,
                email: profile.email,
                bio: profile.bio,
                avatar: profile.avatar,
              });
            }
            setIsEditing(!isEditing);
          }}
          className="btn-edit"
          disabled={isUpdating}
        >
          {isEditing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      <div className="profile-content">
        <div className="profile-avatar">
          <img src={profile.avatar || 'https://via.placeholder.com/150'} alt="Profile" />
        </div>

        <div className="profile-details">
          {isEditing ? (
            <>
              <div className="form-group">
                <label>Name:</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isUpdating}
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={isUpdating}
                />
              </div>
              <div className="form-group">
                <label>Bio:</label>
                <textarea
                  value={formData.bio || ''}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  disabled={isUpdating}
                />
              </div>
              {updateError && (
                <div className="error-message">
                  {updateError.message || 'Failed to update profile'}
                </div>
              )}
              <button
                onClick={handleSave}
                className="btn-save"
                disabled={isUpdating}
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <>
              <h2>{profile.name}</h2>
              <p className="profile-email">{profile.email}</p>
              <p className="profile-bio">{profile.bio}</p>
            </>
          )}
        </div>
      </div>

      <div className="profile-stats">
        <div className="stat">
          <span className="stat-value">42</span>
          <span className="stat-label">Projects</span>
        </div>
        <div className="stat">
          <span className="stat-value">1.2K</span>
          <span className="stat-label">Followers</span>
        </div>
        <div className="stat">
          <span className="stat-value">850</span>
          <span className="stat-label">Following</span>
        </div>
      </div>
    </div>
  );
}

// Wrapper component that provides QueryClient
export function ProfilePage(props: ProfilePageProps) {
  const queryClient = getSharedQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ProfilePageContent {...props} />
    </QueryClientProvider>
  );
}

export default ProfilePage;
