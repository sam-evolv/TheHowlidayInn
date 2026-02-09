import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { User, Dog, Edit3, Plus, Trash2, Calendar, Award, AlertCircle, Check, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthProvider";
import { getIdToken } from "firebase/auth";
import { apiRequest } from "@/lib/queryClient";
import { useState, useMemo } from "react";
import TrialBanner from "@/components/TrialBanner";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

interface DogProfile {
  id: string;
  name: string;
  breed: string;
  sex: string;
  ageYears?: string;
  weightKg?: string;
  photoUrl?: string;
  status: string;
  disallowedReason?: string;
  nextExpiry?: string;
  createdAt: string;
  trialRequired?: boolean;
  trialCompletedAt?: string | null;
}

export default function MyAccount() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ['/api/me'],
    enabled: !!user,
  });

  // Fetch user's dogs
  const { data: dogs = [], isLoading: dogsLoading } = useQuery<DogProfile[]>({
    queryKey: ['/api/me/dogs'],
    enabled: !!user,
  });

  // Identify dogs that need trials
  const dogsNeedingTrial = useMemo(() => {
    return dogs
      .filter(dog => dog.trialRequired === true)
      .map(dog => ({ id: dog.id, name: dog.name }));
  }, [dogs]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest('/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your name has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      setIsEditingName(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      });
    },
  });

  // Delete dog mutation
  const deleteDogMutation = useMutation({
    mutationFn: async (dogId: string) => {
      const idToken = user ? await getIdToken(user) : null;
      return apiRequest(`/api/me/dogs/${dogId}`, {
        method: 'DELETE',
        headers: { ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) },
      });
    },
    onSuccess: () => {
      toast({
        title: "Dog Removed",
        description: "Your dog profile has been successfully removed.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/me/dogs'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove dog profile.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteDog = async (dogId: string, dogName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove ${dogName}'s profile? This action cannot be undone.`
    );
    if (confirmed) {
      deleteDogMutation.mutate(dogId);
    }
  };

  const handleEditName = () => {
    setEditedName(profile?.name || '');
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    if (!editedName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }
    updateProfileMutation.mutate(editedName.trim());
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  const getStatusBadge = (status: string, nextExpiry?: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Verified ✓</Badge>;
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Approved</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending Review</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Not Eligible</Badge>;
      case 'expired':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Expired</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--hi-cream)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--hi-gold)' }}></div>
      </div>
    );
  }

  if (!user) {
    setLocation('/login');
    return null;
  }

  return (
    <div className="min-h-screen page-enter" style={{ background: 'var(--hi-cream)' }}>
      <div className="container mx-auto px-4 pt-32 pb-8 max-w-6xl">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--hi-brown)' }}>My Account</h1>
            <p className="mt-1" style={{ color: 'var(--hi-brown)', opacity: 0.8 }}>Manage your profile and your furry friends</p>
          </div>
          <Button
            onClick={() => setLocation('/add-dog')}
            className="btn-primary"
            data-testid="button-add-dog"
          >
            <Plus className="h-4 w-4 mr-2" />
            Register New Dog
          </Button>
        </div>

        {/* Trial Day Banner */}
        <TrialBanner dogsNeedingTrial={dogsNeedingTrial} className="mb-6" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Profile Card */}
          <div className="lg:col-span-1">
            <Card data-testid="card-user-profile" style={{ background: 'var(--hi-cream)', border: '1px solid var(--hi-border)' }}>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-full" style={{ background: 'var(--hi-beige)' }}>
                    <User className="h-6 w-6" style={{ color: 'var(--hi-brown)' }} />
                  </div>
                  <div>
                    <CardTitle>Your Profile</CardTitle>
                    <CardDescription>Account information</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {profileLoading ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ) : profile ? (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Name</label>
                      {isEditingName ? (
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            placeholder="Enter your name"
                            className="flex-1"
                            data-testid="input-edit-name"
                          />
                          <Button
                            size="sm"
                            onClick={handleSaveName}
                            disabled={updateProfileMutation.isPending}
                            data-testid="button-save-name"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            disabled={updateProfileMutation.isPending}
                            data-testid="button-cancel-edit"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-gray-900" data-testid="text-user-name">
                            {profile.name || 'Not provided'}
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleEditName}
                            data-testid="button-edit-name"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-gray-900" data-testid="text-user-email">{profile.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Member Since</label>
                      <p className="text-gray-900">
                        {new Date(profile.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Account Type</label>
                      <p className="text-gray-900">
                        <Badge variant={profile.role === 'admin' ? 'default' : 'outline'}>
                          {profile.role === 'admin' ? 'Administrator' : 'Pet Owner'}
                        </Badge>
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500">Unable to load profile</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Dogs Section */}
          <div className="lg:col-span-2">
            <Card data-testid="card-my-dogs" style={{ background: 'var(--hi-cream)', border: '1px solid var(--hi-border)' }}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-full" style={{ background: 'var(--hi-beige)' }}>
                      <Dog className="h-6 w-6" style={{ color: 'var(--hi-brown)' }} />
                    </div>
                    <div>
                      <CardTitle>My Dogs ({dogs.length})</CardTitle>
                      <CardDescription>Manage your registered dogs</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {dogsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse rounded-lg p-4" style={{ border: '1px solid var(--hi-border)' }}>
                        <div className="flex items-start space-x-3">
                          <div className="h-16 w-16 rounded-lg" style={{ background: 'var(--hi-beige)' }}></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 rounded w-3/4" style={{ background: 'var(--hi-beige)' }}></div>
                            <div className="h-3 rounded w-1/2" style={{ background: 'var(--hi-beige)' }}></div>
                            <div className="h-3 rounded w-1/3" style={{ background: 'var(--hi-beige)' }}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : dogs.length === 0 ? (
                  <div className="text-center py-8">
                    <Dog className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--hi-brown)', opacity: 0.4 }} />
                    <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--hi-brown)' }}>No dogs registered yet</h3>
                    <p className="mb-4" style={{ color: 'var(--hi-brown)', opacity: 0.7 }}>
                      Add your first furry friend to start booking daycare and boarding services
                    </p>
                    <Button
                      onClick={() => setLocation('/add-dog')}
                      className="btn-primary"
                      data-testid="button-register-first-dog"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Register Your First Dog
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dogs.map((dog) => (
                      <div 
                        key={dog.id} 
                        className="rounded-lg p-4 hover:shadow-md transition-shadow"
                        style={{ border: '1px solid var(--hi-border)', background: 'white' }}
                        data-testid={`card-dog-${dog.id}`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            {dog.photoUrl ? (
                              <img 
                                src={dog.photoUrl} 
                                alt={dog.name}
                                className="h-16 w-16 rounded-lg object-cover"
                                data-testid={`img-dog-photo-${dog.id}`}
                              />
                            ) : (
                              <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center">
                                <Dog className="h-8 w-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 
                                  className="font-semibold text-gray-900 truncate"
                                  data-testid={`text-dog-name-${dog.id}`}
                                >
                                  {dog.name}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  {dog.breed} {dog.sex && `• ${dog.sex}`}
                                </p>
                                {dog.ageYears && (
                                  <p className="text-sm text-gray-500">
                                    {dog.ageYears} years {dog.weightKg && `• ${dog.weightKg} kg`}
                                  </p>
                                )}
                              </div>
                              
                              <div className="flex space-x-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  data-testid={`button-delete-${dog.id}`}
                                  onClick={() => handleDeleteDog(dog.id, dog.name)}
                                  disabled={deleteDogMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {getStatusBadge(dog.status, dog.nextExpiry)}
                                {dog.nextExpiry && (
                                  <span className="text-xs text-gray-500 flex items-center">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    Expires {new Date(dog.nextExpiry).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>

                            {dog.status === 'rejected' && dog.disallowedReason && (
                              <div className="mt-2 flex items-start space-x-2 p-2 bg-red-50 rounded-md">
                                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700">{dog.disallowedReason}</p>
                              </div>
                            )}

                            {(dog.status === 'verified' || dog.status === 'approved') && (
                              <div className="mt-2">
                                <Button 
                                  size="sm" 
                                  className="w-full btn-primary"
                                  onClick={() => setLocation('/daycare')}
                                  data-testid={`button-book-${dog.id}`}
                                >
                                  <Award className="h-4 w-4 mr-2" />
                                  Book Services
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}