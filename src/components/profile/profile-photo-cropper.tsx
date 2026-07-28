import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const VIEWPORT = 288; // CSS px — the fixed square/circular crop window
const MIN_ZOOM = 1; // 1x = the minimum scale that fully covers the viewport ("cover" fit)
const MAX_ZOOM = 3;
const PAN_KEY_STEP = 12; // px nudged per arrow-key press, for keyboard-only users

export interface ProfilePhotoCropperHandle {
  /** Renders the current crop to a square canvas and returns a compressed
   *  JPEG Blob — this, never the original file, is what gets uploaded. */
  getCroppedBlob: (outputSize?: number, quality?: number) => Promise<Blob | null>;
}

interface Point {
  x: number;
  y: number;
}

export const ProfilePhotoCropper = forwardRef<ProfilePhotoCropperHandle, { imageUrl: string }>(
  function ProfilePhotoCropper({ imageUrl }, ref) {
    const imgRef = useRef<HTMLImageElement>(null);
    const dragState = useRef<{ start: Point; startPan: Point } | null>(null);

    const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
    const [zoom, setZoom] = useState(MIN_ZOOM);
    const [pan, setPan] = useState<Point>({ x: 0, y: 0 });

    // A newly-selected image always starts centered at 1x, never carrying
    // over the previous photo's crop state.
    useEffect(() => {
      setNaturalSize(null);
      setZoom(MIN_ZOOM);
      setPan({ x: 0, y: 0 });
    }, [imageUrl]);

    const baseScale = naturalSize
      ? Math.max(VIEWPORT / naturalSize.width, VIEWPORT / naturalSize.height)
      : 1;
    const effectiveScale = baseScale * zoom;
    const displayWidth = naturalSize ? naturalSize.width * effectiveScale : 0;
    const displayHeight = naturalSize ? naturalSize.height * effectiveScale : 0;
    const maxPanX = Math.max(0, (displayWidth - VIEWPORT) / 2);
    const maxPanY = Math.max(0, (displayHeight - VIEWPORT) / 2);

    function clamp(point: Point, boundX: number, boundY: number): Point {
      return {
        x: Math.min(boundX, Math.max(-boundX, point.x)),
        y: Math.min(boundY, Math.max(-boundY, point.y)),
      };
    }

    function handleImageLoad() {
      const img = imgRef.current;
      if (img) setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    }

    function handleZoomChange(nextZoom: number) {
      setZoom(nextZoom);
      if (!naturalSize) return;
      const scale = baseScale * nextZoom;
      const w = naturalSize.width * scale;
      const h = naturalSize.height * scale;
      setPan((prev) =>
        clamp(prev, Math.max(0, (w - VIEWPORT) / 2), Math.max(0, (h - VIEWPORT) / 2)),
      );
    }

    function handleReset() {
      setZoom(MIN_ZOOM);
      setPan({ x: 0, y: 0 });
    }

    function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragState.current = { start: { x: e.clientX, y: e.clientY }, startPan: pan };
    }

    function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
      if (!dragState.current) return;
      const dx = e.clientX - dragState.current.start.x;
      const dy = e.clientY - dragState.current.start.y;
      setPan(
        clamp(
          { x: dragState.current.startPan.x + dx, y: dragState.current.startPan.y + dy },
          maxPanX,
          maxPanY,
        ),
      );
    }

    function handlePointerUp() {
      dragState.current = null;
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
      const deltas: Record<string, Point> = {
        ArrowLeft: { x: PAN_KEY_STEP, y: 0 },
        ArrowRight: { x: -PAN_KEY_STEP, y: 0 },
        ArrowUp: { x: 0, y: PAN_KEY_STEP },
        ArrowDown: { x: 0, y: -PAN_KEY_STEP },
      };
      const delta = deltas[e.key];
      if (!delta) return;
      e.preventDefault();
      setPan((prev) => clamp({ x: prev.x + delta.x, y: prev.y + delta.y }, maxPanX, maxPanY));
    }

    useImperativeHandle(
      ref,
      () => ({
        getCroppedBlob: async (outputSize = 512, quality = 0.85) => {
          const img = imgRef.current;
          if (!img || !naturalSize) return null;

          const sourceSize = VIEWPORT / effectiveScale;
          const sourceX = naturalSize.width / 2 - sourceSize / 2 - pan.x / effectiveScale;
          const sourceY = naturalSize.height / 2 - sourceSize / 2 - pan.y / effectiveScale;

          const canvas = document.createElement("canvas");
          canvas.width = outputSize;
          canvas.height = outputSize;
          const ctx = canvas.getContext("2d");
          if (!ctx) return null;

          ctx.drawImage(
            img,
            sourceX,
            sourceY,
            sourceSize,
            sourceSize,
            0,
            0,
            outputSize,
            outputSize,
          );
          return new Promise<Blob | null>((resolve) =>
            canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality),
          );
        },
      }),
      [naturalSize, effectiveScale, pan],
    );

    return (
      <div className="flex flex-col items-center gap-4">
        <div
          className="relative overflow-hidden rounded-full bg-muted touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-grab active:cursor-grabbing"
          style={{ width: VIEWPORT, height: VIEWPORT }}
          tabIndex={0}
          role="group"
          aria-label="Photo preview. Drag, or use arrow keys, to reposition."
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
        >
          <img
            ref={imgRef}
            src={imageUrl}
            alt=""
            draggable={false}
            onLoad={handleImageLoad}
            className="absolute pointer-events-none max-w-none"
            style={
              naturalSize
                ? {
                    width: displayWidth,
                    height: displayHeight,
                    left: VIEWPORT / 2 - displayWidth / 2 + pan.x,
                    top: VIEWPORT / 2 - displayHeight / 2 + pan.y,
                  }
                : { opacity: 0 }
            }
          />
          {!naturalSize && (
            <div className="absolute inset-0 grid place-items-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          )}
          {/* Ring overlay marking the crop boundary — decorative only. */}
          <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-border pointer-events-none" />
        </div>

        <div className="w-full max-w-xs flex items-center gap-3">
          <label htmlFor="photo-zoom" className="sr-only">
            Zoom
          </label>
          <input
            id="photo-zoom"
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={!naturalSize}
            onChange={(e) => handleZoomChange(Number(e.target.value))}
            className="flex-1 accent-primary"
            aria-label="Zoom"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={!naturalSize}
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Reset
          </Button>
        </div>
      </div>
    );
  },
);
