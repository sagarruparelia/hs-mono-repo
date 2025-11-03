import { useState } from 'react';
import './ProfilePage.css';

export interface ProfilePageProps {
  userId?: string;
  theme?: 'light' | 'dark';
  onUpdate?: (data: any) => void;
}

export function ProfilePage({ userId = 'demo-user', theme = 'light', onUpdate }: ProfilePageProps) {
  const [profile, setProfile] = useState({
    name: 'John Doe',
    email: 'john.doe@example.com',
    bio: 'Software Engineer passionate about micro-frontends',
    avatar: 'https://via.placeholder.com/150',
  });

  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    setIsEditing(false);
    onUpdate?.(profile);
  };

  return (
    <div className={`profile-page profile-page--${theme}`} data-user-id={userId}>
      <div className="profile-header">
        <h1>User Profile</h1>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="btn-edit"
        >
          {isEditing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      <div className="profile-content">
        <div className="profile-avatar">
          <img src={profile.avatar} alt="Profile" />
        </div>

        <div className="profile-details">
          {isEditing ? (
            <>
              <div className="form-group">
                <label>Name:</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Bio:</label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  rows={4}
                />
              </div>
              <button onClick={handleSave} className="btn-save">
                Save Changes
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

export default ProfilePage;
