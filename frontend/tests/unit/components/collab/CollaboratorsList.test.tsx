import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CollaboratorsList } from '../../../../src/components/collab/CollaboratorsList';

describe('CollaboratorsList', () => {
  const mockCollaborators = [
    { id: '1', username: 'Alice', color: '#ff0000' },
    { id: '2', username: 'Bob', color: '#00ff00' },
    { id: '3', username: 'Charlie', color: '#0000ff' },
  ];

  it('should render empty list when no collaborators', () => {
    render(<CollaboratorsList collaborators={[]} currentUserId="current-user" />);
    
    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();
    expect(list).not.toHaveTextContent();
  });

  it('should render list of collaborators', () => {
    render(<CollaboratorsList collaborators={mockCollaborators} currentUserId="current-user" />);
    
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('should display collaborator avatars with correct styles', () => {
    render(<CollaboratorsList collaborators={mockCollaborators} currentUserId="current-user" />);
    
    const aliceAvatar = screen.getByText('A');
    const bobAvatar = screen.getByText('B');
    const charlieAvatar = screen.getByText('C');
    
    expect(aliceAvatar).toBeInTheDocument();
    expect(bobAvatar).toBeInTheDocument();
    expect(charlieAvatar).toBeInTheDocument();
    
    // Check if avatars have the avatar class
    expect(aliceAvatar.closest('.collaborator-avatar')).toBeInTheDocument();
    expect(bobAvatar.closest('.collaborator-avatar')).toBeInTheDocument();
    expect(charlieAvatar.closest('.collaborator-avatar')).toBeInTheDocument();
  });

  it('should show collaborator names in list items', () => {
    render(<CollaboratorsList collaborators={mockCollaborators} currentUserId="current-user" />);
    
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(3);
    
    expect(listItems[0]).toHaveTextContent('Alice');
    expect(listItems[1]).toHaveTextContent('Bob');
    expect(listItems[2]).toHaveTextContent('Charlie');
  });

  it('should handle collaborators without color', () => {
    const collaboratorsWithoutColor = [
      { id: '1', username: 'Alice', color: undefined },
      { id: '2', username: 'Bob', color: '' },
    ];
    
    render(<CollaboratorsList collaborators={collaboratorsWithoutColor} currentUserId="current-user" />);
    
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('should handle single collaborator', () => {
    const singleCollaborator = [{ id: '1', username: 'Solo', color: '#purple' }];
    
    render(<CollaboratorsList collaborators={singleCollaborator} currentUserId="current-user" />);
    
    expect(screen.getByText('Solo')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('should show "(You)" label for current user', () => {
    const collaboratorsWithCurrentUser = [
      { id: '1', username: 'Alice', color: '#ff0000' },
      { id: '2', username: 'CurrentUser', color: '#00ff00' },
    ];
    
    render(<CollaboratorsList collaborators={collaboratorsWithCurrentUser} currentUserId="CurrentUser" />);
    
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('CurrentUser (You)')).toBeInTheDocument();
  });
});