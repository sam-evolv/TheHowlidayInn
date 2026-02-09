import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusCircle, Dog, User, Mail, Phone } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef } from "react";

interface Dog {
  id: string;
  name: string;
  breed: string;
  sex: string;
  dob: string;
  weightKg: number | null;
  status: string;
  photoUrl?: string;
  ownerId: string;
}

interface UserProfile {
  id: string;
  email: string;
  name?: string;
  phone?: string;
}

interface DogSelectorProps {
  selectedDogId?: string;
  onDogSelect: (dog: Dog | null, ownerInfo: { name: string; email: string; phone: string }) => void;
  disabled?: boolean;
  className?: string;
}

export default function DogSelector({ selectedDogId, onDogSelect, disabled = false, className = "" }: DogSelectorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Fetch user profile
  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery<UserProfile>({
    queryKey: ['/api/me'],
    enabled: !!user,
  });

  // Fetch user's dogs
  const { data: dogs = [], isLoading: dogsLoading, error: dogsError } = useQuery<Dog[]>({
    queryKey: ['/api/me/dogs'],
    enabled: !!user,
  });

  // Track if we've already shown error toasts to prevent loops
  const errorToastShown = useRef(false);
  
  // Show error if queries fail - wrapped in useEffect to prevent render loops
  useEffect(() => {
    if ((profileError || dogsError) && !errorToastShown.current) {
      errorToastShown.current = true;
      toast({
        title: "Unable to load your information",
        description: "Please refresh the page or try again later.",
        variant: "destructive",
      });
    }
    
    // Reset error toast flag if errors are cleared
    if (!profileError && !dogsError) {
      errorToastShown.current = false;
    }
  }, [profileError, dogsError, toast]);

  // Loading state
  if (profileLoading || dogsLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <Card className={className}>
        <CardContent className="p-4 text-center">
          <User className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            Please sign in to select your registered dogs
          </p>
          <Link href="/login">
            <Button size="sm" data-testid="button-signin">
              Sign In
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const eligibleDogs = dogs.filter((dog: Dog) => 
    dog.status === 'verified' || dog.status === 'approved'
  );
  
  const selectedDog = eligibleDogs.find((dog: Dog) => dog.id === selectedDogId);

  const handleDogChange = (dogId: string) => {
    if (dogId === "add-new") {
      // Navigate to dog registration
      setLocation('/register-dog');
      return;
    }

    const dog = eligibleDogs.find((d: Dog) => d.id === dogId);
    const ownerInfo = {
      name: profile?.name || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
    };

    onDogSelect(dog || null, ownerInfo);
  };

  const calculateAge = (dob: string) => {
    if (!dob) return "Unknown";
    const birthDate = new Date(dob);
    const today = new Date();
    const ageInMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
    
    if (ageInMonths < 12) {
      return `${ageInMonths} month${ageInMonths !== 1 ? 's' : ''} old`;
    } else {
      const years = Math.floor(ageInMonths / 12);
      const months = ageInMonths % 12;
      if (months === 0) {
        return `${years} year${years !== 1 ? 's' : ''} old`;
      } else {
        return `${years}y ${months}m old`;
      }
    }
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Select Your Dog
            </label>
            
            {eligibleDogs.length === 0 ? (
              <div className="text-center py-6">
                <Dog className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">
                  You don't have any verified dogs yet
                </p>
                <Link href="/register-dog">
                  <Button size="sm" data-testid="button-add-first-dog">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Register Your First Dog
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <Select value={selectedDogId || ""} onValueChange={handleDogChange} disabled={disabled}>
                  <SelectTrigger data-testid="select-dog">
                    <SelectValue placeholder="Choose a dog from your pack" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleDogs.map((dog: Dog) => (
                      <SelectItem key={dog.id} value={dog.id} data-testid={`option-dog-${dog.id}`}>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{dog.name}</span>
                          <span className="text-muted-foreground">• {dog.breed}</span>
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="add-new" data-testid="option-add-new">
                      <div className="flex items-center space-x-2 text-primary">
                        <PlusCircle className="h-4 w-4" />
                        <span>Add New Dog</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {selectedDog && (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-4">
                    <div className="flex items-start space-x-3">
                      {selectedDog.photoUrl && (
                        <img 
                          src={selectedDog.photoUrl} 
                          alt={selectedDog.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-semibold text-gray-900" data-testid={`text-selected-dog-name`}>
                            {selectedDog.name}
                          </h4>
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            {selectedDog.status === 'verified' ? 'Verified' : 'Approved'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Breed:</span> {selectedDog.breed}
                          </div>
                          <div>
                            <span className="font-medium">Age:</span> {calculateAge(selectedDog.dob)}
                          </div>
                          <div>
                            <span className="font-medium">Sex:</span> {selectedDog.sex}
                          </div>
                          {selectedDog.weightKg && (
                            <div>
                              <span className="font-medium">Weight:</span> {selectedDog.weightKg} kg
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <Link href="/register-dog">
                  <Button variant="outline" size="sm" className="w-full mt-4" data-testid="button-add-another-dog">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Another Dog
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Owner Information Display */}
          {profile && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Owner Information</h4>
              <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span data-testid="text-owner-name">
                    {profile.name || 'Name not provided'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span data-testid="text-owner-email">{profile.email}</span>
                </div>
                {profile.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span data-testid="text-owner-phone">{profile.phone}</span>
                  </div>
                )}
                {!profile.name && (
                  <Link href="/account">
                    <Button variant="link" size="sm" className="h-auto p-0 text-primary">
                      Complete your profile →
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}