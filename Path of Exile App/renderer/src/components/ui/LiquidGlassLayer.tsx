import GlassSurface from '@/components/ui/GlassSurface.jsx';

export function LiquidGlassLayer({
  borderRadius = 12,
  className = 'character-glass-layer',
}: {
  borderRadius?: number;
  className?: string;
}) {
  return (
    <GlassSurface
      width={100}
      height={100}
      borderRadius={borderRadius}
      borderWidth={0.27}
      opacity={0.92}
      blur={16}
      displace={1.25}
      backgroundOpacity={0.28}
      saturation={1.1}
      distortionScale={-12}
      redOffset={0}
      greenOffset={0}
      blueOffset={0}
      renderer="auto"
      backdrop={undefined}
      shape={undefined}
      className={className}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <span aria-hidden="true" />
    </GlassSurface>
  );
}
