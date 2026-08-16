import { Cog } from "lucide-react";

// Two meshing gears rather than one spinning icon — the big gear turns
// slower and counter-clockwise (animate-spin-reverse, see globals.css),
// the small one faster and clockwise (Tailwind's built-in animate-spin)
// — roughly how differently-sized meshing gears actually move relative
// to each other, which is what makes it read as "gears turning" instead
// of just two identical icons spinning in place.
export function Spinner({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <div className={`relative ${className}`} role="status" aria-label="Loading">
      <Cog className="animate-spin-reverse absolute top-0 left-0 h-[70%] w-[70%] text-accent" />
      <Cog className="absolute right-0 bottom-0 h-[46%] w-[46%] animate-spin text-muted-foreground" />
    </div>
  );
}
