'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';

const propertySchema = z.object({
  name: z.string().min(1, { message: 'Property name is required' }),
  address: z.string().min(1, { message: 'Address is required' }),
  city: z.string().min(1, { message: 'City is required' }),
  state: z.string().min(1, { message: 'State is required' }),
  zip: z.string().min(1, { message: 'ZIP code is required' }),
  totalUnits: z.string().transform(val => parseInt(val, 10)).refine(val => !isNaN(val) && val > 0, {
    message: 'Total units must be a positive number',
  }),
});

type PropertyFormValues = z.infer<typeof propertySchema>;

export function PropertyForm() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      totalUnits: '',
    },
  });

  const onSubmit = async (data: PropertyFormValues) => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // First, get the user profile ID
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !userProfile) {
        throw new Error('Could not find user profile');
      }

      // Create the property
      const { error: propertyError } = await supabase
        .from('properties')
        .insert({
          name: data.name,
          address: data.address,
          city: data.city,
          state: data.state,
          zip: data.zip,
          total_units: data.totalUnits,
          occupied_units: 0,
          wallet_balance: 0,
          property_manager_id: userProfile.id,
        });

      if (propertyError) {
        throw new Error(propertyError.message);
      }

      // Redirect to the properties list
      router.push('/dashboard/properties');
      router.refresh();
    } catch (err) {
      console.error('Error creating property:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Add New Property</CardTitle>
        <CardDescription>
          Enter the details of the property you want to manage
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Property Name</Label>
            <Input
              id="name"
              placeholder="Skyline Residences"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              placeholder="123 Main Street"
              {...register('address')}
            />
            {errors.address && (
              <p className="text-sm text-red-500">{errors.address.message}</p>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="New York"
                {...register('city')}
              />
              {errors.city && (
                <p className="text-sm text-red-500">{errors.city.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                placeholder="NY"
                {...register('state')}
              />
              {errors.state && (
                <p className="text-sm text-red-500">{errors.state.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                placeholder="10001"
                {...register('zip')}
              />
              {errors.zip && (
                <p className="text-sm text-red-500">{errors.zip.message}</p>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="totalUnits">Total Units</Label>
            <Input
              id="totalUnits"
              type="number"
              min="1"
              placeholder="48"
              {...register('totalUnits')}
            />
            {errors.totalUnits && (
              <p className="text-sm text-red-500">{errors.totalUnits.message}</p>
            )}
          </div>
          
          {error && (
            <div className="p-3 rounded-md bg-red-50 text-red-500 text-sm">
              {error}
            </div>
          )}
          
          <div className="pt-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating Property...' : 'Create Property'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
