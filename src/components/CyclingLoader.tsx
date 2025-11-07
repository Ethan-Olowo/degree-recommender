import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CyclingLoaderProps {
  phrases: string[];
  intervalMs?: number;
  className?: string;
}

export const CyclingLoader = ({ 
  phrases, 
  intervalMs = 1800,
  className 
}: CyclingLoaderProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % phrases.length);
        setIsVisible(true);
      }, 300);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [phrases.length, intervalMs]);

  return (
    <div className={cn("flex flex-col items-center justify-center space-y-4", className)}>
      <div className="relative">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <div className="absolute inset-0 h-12 w-12 animate-pulse rounded-full border-4 border-primary/20" />
      </div>
      <p
        className={cn(
          "text-center text-sm text-muted-foreground font-medium transition-opacity duration-300",
          isVisible ? "opacity-100" : "opacity-0"
        )}
      >
        {phrases[currentIndex]}
      </p>
    </div>
  );
};
