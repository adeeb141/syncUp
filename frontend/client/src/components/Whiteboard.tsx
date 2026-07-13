"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";
import { Square, Circle as CircleIcon, Minus, Type as TypeIcon, Pencil, MousePointer2, Trash2 } from "lucide-react";

const CURSOR_COLORS = [
  "#8B5CF6",
  "#EC4899",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#EF4444",
  "#06B6D4",
  "#84CC16",
  "#F97316",
  "#6366F1",
];

const SHAPE_COLORS = ["#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#3B82F6", "#EF4444"];

const getRandomColor = () => CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];

type ShapeKind = "rect" | "ellipse" | "line" | "text" | "draw";

interface Shape {
  id: string;
  kind: ShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  text?: string; // only used by "text" shapes
  points?: { x: number; y: number }[]; // only used by "draw" (freehand pen) shapes
}

type Tool = "select" | "rect" | "ellipse" | "line" | "pen" | "text";

type DocumentAccess = "view_only" | "open_collab" | "selective";

interface WhiteboardProps {
  roomName: string;
  workspaceId?: string;
  documentId?: string;
}

interface DocumentPermissionResponse {
  document: { id: string; access: DocumentAccess; created_by: string };
  permissions: { can_edit: boolean; is_creator: boolean };
}

interface EditorPermissionState {
  access: DocumentAccess;
  canEdit: boolean;
  isCreator: boolean;
}

interface AwarenessCursor {
  clientId: number;
  x: number;
  y: number;
  name: string;
  color: string;
}

const MIN_SIZE = 24;

