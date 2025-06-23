import { render, screen } from '@testing-library/react';
import { ExcalidrawBoard } from '../ExcalidrawBoard';

describe('ExcalidrawBoard', () => {
  it('should render excalidraw component', () => {
    render(<ExcalidrawBoard />);
    expect(screen.getByTestId('excalidraw-board')).toBeInTheDocument();
  });

  it('should initialize with collaboration disabled', () => {
    render(<ExcalidrawBoard />);
    // コラボレーションボタンが非表示であることを確認
    expect(screen.queryByLabelText('collaboration')).not.toBeInTheDocument();
  });
});