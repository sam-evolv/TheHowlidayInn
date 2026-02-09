import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { isBreedRestricted } from "@/lib/firebase";

interface BreedBadgeProps {
  breed: string;
  className?: string;
}

export default function BreedBadge({ breed, className = "" }: BreedBadgeProps) {
  const [isRestricted, setIsRestricted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkBreed = async () => {
      try {
        const restricted = await isBreedRestricted(breed);
        setIsRestricted(restricted);
      } catch (error) {
        console.error('Error checking breed restriction:', error);
        setIsRestricted(false); // Default to not restricted if error
      } finally {
        setIsLoading(false);
      }
    };

    if (breed) {
      checkBreed();
    } else {
      setIsLoading(false);
    }
  }, [breed]);

  if (isLoading) {
    return (
      <Badge variant="outline" className={`${className} animate-pulse`}>
        <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
        <span>Checking breed...</span>
      </Badge>
    );
  }

  if (isRestricted === null) {
    return (
      <Badge variant="outline" className={`border-gray-200 text-gray-700 ${className}`}>
        <AlertTriangle className="w-4 h-4 mr-1" />
        Unknown breed status
      </Badge>
    );
  }

  return (
    <Badge 
      className={`flex items-center gap-2 ${
        isRestricted 
          ? 'bg-red-100 text-red-800 border-red-200' 
          : 'bg-green-100 text-green-800 border-green-200'
      } ${className}`}
      data-testid={`breed-badge-${isRestricted ? 'restricted' : 'accepted'}`}
    >
      {isRestricted ? (
        <>
          <AlertTriangle className="w-4 h-4" />
          <span className="font-medium">Breed Restricted</span>
        </>
      ) : (
        <>
          <CheckCircle className="w-4 h-4" />
          <span className="font-medium">Breed Accepted</span>
        </>
      )}
    </Badge>
  );
}