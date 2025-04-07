'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';

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

export function PropertyEditForm() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
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

  useEffect(() => {
    const fetchProperty = async () => {
      if (!user || !id) return;
      
      setInitialLoading(true);
      
      try {
        // Get user profile ID
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
          
        if (profileError || !userProfile) {
          throw new Error('Could not find user profile');
        }
        
        // Get property details
        const { data: property, error: propertyError } = await supabase
          .from('properties')
          .select('*')
          .eq('id', id)
          .eq('property_manager_id', userProfile.id)
          .single();
          
        if (propertyError) {
          throw new Error(propertyError.message);
        }
        
        if (!property) {
          throw new Error('Property not found');
        }
        
        // Set form values
        reset({
          name: property.name,
          address: property.address,
          city: property.city,
          state: property.state,
          zip: property.zip,
          totalUnits: property.total_units.toString(),
        });
      } catch (err) {
        console.error('Error fetching property:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setInitialLoading(false);
      }
    };
    
    fetchProperty();
  }, [user, id, reset]);

  const onSubmit = async (data: PropertyFormValues) => {
    if (!user || !id) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Update the property
      const { error: propertyError } = await supabase
        .from('properties')
        .update({
          name: data.name,
          address: data.address,
          city: data.city,
          state: data.state,
          zip: data.zip,
          total_units: data.totalUnits,
        })
        .eq('id', id);

      if (propertyError) {
        throw new Error(propertyError.message);
      }

      // Redirect to the property details
      router.push(`/dashboard/properties/${id}`);
      router.refresh();
    } catch (err) {
      console.error('Error updating property:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (initialLoading) {
    return <div className="flex justify-center p-8">Loading property details...</div>;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Edit Property</CardTitle>
        <CardDescription>
          Update the details of your property
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
          
          <div className="pt-4 flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push(`/dashboard/properties/${id}`)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving Changes...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
