import React, { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import DogForm from '../components/DogForm';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from '@/lib/api';
import { useLocation } from 'wouter';

export default function Onboarding() {
  const [uid, setUid] = useState<string | undefined>();
  const [step, setStep] = useState<'owner' | 'dog'>('owner');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [, setLocation] = useLocation();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (!u) { 
        setLocation('/login'); 
        return; 
      }
      setUid(u.uid);
      setEmail(u.email || '');
      const snap = await getDoc(doc(db, 'users', u.uid));
      if (snap.exists()) {
        // profile exists – go straight to dog step
        setStep('dog');
      }
    });
    return () => unsub();
  }, [setLocation]);

  const saveOwner = async () => {
    if (!uid) return;
    // Save to Firestore for profile-exists check
    await setDoc(doc(db, 'users', uid), {
      uid, name, email, phone, createdAt: Date.now()
    }, { merge: true });
    // Sync name and phone to PostgreSQL so backend has the data
    try {
      await api.patch('/api/me', { name, phone });
    } catch (err) {
      console.error('Failed to sync profile to server:', err);
    }
    setStep('dog');
  };

  if (!uid) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      {step === 'owner' ? (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Your Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                required
                placeholder="Enter your full name"
                value={name}
                onChange={e => setName(e.target.value)}
                data-testid="input-owner-name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="Your phone number"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                data-testid="input-owner-phone"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                readOnly
                value={email}
                className="bg-gray-50"
                data-testid="input-owner-email"
              />
            </div>
            
            <Button 
              onClick={saveOwner} 
              disabled={!name} 
              className="w-full"
              data-testid="button-continue-onboarding"
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="w-full max-w-md">
          <DogForm uid={uid} onSaved={() => { setLocation('/profile'); }} />
        </div>
      )}
    </div>
  );
}