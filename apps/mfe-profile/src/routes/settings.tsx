import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useProfile } from '../hooks/useProfile';
import type { UpdateProfileRequest } from '@hs-mono-repo/shared-api-client';

export const Route = createFileRoute('/settings')({
  component: SettingsComponent,
});

interface SettingsProps {
  userId?: string;
  theme?: 'light' | 'dark';
  onUpdate?: (data: any) => void;
}

function SettingsComponent() {
  const context = Route.useRouteContext() as SettingsProps;
  const { userId = 'demo-user', theme = 'light', onUpdate } = context || {};

  const { profile, isLoading, updateProfile, isUpdating, updateError } = useProfile(userId);

  const [formData, setFormData] = useState<UpdateProfileRequest>({});

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
        onUpdate?.(data);
      },
    });
  };

  if (isLoading) {
    return (
      <div className={`profile-loading profile-page--${theme}`}>
        <div className="spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={`profile-empty profile-page--${theme}`}>
        <p>No profile data available</p>
      </div>
    );
  }

  return (
    <div className={`profile-settings profile-page--${theme}`}>
      <div className="profile-header">
        <h1>Profile Settings</h1>
      </div>

      <div className="profile-form">
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

        <div className="form-group">
          <label>Avatar URL:</label>
          <input
            type="url"
            value={formData.avatar || ''}
            onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
            disabled={isUpdating}
          />
        </div>

        {updateError && (
          <div className="error-message">
            {updateError.message || 'Failed to update profile'}
          </div>
        )}

        <button onClick={handleSave} className="btn-save" disabled={isUpdating}>
          {isUpdating ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
