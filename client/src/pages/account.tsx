import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlusCircle, User, Mail, Phone, Dog, Calendar, Weight, Heart } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  createdAt: string;
}

interface DogProfile {
  id: string;
  name: string;
  breed: string;
  sex: string;
  dob: string;
  weightKg: number;
  photoUrl: string;
  status: string;
  vaxTypes: string;
  temperament: string;
  createdAt: string;
}

export default function AccountPage() {
  const { user } = useAuth();

  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery<UserProfile>({
    queryKey: ['/api/me'],
    enabled: !!user
  });

  const { data: myDogs = [], isLoading: dogsLoading, error: dogsError } = useQuery<DogProfile[]>({
    queryKey: ['/api/me/dogs'],
    enabled: !!user
  });

  if (!user) {
    return (
      <div className="container max-w-3xl py-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Please Sign In</h1>
          <p className="text-muted-foreground">You need to be logged in to view your account.</p>
        </div>
      </div>
    );
  }

  if (profileLoading || dogsLoading) {
    return (
      <div className="container max-w-3xl py-8">
        <div className="text-center">
          <div className="text-lg">Loading your account...</div>
        </div>
      </div>
    );
  }

  if (profileError || dogsError) {
    return (
      <div className="container max-w-3xl py-8">
        <div className="text-center text-red-600">
          <div>Failed to load your account information.</div>
          <div className="text-sm mt-2">Please try refreshing the page.</div>
        </div>
      </div>
    );
  }

  const calculateAge = (dob: string) => {
    if (!dob) return "Unknown";
    const birthDate = new Date(dob);
    const today = new Date();
    const ageInMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
    
    if (ageInMonths < 12) {
      return `${ageInMonths} month${ageInMonths !== 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(ageInMonths / 12);
      return `${years} year${years !== 1 ? 's' : ''}`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'verified':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="container max-w-3xl py-8" data-testid="page-account">
      <h1 className="text-2xl font-semibold mb-6">My Account</h1>
      
      {/* User Profile Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Profile Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.photoURL || ''} alt={profile?.name || user.email || "User avatar"} />
              <AvatarFallback className="rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 text-white font-semibold tracking-wide backdrop-blur-sm bg-white/10 ring-1 ring-white/20 shadow-sm flex items-center justify-center transition hover:shadow-[0_0_10px_rgba(201,169,90,0.4)]">
                {profile?.name ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase() : user.email?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="flex items-center space-x-2" data-testid="text-email">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{profile?.email || user.email}</span>
              </div>
              {profile?.name && (
                <div className="flex items-center space-x-2" data-testid="text-name">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.name}</span>
                </div>
              )}
              {profile?.phone && (
                <div className="flex items-center space-x-2" data-testid="text-phone">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.phone}</span>
                </div>
              )}
              <Badge variant="secondary" data-testid="text-role">
                {profile?.role || 'user'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Dogs Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Dog className="h-5 w-5" />
              <span>My Dogs</span>
            </CardTitle>
            <Link href="/add-dog">
              <Button className="gap-2" data-testid="button-add-dog">
                <PlusCircle className="h-4 w-4" />
                Add Dog
              </Button>
            </Link>
          </div>
          <CardDescription>
            Manage your furry family members and their information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {myDogs.length === 0 ? (
            <div className="text-center py-8">
              <div className="rounded-lg border-2 border-dashed border-muted bg-muted/50 p-6">
                <Dog className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Dogs Yet</h3>
                <p className="text-muted-foreground mb-4">
                  You haven't added any dogs to your pack yet.
                </p>
                <Link href="/add-dog">
                  <Button data-testid="button-add-first-dog">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add your first dog
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {myDogs.map((dog) => (
                <div 
                  key={dog.id} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`card-dog-${dog.id}`}
                >
                  <div className="flex items-center space-x-4">
                    {dog.photoUrl ? (
                      <img 
                        src={dog.photoUrl} 
                        alt={dog.name}
                        className="h-16 w-16 rounded-full object-cover border-2 border-muted"
                        data-testid={`img-dog-${dog.id}`}
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                        <Dog className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="space-y-1">
                      <h3 className="font-medium text-lg" data-testid={`text-dog-name-${dog.id}`}>
                        {dog.name}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        {dog.breed && (
                          <span data-testid={`text-breed-${dog.id}`}>{dog.breed}</span>
                        )}
                        {dog.dob && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span data-testid={`text-age-${dog.id}`}>{calculateAge(dog.dob)}</span>
                          </div>
                        )}
                        {dog.weightKg && (
                          <div className="flex items-center space-x-1">
                            <Weight className="h-3 w-3" />
                            <span data-testid={`text-weight-${dog.id}`}>{dog.weightKg}kg</span>
                          </div>
                        )}
                      </div>
                      {dog.temperament && (
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <Heart className="h-3 w-3" />
                          <span data-testid={`text-temperament-${dog.id}`}>{dog.temperament}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <Badge 
                      className={getStatusColor(dog.status)}
                      data-testid={`status-${dog.id}`}
                    >
                      {dog.status}
                    </Badge>
                    {dog.vaxTypes && (
                      <div className="text-xs text-muted-foreground">
                        <div data-testid={`text-vaccinations-${dog.id}`}>
                          Vaccinations: {dog.vaxTypes}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}