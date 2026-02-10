import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { User, Dog, PlusCircle } from 'lucide-react';
import { Link } from 'wouter';
import { getIdToken } from 'firebase/auth';

// Owner profile schema
const ownerProfileSchema = z.object({
  name: z.string().min(1, "Full name is required").trim(),
  phone: z.string().optional().transform(val => val?.trim() || undefined),
  email: z.string().email("Valid email required").trim(),
});

type OwnerProfileForm = z.infer<typeof ownerProfileSchema>;

interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
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
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ['/api/me'],
    enabled: !!user,
    queryFn: async () => {
      const idToken = user ? await getIdToken(user) : null;
      return apiRequest('/api/me', {
        headers: { ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) }
      });
    },
  });

  // Fetch user's dogs
  const { data: dogs = [], isLoading: dogsLoading } = useQuery<DogProfile[]>({
    queryKey: ['/api/me/dogs'],
    enabled: !!user,
    queryFn: async () => {
      const idToken = user ? await getIdToken(user) : null;
      return apiRequest('/api/me/dogs', {
        headers: { ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) }
      });
    },
  });

  const form = useForm<OwnerProfileForm>({
    resolver: zodResolver(ownerProfileSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
    },
    values: profile ? {
      name: profile.name || '',
      phone: profile.phone || '',
      email: profile.email || '',
    } : undefined,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: OwnerProfileForm) => {
      const idToken = user ? await getIdToken(user) : null;
      return apiRequest('/api/me', {
        method: 'PATCH',
        headers: { ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile information has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OwnerProfileForm) => {
    updateProfileMutation.mutate(data);
  };

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

  if (!user) {
    return (
      <div className="container max-w-4xl pb-16 px-4 page-content">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Please sign in to view your profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (profileLoading || dogsLoading) {
    return (
      <div className="container max-w-4xl pb-16 px-4 page-content">
        <div className="text-center">
          <div className="text-lg text-muted-foreground">Loading your profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl pb-8 px-4 page-content" data-testid="page-profile">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Your Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your personal information and your furry friends</p>
      </div>

      {/* Owner Profile Form */}
      <Card className="mb-8" data-testid="card-owner-profile">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <span>Owner Information</span>
          </CardTitle>
          <CardDescription>Update your contact details</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-muted-foreground">
                        Full Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="e.g., John Smith" 
                          className="rounded-lg border shadow-sm focus:ring-2 focus:ring-primary/40"
                          data-testid="input-owner-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-muted-foreground">Phone</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          inputMode="tel" 
                          placeholder="e.g., 0871234567" 
                          className="rounded-lg border shadow-sm focus:ring-2 focus:ring-primary/40"
                          data-testid="input-owner-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-sm font-medium text-muted-foreground">
                        Email <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          type="email" 
                          placeholder="you@example.com" 
                          className="rounded-lg border shadow-sm focus:ring-2 focus:ring-primary/40"
                          data-testid="input-owner-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center justify-end">
                <Button 
                  type="submit" 
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-save-owner"
                >
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Dogs Section */}
      <Card data-testid="card-dogs">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dog className="h-5 w-5" />
              <CardTitle>My Dogs</CardTitle>
            </div>
            <Link href="/add-dog">
              <Button className="gap-2" data-testid="button-add-dog">
                <PlusCircle className="h-4 w-4" />
                Add Dog
              </Button>
            </Link>
          </div>
          <CardDescription>Manage your furry family members</CardDescription>
        </CardHeader>
        <CardContent>
          {dogs.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-muted rounded-lg bg-muted/10">
              <Dog className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium mb-2">No Dogs Yet</h3>
              <p className="text-muted-foreground mb-4">Add your first furry friend to get started</p>
              <Link href="/add-dog">
                <Button data-testid="button-add-first-dog">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Your First Dog
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {dogs.map((dog) => (
                <div 
                  key={dog.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/5 transition-colors"
                  data-testid={`card-dog-${dog.id}`}
                >
                  <div className="flex items-center gap-4">
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
                    <div>
                      <h3 className="font-medium text-lg" data-testid={`text-dog-name-${dog.id}`}>
                        {dog.name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span data-testid={`text-breed-${dog.id}`}>{dog.breed}</span>
                        {dog.dob && <span data-testid={`text-age-${dog.id}`}>{calculateAge(dog.dob)}</span>}
                        {dog.weightKg && <span data-testid={`text-weight-${dog.id}`}>{dog.weightKg}kg</span>}
                      </div>
                    </div>
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
