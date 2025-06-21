import type { RoomUser } from '../../types/socket';
import './CollaboratorsList.css';

interface CollaboratorsListProps {
  collaborators: RoomUser[];
  currentUserId: string;
}

export function CollaboratorsList({ 
  collaborators, 
  currentUserId 
}: CollaboratorsListProps) {
  return (
    <div className="collaborators-list">
      <h3 className="collaborators-title">
        Collaborators ({collaborators.length})
      </h3>
      <ul className="collaborators-items">
        {collaborators.map(collaborator => (
          <li 
            key={collaborator.id} 
            className="collaborator-item"
          >
            <div 
              className="collaborator-avatar"
              style={{ backgroundColor: collaborator.color }}
            >
              {collaborator.username.charAt(0).toUpperCase()}
            </div>
            <span className="collaborator-name">
              {collaborator.username}
              {collaborator.username === currentUserId && ' (You)'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}