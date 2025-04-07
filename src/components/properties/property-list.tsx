'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import Link from 'next/link';
import { Building, Users, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

type Property = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  total_units: number;
  occupied_units: number;
};

export function PropertyList() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProperties = async () => {
      if (!user) return;
      
      setLoading(true);
      
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
        
        // Get properties
        const { data, error: propertiesError } = await supabase
          .from('properties')
          .select('*')
          .eq('property_manager_id', userProfile.id)
          .order('name');
          
        if (propertiesError) {
          throw new Error(propertiesError.message);
        }
        
        setProperties(data || []);
      } catch (err) {
        console.error('Error fetching properties:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProperties();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);
        
      if (error) {
        throw new Error(error.message);
      }
      
      // Remove from local state
      setProperties(properties.filter(p => p.id !== id));
      
      // Refresh the page
      router.refresh();
    } catch (err) {
      console.error('Error deleting property:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading properties...</div>;
  }

  if (error) {
    return (
      <div className="p-4 rounded-md bg-red-50 text-red-500">
        Error loading properties: {error}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium mb-4">No properties found</h3>
        <p className="text-muted-foreground mb-6">You haven't added any properties yet.</p>
        <Link href="/dashboard/properties/new">
          <Button>
            <Building className="mr-2 h-4 w-4" /> Add Your First Property
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Your Properties</h2>
        <Link href="/dashboard/properties/new">
          <Button>
            <Building className="mr-2 h-4 w-4" /> Add Property
          </Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {properties.map((property) => (
          <Card key={property.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{property.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-4">
                <p>{property.address}</p>
                <p>{property.city}, {property.state} {property.zip}</p>
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1 text-muted-foreground" />
                  <span className="text-sm">
                    {property.occupied_units} / {property.total_units} units
                  </span>
                </div>
                <Badge variant={property.occupied_units === property.total_units ? "success" : "warning"}>
                  {Math.round((property.occupied_units / property.total_units) * 100)}% occupied
                </Badge>
              </div>
              
              <div className="flex space-x-2">
                <Link href={`/dashboard/properties/${property.id}`} className="flex-1">
                  <Button variant="outline" className="w-full">View Details</Button>
                </Link>
                <Link href={`/dashboard/properties/${property.id}/edit`}>
                  <Button variant="outline" size="icon">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => handleDelete(property.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