export default function Whiteboard({ roomName, workspaceId, documentId }: WhiteboardProps) {
  const [status, setStatus] = useState<string>("connecting");
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeColor, setActiveColor] = useState(SHAPE_COLORS[0]);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [cursors, setCursors] = useState<AwarenessCursor[]>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const shapesMapRef = useRef<Y.Map<Shape> | null>(null);
  const dragState = useRef<{
    id: string;
    mode: "move" | "resize";
    startX: number;
    startY: number;
    shape: Shape;
  } | null>(null);
  // Tracks a shape currently being drawn by dragging on empty canvas
  // (as opposed to dragState above, which moves/resizes an EXISTING shape).
  const creationRef = useRef<{ id: string; kind: ShapeKind; startX: number; startY: number } | null>(null);

  const user = useAuthStore((s) => s.user);
  const cursorColor = useMemo(() => getRandomColor(), []);

  const fallbackPermission = useMemo<EditorPermissionState>(
    () => ({ access: "open_collab", canEdit: true, isCreator: true }),
    []
  );
  const permissionKey = workspaceId && documentId ? `${workspaceId}:${documentId}` : null;
  const [permissionState, setPermissionState] = useState<{
    key: string;
    permission: EditorPermissionState | null;
    error: string | null;
  }>({
    key: permissionKey ?? "",
    permission: permissionKey ? null : fallbackPermission,
    error: null,
  });

  const permission =
    permissionKey && permissionState.key === permissionKey
      ? permissionState.permission
      : permissionKey
      ? null
      : fallbackPermission;
  const permissionError =
    permissionKey && permissionState.key === permissionKey ? permissionState.error : null;
  const permissionLoading = Boolean(permissionKey) && !permission && !permissionError;

  // Same permission-check pattern as TiptapEditor — this hits the same
  // /api/documents/:workspace_id/:document_id endpoint, so a whiteboard
  // respects the exact same view_only / open_collab / selective rules.
  useEffect(() => {
    let cancelled = false;
    if (!workspaceId || !documentId || !permissionKey) return () => { cancelled = true; };

    api
      .get<DocumentPermissionResponse>(`/api/documents/${workspaceId}/${documentId}`)
      .then((data) => {
        if (cancelled) return;
        setPermissionState({
          key: permissionKey,
          permission: {
            access: data.document.access,
            canEdit: data.permissions.can_edit,
            isCreator: data.permissions.is_creator,
          },
          error: null,
        });
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setPermissionState({ key: permissionKey, permission: null, error: error.message || "Failed to load permissions" });
      });

    return () => { cancelled = true; };
  }, [workspaceId, documentId, permissionKey]);

  const canEdit = useMemo(() => {
    if (permissionLoading) return false;
    if (permissionError) return false;
    if (!permissionKey) return true;
    return permission?.canEdit ?? false;
  }, [permissionLoading, permissionError, permissionKey, permission?.canEdit]);

  // Connect to the SAME /collaboration Hocuspocus endpoint the text editor uses.
  // Hocuspocus only syncs Yjs binary updates for a room — it has no idea (and
  // doesn't need to know) whether the room holds Tiptap prose or shape data.
  useEffect(() => {
    const ydoc = new Y.Doc();
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL
      ? `${process.env.NEXT_PUBLIC_SOCKET_URL}/collaboration`
      : `${protocol}//${window.location.host}/collaboration`;

    const newProvider = new HocuspocusProvider({
      url: SOCKET_URL,
      name: roomName,
      document: ydoc,
      onConnect: () => setStatus("connected"),
      onDisconnect: () => setStatus("disconnected"),
    });

    setProvider(newProvider);

    return () => {
      newProvider.destroy();
      ydoc.destroy();
    };
  }, [roomName]);

  // Shapes live in a top-level Y.Map<string, Shape>, keyed by shape id.
  // Each shape is written as a whole object per .set() call — simpler than a
  // nested Y.Map per shape, and enough for whole-shape moves/resizes/recolors
  // to converge correctly. (Trade-off: two people editing the SAME shape's
  // different properties at the same instant will have one write win outright
  // rather than merge field-by-field — worth calling out as a known
  // limitation, same spirit as the RGA doc's YATA note.)
  useEffect(() => {
    if (!provider) return;
    const map = provider.document.getMap<Shape>("shapes");
    shapesMapRef.current = map;

    const sync = () => setShapes(Array.from(map.values()));
    sync();
    map.observe(sync);
    return () => map.unobserve(sync);
  }, [provider]);

  // Awareness: broadcast our cursor position, render everyone else's.
  useEffect(() => {
    if (!provider) return;
    const awareness = provider.awareness;
    if (!awareness) return;

    if (canEdit) {
      awareness.setLocalState({
        user: { name: user?.name || "Anonymous", color: cursorColor },
        cursor: null,
      });
    } else {
      awareness.setLocalState(null);
    }

    const syncCursors = () => {
      const next: AwarenessCursor[] = [];
      awareness.getStates().forEach((state: any, clientId: number) => {
        if (clientId === awareness.clientID) return;
        if (!state?.cursor) return;
        next.push({
          clientId,
          x: state.cursor.x,
          y: state.cursor.y,
          name: state.user?.name || "Anonymous",
          color: state.user?.color || "#3B82F6",
        });
      });
      setCursors(next);
    };

    awareness.on("change", syncCursors);
    syncCursors();
    return () => awareness.off("change", syncCursors);
  }, [provider, canEdit, user?.name, cursorColor]);

  const svgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const point = svgPoint(e.clientX, e.clientY);

      if (provider?.awareness && canEdit) {
        provider.awareness.setLocalStateField("cursor", point);
      }

      const map = shapesMapRef.current;

      const creation = creationRef.current;
      if (creation && map) {
        const current = map.get(creation.id);
        if (current) {
          if (current.kind === "draw") {
            map.set(creation.id, { ...current, points: [...(current.points ?? []), point] });
          } else if (current.kind === "line") {
            map.set(creation.id, {
              ...current,
              x: creation.startX,
              y: creation.startY,
              width: point.x - creation.startX,
              height: point.y - creation.startY,
            });
          } else {
            // rect / ellipse: normalize so dragging in any direction works
            map.set(creation.id, {
              ...current,
              x: Math.min(creation.startX, point.x),
              y: Math.min(creation.startY, point.y),
              width: Math.abs(point.x - creation.startX),
              height: Math.abs(point.y - creation.startY),
            });
          }
        }
        return;
      }

      const drag = dragState.current;
      if (!drag || !map) return;

      const dx = point.x - drag.startX;
      const dy = point.y - drag.startY;

      if (drag.mode === "move") {
        if (drag.shape.kind === "draw") {
          map.set(drag.id, {
            ...drag.shape,
            points: (drag.shape.points ?? []).map((p) => ({ x: p.x + dx, y: p.y + dy })),
          });
        } else {
          map.set(drag.id, { ...drag.shape, x: drag.shape.x + dx, y: drag.shape.y + dy });
        }
      } else {
        map.set(drag.id, {
          ...drag.shape,
          width: Math.max(MIN_SIZE, drag.shape.width + dx),
          height: Math.max(MIN_SIZE, drag.shape.height + dy),
        });
      }
    },
    [provider, canEdit, svgPoint]
  );

  const endDrag = useCallback(() => {
    const creation = creationRef.current;
    if (creation) {
      creationRef.current = null;
      const map = shapesMapRef.current;
      // If someone just clicked without dragging, give rect/ellipse a
      // visible minimum size rather than leaving a zero-area shape.
      if (map && (creation.kind === "rect" || creation.kind === "ellipse")) {
        const current = map.get(creation.id);
        if (current && (current.width < MIN_SIZE || current.height < MIN_SIZE)) {
          map.set(creation.id, {
            ...current,
            width: Math.max(MIN_SIZE, current.width),
            height: Math.max(MIN_SIZE, current.height),
          });
        }
      }
      setSelectedId(creation.id);
      setActiveTool("select");
      return;
    }
    dragState.current = null;
  }, []);

  // Starts a new shape when the person drags on empty canvas with a
  // drawing tool selected. Text is a single click-to-place instead of a drag.
  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!canEdit || activeTool === "select") return;
      e.stopPropagation();
      const point = svgPoint(e.clientX, e.clientY);
      const map = shapesMapRef.current;
      if (!map) return;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      if (activeTool === "text") {
        const text = window.prompt("Enter text", "");
        setActiveTool("select");
        if (text === null) return;
        map.set(id, { id, kind: "text", x: point.x, y: point.y, width: 160, height: 40, color: activeColor, text });
        setSelectedId(id);
        return;
      }

      if (activeTool === "pen") {
        map.set(id, { id, kind: "draw", x: point.x, y: point.y, width: 0, height: 0, color: activeColor, points: [point] });
        creationRef.current = { id, kind: "draw", startX: point.x, startY: point.y };
        return;
      }

      // rect / ellipse / line: start at zero size, handlePointerMove grows it
      map.set(id, { id, kind: activeTool, x: point.x, y: point.y, width: 0, height: 0, color: activeColor });
      creationRef.current = { id, kind: activeTool, startX: point.x, startY: point.y };
    },
    [canEdit, activeTool, activeColor]
  );

  const editText = (shape: Shape) => {
    if (!canEdit || shape.kind !== "text") return;
    const map = shapesMapRef.current;
    if (!map) return;
    const newText = window.prompt("Edit text", shape.text ?? "");
    if (newText !== null) {
      map.set(shape.id, { ...shape, text: newText });
    }
  };

  const deleteSelected = () => {
    if (!canEdit || !selectedId) return;
    shapesMapRef.current?.delete(selectedId);
    setSelectedId(null);
  };

  const recolorSelected = (color: string) => {
    setActiveColor(color);
    if (!canEdit || !selectedId) return;
    const map = shapesMapRef.current;
    const current = map?.get(selectedId);
    if (map && current) map.set(selectedId, { ...current, color });
  };

  useEffect(() => {
    if (!canEdit) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        deleteSelected();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit, selectedId]);

  if (permissionLoading || !provider) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse">
          <span className="material-symbols-outlined text-primary">draw</span>
        </div>
        <p className="text-sm text-on-surface-variant font-medium">Loading whiteboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-6xl mx-auto px-6 py-6">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
              draw
            </span>
          </div>
          <h2 className="text-lg font-headline font-bold text-on-surface">Whiteboard</h2>
        </div>

        <div className="flex items-center gap-2">
          {!canEdit && (
            <div className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-surface-container-high text-on-surface-variant">
              View Only
            </div>
          )}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
              status === "connected"
                ? "bg-secondary-container/30 text-secondary"
                : status === "connecting"
                ? "bg-tertiary-container/30 text-tertiary"
                : "bg-error-container/30 text-error"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${status === "connected" ? "bg-secondary animate-pulse" : status === "connecting" ? "bg-tertiary animate-pulse" : "bg-error"}`} />
            {status === "connected" ? "Synced" : status === "connecting" ? "Connecting..." : "Offline"}
          </div>
        </div>
      </div>

      {permissionError && (
        <div className="mb-3 rounded-lg border border-error/20 bg-error-container/20 px-3 py-2 text-xs text-error">
          {permissionError}
        </div>
      )}

      {canEdit && (
        <div className="flex items-center gap-1 px-2 py-1.5 bg-surface-container-lowest border border-outline-variant/15 rounded-xl mb-3 shrink-0 shadow-sm">
          <ToolBtn onClick={() => setActiveTool("select")} title="Select" active={activeTool === "select"}>
            <MousePointer2 size={16} />
          </ToolBtn>
          <ToolBtn onClick={() => setActiveTool("rect")} title="Rectangle — click and drag" active={activeTool === "rect"}>
            <Square size={16} />
          </ToolBtn>
          <ToolBtn onClick={() => setActiveTool("ellipse")} title="Ellipse — click and drag" active={activeTool === "ellipse"}>
            <CircleIcon size={16} />
          </ToolBtn>
          <ToolBtn onClick={() => setActiveTool("line")} title="Line — click and drag" active={activeTool === "line"}>
            <Minus size={16} />
          </ToolBtn>
          <ToolBtn onClick={() => setActiveTool("pen")} title="Pen — click and drag to draw freehand" active={activeTool === "pen"}>
            <Pencil size={16} />
          </ToolBtn>
          <ToolBtn onClick={() => setActiveTool("text")} title="Text — click to place" active={activeTool === "text"}>
            <TypeIcon size={16} />
          </ToolBtn>

          <div className="w-px h-5 bg-outline-variant/20 mx-1.5" />

          {SHAPE_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => recolorSelected(c)}
              title={c}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${activeColor === c ? "scale-110 border-on-surface" : "border-transparent"}`}
              style={{ backgroundColor: c }}
            />
          ))}

          <div className="w-px h-5 bg-outline-variant/20 mx-1.5" />

          <ToolBtn onClick={deleteSelected} title="Delete selected" disabled={!selectedId}>
            <Trash2 size={16} />
          </ToolBtn>
        </div>
      )}

      <div className="flex-1 min-h-0 rounded-xl border border-outline-variant/15 bg-surface-container-lowest shadow-sm overflow-hidden relative">
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{
            cursor: !canEdit ? "not-allowed" : activeTool === "select" ? "default" : "crosshair",
            touchAction: "none",
          }}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          onClick={(e) => {
            if (activeTool === "select" && e.target === svgRef.current) setSelectedId(null);
          }}
        >
          <defs>
            <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {shapes.map((shape) => {
            const isSelected = shape.id === selectedId;
            const commonProps = {
              onPointerDown: (e: React.PointerEvent) => {
                if (!canEdit || activeTool !== "select") return;
                e.stopPropagation();
                setSelectedId(shape.id);
                const point = svgPoint(e.clientX, e.clientY);
                dragState.current = { id: shape.id, mode: "move", startX: point.x, startY: point.y, shape };
              },
            };

            return (
              <g key={shape.id}>
                {shape.kind === "rect" ? (
                  <rect
                    x={shape.x}
                    y={shape.y}
                    width={shape.width}
                    height={shape.height}
                    rx={8}
                    fill={shape.color}
                    fillOpacity={0.85}
                    stroke={isSelected ? "var(--color-primary, #6750A4)" : "transparent"}
                    strokeWidth={2}
                    {...commonProps}
                  />
                ) : shape.kind === "ellipse" ? (
                  <ellipse
                    cx={shape.x + shape.width / 2}
                    cy={shape.y + shape.height / 2}
                    rx={shape.width / 2}
                    ry={shape.height / 2}
                    fill={shape.color}
                    fillOpacity={0.85}
                    stroke={isSelected ? "var(--color-primary, #6750A4)" : "transparent"}
                    strokeWidth={2}
                    {...commonProps}
                  />
                ) : shape.kind === "draw" ? (
                  <polyline
                    {...commonProps}
                    points={(shape.points ?? []).map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke={isSelected ? "var(--color-primary, #6750A4)" : shape.color}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : shape.kind === "line" ? (
                  <g {...commonProps} style={{ cursor: canEdit ? "move" : "default" }}>
                    {/* wide invisible line makes the thin visible line easier to grab/drag */}
                    <line
                      x1={shape.x}
                      y1={shape.y}
                      x2={shape.x + shape.width}
                      y2={shape.y + shape.height}
                      stroke="transparent"
                      strokeWidth={16}
                    />
                    <line
                      x1={shape.x}
                      y1={shape.y}
                      x2={shape.x + shape.width}
                      y2={shape.y + shape.height}
                      stroke={isSelected ? "var(--color-primary, #6750A4)" : shape.color}
                      strokeWidth={4}
                      strokeLinecap="round"
                    />
                  </g>
                ) : (
                  // text
                  <g
                    {...commonProps}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      editText(shape);
                    }}
                    style={{ cursor: canEdit ? "move" : "default" }}
                  >
                    <rect
                      x={shape.x}
                      y={shape.y}
                      width={shape.width}
                      height={shape.height}
                      fill="transparent"
                      stroke={isSelected ? "var(--color-primary, #6750A4)" : "transparent"}
                      strokeDasharray="4 3"
                      strokeWidth={1.5}
                    />
                    <text
                      x={shape.x + 8}
                      y={shape.y + shape.height / 2}
                      dominantBaseline="middle"
                      fill={shape.color}
                      fontSize={16}
                      fontWeight={600}
                      style={{ userSelect: "none" }}
                    >
                      {shape.text || "Text"}
                    </text>
                  </g>
                )}

                {isSelected && canEdit && shape.kind !== "draw" && (
                  <rect
                    x={shape.x + shape.width - 10}
                    y={shape.y + shape.height - 10}
                    width={16}
                    height={16}
                    fill="var(--color-primary, #6750A4)"
                    rx={3}
                    style={{ cursor: shape.kind === "line" ? "pointer" : "nwse-resize" }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const point = svgPoint(e.clientX, e.clientY);
                      dragState.current = { id: shape.id, mode: "resize", startX: point.x, startY: point.y, shape };
                    }}
                  />
                )}
              </g>
            );
          })}

          {/* Other users' live cursors */}
          {cursors.map((c) => (
            <g key={c.clientId} style={{ pointerEvents: "none" }}>
              <circle cx={c.x} cy={c.y} r={5} fill={c.color} />
              <rect x={c.x + 8} y={c.y - 8} width={c.name.length * 6 + 12} height={18} rx={4} fill={c.color} />
              <text x={c.x + 14} y={c.y + 5} fontSize="11" fontWeight="700" fill="white">
                {c.name}
              </text>
            </g>
          ))}
        </svg>

        {shapes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-on-surface-variant">
              {canEdit ? "Pick a tool above, then click and drag on the canvas." : "Nothing here yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolBtn({
  onClick,
  title,
  children,
  disabled,
  active,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 disabled:opacity-30 disabled:pointer-events-none ${
        active
          ? "bg-primary/10 text-primary shadow-sm"
          : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
      }`}
    >
      {children}
    </button>
  );
}