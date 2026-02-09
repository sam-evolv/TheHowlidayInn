import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/components/auth/AuthProvider';
import { dogAboutInsertSchema, type DogAboutInsert } from '@shared/schema';
import { PawPrint, Upload, Heart, Info, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getIdToken } from 'firebase/auth';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { uploadToCloudinary } from '@/lib/uploadToCloudinary';
import { useErrorHandler } from '@/lib/errorUtils';

export default function AddDogPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { handleError, handleApiError } = useErrorHandler();

  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<DogAboutInsert & { photoFile?: FileList }>({
    resolver: zodResolver(dogAboutInsertSchema),
    defaultValues: {
      name: '',
      breed: '',
      sex: undefined,
      dob: '',
      weightKg: undefined,
      neuteredSpayed: false,
      color: '',
      microchip: '',
      photoUrl: '',
    },
  });

  const addDogMutation = useMutation({
    mutationFn: async (data: DogAboutInsert) => {
      const idToken = user ? await getIdToken(user) : null;
      return apiRequest('/api/dogs', {
        method: 'POST',
        headers: { ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) },
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: "Pawsome! 🐾",
        description: "Your furry friend has been added to your pack! Ready to book their first stay?",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/me/dogs'] });
      setLocation('/account');
    },
    onError: (error: any) => {
      handleApiError(
        error,
        'POST_/api/dogs',
        'Please try again or contact our friendly team.'
      );
    },
  });

  const onSubmit = async (values: DogAboutInsert & { photoFile?: FileList }) => {
    if (!user) {
      toast({
        title: "Please sign in first",
        description: "You need to be logged in to add a dog profile.",
        variant: "destructive",
      });
      setLocation('/login');
      return;
    }

    try {
      setIsUploading(true);
      
      // If photo file exists, upload first and set photoUrl
      if (values.photoFile?.[0]) {
        const { secure_url } = await uploadToCloudinary(values.photoFile[0]);
        values.photoUrl = secure_url;
      }
      
      // Remove photoFile from the data before sending to API
      const { photoFile, ...dogData } = values;
      
      addDogMutation.mutate(dogData);
    } catch (error: any) {
      handleError(
        error, 
        'DOG_PHOTO_UPLOAD', 
        'Failed to upload photo. Please try again.',
        { photoFile: values.photoFile?.[0]?.name }
      );
    } finally {
      setIsUploading(false);
    }
  };

  if (!user) {
    setLocation('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 page-content">
      <div className="pb-8">
        <div className="max-w-2xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg">
                <PawPrint className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
                Add Your Furry Friend
              </h1>
            </div>
            <p className="text-lg text-muted-foreground flex items-center justify-center space-x-2">
              <Heart className="h-5 w-5 text-pink-500" />
              <span>Let's get to know your best friend better!</span>
            </p>
          </div>

        <Card className="shadow-xl border border-border bg-card/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PawPrint className="h-6 w-6 text-green-600" />
              <span>Dog Profile Information</span>
            </CardTitle>
            <CardDescription>
              This helps us provide the best personalised care for your furry family member.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Information */}
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dog's Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Buddy" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="breed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Breed *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Golden Retriever" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sex"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sex</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select sex" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Neutered/Spayed">Neutered/Spayed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dob"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Additional Information */}
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="weightKg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight (kg)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            min="1" 
                            max="100"
                            step="0.1"
                            onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Golden, Brown, Black, etc." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="microchip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Microchip ID</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="15-digit microchip number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="neuteredSpayed"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="mt-1"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Neutered/Spayed</FormLabel>
                          <FormDescription>
                            Check if your dog has been neutered or spayed
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Photo Upload */}
                <FormField
                  control={form.control}
                  name="photoFile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dog Photo (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="file" 
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => field.onChange(e.target.files)}
                          disabled={isUploading || addDogMutation.isPending}
                          data-testid="input-photo"
                        />
                      </FormControl>
                      <FormDescription>
                        Upload a photo to help us recognise your dog
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                  disabled={addDogMutation.isPending || isUploading}
                  data-testid="button-submit"
                >
                  {(addDogMutation.isPending || isUploading) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isUploading ? 'Uploading Photo...' : 'Adding to Pack...'}
                    </>
                  ) : (
                    'Add My Furry Friend 🐾'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}