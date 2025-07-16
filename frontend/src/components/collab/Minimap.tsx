import React, { useRef, useEffect, useCallback, useState } from 'react';
import { exportToCanvas } from '@excalidraw/excalidraw';
import type {
  ExcalidrawElement,
  ExcalidrawImperativeAPI,
} from '../../types/excalidraw';
import type { RoomUser } from '../../types/socket';
import './Minimap.css';

interface MinimapProps {
  elements: readonly ExcalidrawElement[];
  appState: {
    scrollX: number;
    scrollY: number;
    zoom: { value: number };
    width: number;
    height: number;
  };
  collaborators: RoomUser[];
  cursorData: Map<string, { x: number; y: number; username?: string }>;
  onViewportChange: (scrollX: number, scrollY: number) => void;
  isCollaborating: boolean;
  excalidrawAPI: ExcalidrawImperativeAPI | null;
}

const MINIMAP_WIDTH = 200;
const MINIMAP_HEIGHT = 150;
const MINIMAP_PADDING = 10;
const MIN_SCALE = 0.01;
const MAX_SCALE = 10;

export const Minimap: React.FC<MinimapProps> = ({
  elements,
  appState,
  collaborators,
  cursorData,
  onViewportChange,
  isCollaborating,
  excalidrawAPI,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isMoving, setIsMoving] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 100 }); // Start higher to avoid help button
  const [sceneSnapshot, setSceneSnapshot] = useState<HTMLCanvasElement | null>(
    null
  );
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  const dragStartRef = useRef<{
    x: number;
    y: number;
    scrollX: number;
    scrollY: number;
  } | null>(null);
  const moveStartRef = useRef<{
    x: number;
    y: number;
    startX: number;
    startY: number;
  } | null>(null);

  // Update scene snapshot
  const updateSceneSnapshot = useCallback(async () => {
    if (!excalidrawAPI) return;

    // Throttle updates to prevent performance issues
    const now = Date.now();
    if (now - lastUpdateTime < 500) return; // Update at most every 500ms
    setLastUpdateTime(now);

    try {
      const elements = excalidrawAPI.getSceneElements();
      console.log(
        'Minimap: Exporting canvas with',
        elements.length,
        'elements'
      );

      const canvas = await exportToCanvas({
        elements: elements,
        appState: {
          ...excalidrawAPI.getAppState(),
          exportBackground: true,
          exportWithDarkMode: false,
          viewBackgroundColor: '#ffffff',
        },
        files: null,
        getDimensions: () => {
          // Get the bounds of all elements AND the current viewport
          const elements = excalidrawAPI.getSceneElements();

          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;

          // Include all elements
          let hasElements = false;
          elements.forEach((element) => {
            if (element.isDeleted) return;
            hasElements = true;
            minX = Math.min(minX, element.x);
            minY = Math.min(minY, element.y);
            maxX = Math.max(maxX, element.x + (element.width || 0));
            maxY = Math.max(maxY, element.y + (element.height || 0));
          });

          // Include current viewport
          const appState = excalidrawAPI.getAppState();
          const scrollX = appState.scrollX || 0;
          const scrollY = appState.scrollY || 0;
          const zoom =
            typeof appState.zoom === 'number'
              ? appState.zoom
              : (appState.zoom as unknown as { value?: number })?.value || 1;
          const viewportWidth =
            (appState as { width?: number }).width || window.innerWidth;
          const viewportHeight =
            (appState as { height?: number }).height || window.innerHeight;

          const viewportX1 = -scrollX;
          const viewportY1 = -scrollY;
          const viewportX2 = viewportX1 + viewportWidth / zoom;
          const viewportY2 = viewportY1 + viewportHeight / zoom;

          minX = Math.min(minX, viewportX1);
          minY = Math.min(minY, viewportY1);
          maxX = Math.max(maxX, viewportX2);
          maxY = Math.max(maxY, viewportY2);

          // If no elements and no meaningful viewport, use default
          if (!hasElements && minX === Infinity) {
            return { width: 1000, height: 1000, scale: 1 };
          }

          const padding = 100;
          const width = maxX - minX + 2 * padding;
          const height = maxY - minY + 2 * padding;

          return { width, height, scale: 1 };
        },
      });

      setSceneSnapshot(canvas);
      console.log('Minimap: Canvas exported successfully');
    } catch (error) {
      console.error('Failed to export canvas:', error);
    }
  }, [excalidrawAPI, lastUpdateTime]);

  // Calculate scene bounds from elements and viewport
  const getSceneBounds = useCallback(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    // Include all elements
    let hasElements = false;
    elements.forEach((element) => {
      if (element.isDeleted) return;

      hasElements = true;
      const x1 = element.x;
      const y1 = element.y;
      const x2 = element.x + (element.width || 0);
      const y2 = element.y + (element.height || 0);

      minX = Math.min(minX, x1);
      minY = Math.min(minY, y1);
      maxX = Math.max(maxX, x2);
      maxY = Math.max(maxY, y2);
    });

    // Include current viewport
    const viewportX1 = -appState.scrollX;
    const viewportY1 = -appState.scrollY;
    const viewportX2 = viewportX1 + appState.width / appState.zoom.value;
    const viewportY2 = viewportY1 + appState.height / appState.zoom.value;

    minX = Math.min(minX, viewportX1);
    minY = Math.min(minY, viewportY1);
    maxX = Math.max(maxX, viewportX2);
    maxY = Math.max(maxY, viewportY2);

    // If no elements and no meaningful viewport, use default
    if (!hasElements && minX === Infinity) {
      return { minX: -100, minY: -100, maxX: 100, maxY: 100 };
    }

    // Add padding
    const padding = 50;
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding,
    };
  }, [
    elements,
    appState.scrollX,
    appState.scrollY,
    appState.width,
    appState.height,
    appState.zoom,
  ]);

  // Calculate minimap scale
  const getMinimapScale = useCallback(
    (bounds: ReturnType<typeof getSceneBounds>) => {
      const sceneWidth = bounds.maxX - bounds.minX;
      const sceneHeight = bounds.maxY - bounds.minY;

      const scaleX = (MINIMAP_WIDTH - 2 * MINIMAP_PADDING) / sceneWidth;
      const scaleY = (MINIMAP_HEIGHT - 2 * MINIMAP_PADDING) / sceneHeight;

      return Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.min(scaleX, scaleY)));
    },
    []
  );

  // Convert canvas coordinates to scene coordinates
  const canvasToScene = useCallback(
    (
      canvasX: number,
      canvasY: number,
      bounds: ReturnType<typeof getSceneBounds>,
      scale: number
    ) => {
      const sceneX = bounds.minX + (canvasX - MINIMAP_PADDING) / scale;
      const sceneY = bounds.minY + (canvasY - MINIMAP_PADDING) / scale;
      return { x: sceneX, y: sceneY };
    },
    []
  );

  // Convert scene coordinates to canvas coordinates
  const sceneToCanvas = useCallback(
    (
      sceneX: number,
      sceneY: number,
      bounds: ReturnType<typeof getSceneBounds>,
      scale: number
    ) => {
      const canvasX = (sceneX - bounds.minX) * scale + MINIMAP_PADDING;
      const canvasY = (sceneY - bounds.minY) * scale + MINIMAP_PADDING;
      return { x: canvasX, y: canvasY };
    },
    []
  );

  // Draw minimap
  const drawMinimap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    // Draw background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);
    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    // Always use fallback drawing for now
    {
      // Fallback to simple element drawing if no snapshot
      ctx.save();
      const bounds = getSceneBounds();
      const scale = getMinimapScale(bounds);

      elements.forEach((element) => {
        if (element.isDeleted) return;

        const { x: canvasX, y: canvasY } = sceneToCanvas(
          element.x,
          element.y,
          bounds,
          scale
        );
        const width = (element.width || 0) * scale;
        const height = (element.height || 0) * scale;

        ctx.fillStyle = '#333333';
        ctx.globalAlpha = 0.3;

        switch (element.type) {
          case 'rectangle':
          case 'diamond':
          case 'ellipse':
            ctx.fillRect(canvasX, canvasY, width, height);
            break;
          case 'line':
          case 'arrow':
            ctx.beginPath();
            ctx.moveTo(canvasX, canvasY);
            ctx.lineTo(canvasX + width, canvasY + height);
            ctx.stroke();
            break;
          default:
            // Draw a simple rectangle for other types
            ctx.fillRect(canvasX, canvasY, width || 10, height || 10);
        }
      });
      ctx.restore();
    }

    // Calculate bounds and scale for viewport overlay
    const bounds = getSceneBounds();

    // Helper function to convert scene to minimap coordinates
    const sceneToMinimapCoords = (sceneX: number, sceneY: number) => {
      if (sceneSnapshot) {
        // When using snapshot, we need to account for the snapshot's bounds
        // which includes both elements AND viewport
        const elements = excalidrawAPI?.getSceneElements() || [];
        const appState = excalidrawAPI?.getAppState();

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        // Include all elements
        let hasElements = false;
        elements.forEach((element) => {
          if (element.isDeleted) return;
          hasElements = true;
          minX = Math.min(minX, element.x);
          minY = Math.min(minY, element.y);
          maxX = Math.max(maxX, element.x + (element.width || 0));
          maxY = Math.max(maxY, element.y + (element.height || 0));
        });

        // Include current viewport
        if (appState) {
          const scrollX = appState.scrollX || 0;
          const scrollY = appState.scrollY || 0;
          const zoom =
            typeof appState.zoom === 'number'
              ? appState.zoom
              : (appState.zoom as unknown as { value?: number })?.value || 1;
          const viewportWidth =
            (appState as { width?: number }).width || window.innerWidth;
          const viewportHeight =
            (appState as { height?: number }).height || window.innerHeight;

          const viewportX1 = -scrollX;
          const viewportY1 = -scrollY;
          const viewportX2 = viewportX1 + viewportWidth / zoom;
          const viewportY2 = viewportY1 + viewportHeight / zoom;

          minX = Math.min(minX, viewportX1);
          minY = Math.min(minY, viewportY1);
          maxX = Math.max(maxX, viewportX2);
          maxY = Math.max(maxY, viewportY2);
        }

        // If nothing to show, use default
        if (!hasElements && minX === Infinity) {
          return { x: MINIMAP_PADDING, y: MINIMAP_PADDING };
        }

        const padding = 100;
        const snapshotBounds = {
          minX: minX - padding,
          minY: minY - padding,
          width: maxX - minX + 2 * padding,
          height: maxY - minY + 2 * padding,
        };

        // Calculate minimap scale
        const dstWidth = MINIMAP_WIDTH - 2 * MINIMAP_PADDING;
        const dstHeight = MINIMAP_HEIGHT - 2 * MINIMAP_PADDING;
        const scaleX = dstWidth / snapshotBounds.width;
        const scaleY = dstHeight / snapshotBounds.height;
        const minimapScale = Math.min(scaleX, scaleY);

        const drawWidth = snapshotBounds.width * minimapScale;
        const drawHeight = snapshotBounds.height * minimapScale;
        const offsetX = MINIMAP_PADDING + (dstWidth - drawWidth) / 2;
        const offsetY = MINIMAP_PADDING + (dstHeight - drawHeight) / 2;

        return {
          x: offsetX + (sceneX - snapshotBounds.minX) * minimapScale,
          y: offsetY + (sceneY - snapshotBounds.minY) * minimapScale,
        };
      } else {
        const scale = getMinimapScale(bounds);
        return sceneToCanvas(sceneX, sceneY, bounds, scale);
      }
    };

    // Draw current viewport first (background layer)
    const viewportX = -appState.scrollX;
    const viewportY = -appState.scrollY;
    const viewportWidth = appState.width / appState.zoom.value;
    const viewportHeight = appState.height / appState.zoom.value;

    const { x: canvasX, y: canvasY } = sceneToMinimapCoords(
      viewportX,
      viewportY
    );
    const { x: endX, y: endY } = sceneToMinimapCoords(
      viewportX + viewportWidth,
      viewportY + viewportHeight
    );
    const canvasWidth = endX - canvasX;
    const canvasHeight = endY - canvasY;

    // Ensure viewport rectangle is within minimap bounds
    const clampedX = Math.max(0, Math.min(canvasX, MINIMAP_WIDTH));
    const clampedY = Math.max(0, Math.min(canvasY, MINIMAP_HEIGHT));
    const clampedWidth = Math.max(
      0,
      Math.min(canvasWidth, MINIMAP_WIDTH - clampedX)
    );
    const clampedHeight = Math.max(
      0,
      Math.min(canvasHeight, MINIMAP_HEIGHT - clampedY)
    );

    // Draw current viewport with highlight
    ctx.strokeStyle = '#0066cc';
    ctx.lineWidth = 2;
    if (clampedWidth > 0 && clampedHeight > 0) {
      ctx.strokeRect(clampedX, clampedY, clampedWidth, clampedHeight);
      ctx.fillStyle = 'rgba(0, 102, 204, 0.1)';
      ctx.fillRect(clampedX, clampedY, clampedWidth, clampedHeight);
    }

    // Draw indicator if viewport is partially outside
    if (
      canvasX < 0 ||
      canvasY < 0 ||
      endX > MINIMAP_WIDTH ||
      endY > MINIMAP_HEIGHT
    ) {
      ctx.strokeStyle = '#ff6b6b';
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(clampedX, clampedY, clampedWidth, clampedHeight);
      ctx.setLineDash([]);
    }


    // Draw collaborator cursors
    if (isCollaborating) {
      // Track drawn usernames to handle overlaps
      const drawnUsernames: Array<{
        x: number;
        y: number;
        width: number;
        height: number;
        username: string;
      }> = [];

      cursorData.forEach((cursor, userId) => {
        const collaborator = collaborators.find((c) => c.id === userId);
        if (!collaborator) return;

        const { x: canvasX, y: canvasY } = sceneToMinimapCoords(
          cursor.x,
          cursor.y
        );

        // Check if cursor is within minimap bounds
        const isOutOfBounds = canvasX < 0 || canvasX > MINIMAP_WIDTH || 
                             canvasY < 0 || canvasY > MINIMAP_HEIGHT;

        // Draw cursor dot if within bounds
        if (!isOutOfBounds) {
          ctx.fillStyle = collaborator.color || '#4dabf7';
          ctx.beginPath();
          ctx.arc(canvasX, canvasY, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw username if available
        if (cursor.username) {
          ctx.font = '10px sans-serif';
          
          // Start with base username
          const baseName = cursor.username;
          let drawX = canvasX + 5;
          let drawY = canvasY - 5;
          
          // Add direction arrow if out of bounds
          let arrow = '';
          if (isOutOfBounds) {
            // Clamp position to minimap edges
            drawX = Math.max(5, Math.min(MINIMAP_WIDTH - 50, canvasX));
            drawY = Math.max(15, Math.min(MINIMAP_HEIGHT - 5, canvasY));
            
            // Determine arrow
            if (canvasY < 0) arrow = '↑';
            else if (canvasY > MINIMAP_HEIGHT) arrow = '↓';
            else if (canvasX < 0) arrow = '←';
            else if (canvasX > MINIMAP_WIDTH) arrow = '→';
          }
          
          // Check for overlapping usernames
          const testDisplayName = arrow ? `${arrow}${baseName}` : baseName;
          const textMetrics = ctx.measureText(testDisplayName);
          const textWidth = textMetrics.width;
          const textHeight = 12; // Approximate height for 10px font
          
          let overlapCount = 0;
          for (const drawn of drawnUsernames) {
            if (
              drawX < drawn.x + drawn.width &&
              drawX + textWidth > drawn.x &&
              drawY - textHeight < drawn.y &&
              drawY > drawn.y - drawn.height
            ) {
              overlapCount++;
            }
          }
          
          // Build final display name
          let displayName = baseName;
          if (arrow) displayName = `${arrow}${displayName}`;
          if (overlapCount > 0) displayName = `${displayName}+${overlapCount}`;
          
          // Recalculate position if needed
          if (overlapCount > 0) {
            const newMetrics = ctx.measureText(displayName);
            drawX = Math.min(drawX, MINIMAP_WIDTH - newMetrics.width - 5);
          }
          
          // Draw text with outline for better visibility
          ctx.font = 'bold 10px sans-serif';
          
          // Draw white outline
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 3;
          ctx.strokeText(displayName, drawX, drawY);
          
          // Draw colored text with darker shade for better contrast
          // Darken the color by reducing brightness
          const darkenColor = (color: string) => {
            // Convert hex to RGB
            const hex = color.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            
            // Darken by 30%
            const factor = 0.7;
            const newR = Math.floor(r * factor);
            const newG = Math.floor(g * factor);
            const newB = Math.floor(b * factor);
            
            return `rgb(${newR}, ${newG}, ${newB})`;
          };
          
          ctx.fillStyle = darkenColor(collaborator.color || '#4dabf7');
          ctx.fillText(displayName, drawX, drawY);
          
          // Record drawn username position
          const finalMetrics = ctx.measureText(displayName);
          drawnUsernames.push({
            x: drawX,
            y: drawY,
            width: finalMetrics.width,
            height: textHeight,
            username: displayName
          });
        }
      });
    }
  }, [
    elements,
    appState,
    collaborators,
    cursorData,
    isCollaborating,
    getSceneBounds,
    getMinimapScale,
    sceneToCanvas,
    excalidrawAPI,
    sceneSnapshot,
  ]);

  // Handle click on minimap
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;

      const bounds = getSceneBounds();
      const scale = getMinimapScale(bounds);
      const { x: sceneX, y: sceneY } = canvasToScene(
        canvasX,
        canvasY,
        bounds,
        scale
      );

      // Center the viewport on the clicked position
      const viewportWidth = appState.width / appState.zoom.value;
      const viewportHeight = appState.height / appState.zoom.value;

      onViewportChange(
        -(sceneX - viewportWidth / 2),
        -(sceneY - viewportHeight / 2)
      );
    },
    [appState, getSceneBounds, getMinimapScale, canvasToScene, onViewportChange]
  );

  // Handle drag start
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;

      // Check if click is within viewport rectangle
      const bounds = getSceneBounds();
      const scale = getMinimapScale(bounds);

      const viewportX = -appState.scrollX;
      const viewportY = -appState.scrollY;
      const viewportWidth = appState.width / appState.zoom.value;
      const viewportHeight = appState.height / appState.zoom.value;

      const { x: vpCanvasX, y: vpCanvasY } = sceneToCanvas(
        viewportX,
        viewportY,
        bounds,
        scale
      );
      const vpCanvasWidth = viewportWidth * scale;
      const vpCanvasHeight = viewportHeight * scale;

      if (
        canvasX >= vpCanvasX &&
        canvasX <= vpCanvasX + vpCanvasWidth &&
        canvasY >= vpCanvasY &&
        canvasY <= vpCanvasY + vpCanvasHeight
      ) {
        setIsDragging(true);
        dragStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          scrollX: appState.scrollX,
          scrollY: appState.scrollY,
        };
        e.preventDefault();
      } else {
        // If not in viewport, handle as click
        handleClick(e);
      }
    },
    [appState, getSceneBounds, getMinimapScale, sceneToCanvas, handleClick]
  );

  // Handle drag
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !dragStartRef.current) return;

      const bounds = getSceneBounds();
      const scale = getMinimapScale(bounds);

      const deltaX = (e.clientX - dragStartRef.current.x) / scale;
      const deltaY = (e.clientY - dragStartRef.current.y) / scale;

      onViewportChange(
        dragStartRef.current.scrollX - deltaX,
        dragStartRef.current.scrollY - deltaY
      );
    },
    [isDragging, getSceneBounds, getMinimapScale, onViewportChange]
  );

  // Handle drag end
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  // Set up global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Update scene snapshot when elements or viewport change
  useEffect(() => {
    updateSceneSnapshot();
  }, [
    elements,
    appState.scrollX,
    appState.scrollY,
    appState.zoom,
    updateSceneSnapshot,
  ]);

  // Redraw minimap when data changes
  useEffect(() => {
    drawMinimap();
  }, [drawMinimap, sceneSnapshot]);

  // Toggle visibility
  const toggleVisibility = useCallback(() => {
    setIsVisible(!isVisible);
  }, [isVisible]);

  // Handle minimap container drag start
  const handleContainerMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Only start moving if clicking on the header
      if ((e.target as HTMLElement).closest('.minimap-header')) {
        setIsMoving(true);
        moveStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          startX: position.x,
          startY: position.y,
        };
        e.preventDefault();
      }
    },
    [position]
  );

  // Handle minimap container drag
  const handleContainerMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isMoving || !moveStartRef.current || !containerRef.current) return;

      const deltaX = e.clientX - moveStartRef.current.x;
      const deltaY = e.clientY - moveStartRef.current.y;

      // Calculate new position
      let newX = moveStartRef.current.startX - deltaX; // Note: inverted because we use right positioning
      let newY = moveStartRef.current.startY - deltaY; // Note: inverted because we use bottom positioning

      // Get container dimensions
      const rect = containerRef.current.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      // Constrain to viewport with some padding
      const padding = 10;
      newX = Math.max(
        padding,
        Math.min(newX, windowWidth - rect.width - padding)
      );
      newY = Math.max(
        padding,
        Math.min(newY, windowHeight - rect.height - padding)
      );

      setPosition({
        x: newX,
        y: newY,
      });
    },
    [isMoving]
  );

  // Handle minimap container drag end
  const handleContainerMouseUp = useCallback(() => {
    setIsMoving(false);
    moveStartRef.current = null;
  }, []);

  // Set up global mouse event listeners for container dragging
  useEffect(() => {
    if (isMoving) {
      window.addEventListener('mousemove', handleContainerMouseMove);
      window.addEventListener('mouseup', handleContainerMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleContainerMouseMove);
        window.removeEventListener('mouseup', handleContainerMouseUp);
      };
    }
  }, [isMoving, handleContainerMouseMove, handleContainerMouseUp]);

  return (
    <div
      ref={containerRef}
      className={`minimap-container ${isVisible ? '' : 'minimap-container--collapsed'} ${isMoving ? 'minimap-container--moving' : ''}`}
      style={{
        right: `${position.x}px`,
        bottom: `${position.y}px`,
      }}
      onMouseDown={handleContainerMouseDown}
    >
      <div className="minimap-header">
        <span className="minimap-icon" aria-label="Minimap">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="1"
              y="1"
              width="14"
              height="14"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <rect
              x="9"
              y="3"
              width="4"
              height="4"
              rx="0.5"
              fill="currentColor"
              opacity="0.3"
            />
            <rect
              x="3"
              y="9"
              width="6"
              height="4"
              rx="0.5"
              fill="currentColor"
              opacity="0.3"
            />
            <rect
              x="2"
              y="2"
              width="5"
              height="5"
              rx="0.5"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
        </span>
        <button
          className="minimap-toggle"
          onClick={toggleVisibility}
          aria-label={isVisible ? 'Hide minimap' : 'Show minimap'}
        >
          {isVisible ? '−' : '+'}
        </button>
      </div>
      {isVisible && (
        <canvas
          ref={canvasRef}
          width={MINIMAP_WIDTH}
          height={MINIMAP_HEIGHT}
          className={`minimap-canvas ${isDragging ? 'minimap-canvas--dragging' : ''}`}
          onMouseDown={handleMouseDown}
        />
      )}
    </div>
  );
};
