'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import Link from 'next/link';
import { Users, Mail, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

type Resident = {
  id: string;
  user: {
    first_name: string;
    last_name: string;
    email: string;
    user_id: string | null;
  };
  property: {
    name: string;
    id: string;
  };
  unit_number: string;
  is_active: boolean;
  balance: number;
  created_at: string;
};

export function ResidentList() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResidents = async () => {
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
        
        // Get properties managed by this user
        const { data: properties, error: propertiesError } = await supabase
          .from('properties')
          .select('id')
          .eq('property_manager_id', userProfile.id);
          
        if (propertiesError) {
          throw new Error(propertiesError.message);
        }
        
        if (!properties || properties.length === 0) {
          setResidents([]);
          return;
        }
        
        const propertyIds = properties.map(p => p.id);
        
        // Get residents for these properties
        const { data, error: residentsError } = await supabase
          .from('residents')
          .select(`
            id,
            unit_number,
            is_active,
            balance,
            created_at,
            user:user_id(first_name, last_name, email, user_id),
            property:property_id(name, id)
          `)
          .in('property_id', propertyIds)
          .order('created_at', { ascending: false });
          
        if (residentsError) {
          throw new Error(residentsError.message);
        }
        
        setResidents(data || []);
      } catch (err) {
        console.error('Error fetching residents:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchResidents();
  }, [user]);

  const resendInvitation = async (email: string) => {
    // In a real implementation, this would send a new invitation email
    alert(`Invitation would be resent to ${email}`);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading residents...</div>;
  }

  if (error) {
    return (
      <div className="p-4 rounded-md bg-red-50 text-red-500">
        Error loading residents: {error}
      </div>
    );
  }

  if (residents.length === 0) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium mb-4">No residents found</h3>
        <p className="text-muted-foreground mb-6">You haven't added any residents yet.</p>
        <Link href="/dashboard/residents/invite">
          <Button>
            <Users className="mr-2 h-4 w-4" /> Invite Your First Resident
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Residents</h2>
        <Link href="/dashboard/residents/invite">
          <Button>
            <Users className="mr-2 h-4 w-4" /> Invite Resident
          </Button>
        </Link>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>All Residents</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {residents.map((resident) => (
                <TableRow key={resident.id}>
                  <TableCell>
                    {resident.user.first_name} {resident.user.last_name}
                  </TableCell>
                  <TableCell>{resident.user.email}</TableCell>
                  <TableCell>
                    <Link href={`/dashboard/properties/${resident.property.id}`} className="hover:underline">
                      {resident.property.name}
                    </Link>
                  </TableCell>
                  <TableCell>{resident.unit_number}</TableCell>
                  <TableCell>
                    {resident.user.user_id ? (
                      <Badge variant="success" className="flex items-center">
                        <Check className="h-3 w-3 mr-1" /> Active
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="flex items-center">
                        <Mail className="h-3 w-3 mr-1" /> Invited
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className={resident.balance > 0 ? "text-red-500" : "text-green-500"}>
                    ${resident.balance.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {!resident.user.user_id && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => resendInvitation(resident.user.email)}
                        >
                          Resend
                        </Button>
                      )}
                      <Link href={`/dashboard/residents/${resident.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
