import React, { useState } from 'react';
import { uploadToCloudinary } from '@/lib/uploadToCloudinary';
import { isBreedProhibited } from '../lib/breeds';
import { apiRequest } from '@/lib/queryClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { COMMON_BREEDS } from "@/lib/constants";

export default function DogForm({ uid, onSaved }: { uid: string; onSaved?: () => void }) {
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [dob, setDob] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    
    // Client-side breed validation before submitting
    if (!breed.trim()) {
      setError('Please enter a breed.');
      setLoading(false);
      return;
    }
    const prohibited = await isBreedProhibited(breed);
    if (prohibited) {
      setError("We're sorry, but we cannot accommodate this breed at our facility. We'd be happy to recommend other excellent care providers in the area.");
      setLoading(false);
      return;
    }

    try {
      let photoUrl: string | undefined;
      if (file) {
        const uploadResult = await uploadToCloudinary(file);
        photoUrl = uploadResult.secure_url;
      }
      
      const dogData = {
        name,
        breed,
        dob: dob || null,
        photoUrl: photoUrl || null,
      };
      
      // Use Express API endpoint with proper validation
      await apiRequest('/api/me/dogs', {
        method: 'POST',
        body: JSON.stringify({ dog: dogData }),
      });
      
      toast({
        title: "Dog added successfully! 🐕",
        description: `${name} has been added to your profile.`,
      });
      
      setLoading(false);
      onSaved && onSaved();
    } catch (err: any) {
      setLoading(false);
      if (err.message?.includes('breed')) {
        setError(err.message);
      } else {
        setError('Failed to save dog profile. Please try again.');
      }
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Add Your Dog</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="name">Dog Name *</Label>
            <Input
              id="name"
              required
              placeholder="Your dog's name"
              value={name}
              onChange={e => setName(e.target.value)}
              data-testid="input-dog-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="breed">Breed *</Label>
            <Input
              id="breed"
              required
              list="breed-suggestions"
              placeholder="e.g., Golden Retriever"
              value={breed}
              onChange={e => setBreed(e.target.value)}
              data-testid="input-dog-breed"
            />
            <datalist id="breed-suggestions">
              {COMMON_BREEDS.map(b => <option key={b} value={b} />)}
            </datalist>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dob">Date of Birth</Label>
            <Input
              id="dob"
              type="date"
              value={dob}
              onChange={e => setDob(e.target.value)}
              data-testid="input-dog-dob"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any special notes about your dog"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              data-testid="textarea-dog-notes"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="photo">Photo</Label>
            <Input
              id="photo"
              type="file"
              accept="image/*"
              onChange={e => setFile(e.target.files?.[0] || null)}
              data-testid="input-dog-photo"
            />
          </div>

          <Button 
            disabled={loading} 
            type="submit" 
            className="w-full"
            data-testid="button-save-dog"
          >
            {loading ? 'Saving...' : 'Save Dog'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}