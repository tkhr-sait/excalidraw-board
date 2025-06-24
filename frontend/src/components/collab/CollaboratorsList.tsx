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
  const maxVisible = 5;
  const visibleCollaborators = collaborators.slice(0, maxVisible);
  const hiddenCount = collaborators.length - maxVisible;
  const allCollaboratorsText = collaborators
    .map(c => c.username === currentUserId ? `${c.username} (You)` : c.username)
    .join(', ');

  return (
    <div className="collaborators-list">
      <div className="collaborators-compact">
        {visibleCollaborators.map(collaborator => (
          <div 
            key={collaborator.id} 
            className="collaborator-avatar"
            style={{ backgroundColor: collaborator.color }}
            title={collaborator.username === currentUserId ? `${collaborator.username} (You)` : collaborator.username}
          >
            {collaborator.username.charAt(0).toUpperCase()}
          </div>
        ))}
        
        {hiddenCount > 0 && (
          <div 
            className="collaborator-overflow"
            title={`And ${hiddenCount} more: ${collaborators.slice(maxVisible).map(c => c.username).join(', ')}`}
          >
            +{hiddenCount}
          </div>
        )}
      </div>
      
      <div className="collaborators-tooltip" title={`All collaborators: ${allCollaboratorsText}`}>
        {collaborators.length} collaborator{collaborators.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}