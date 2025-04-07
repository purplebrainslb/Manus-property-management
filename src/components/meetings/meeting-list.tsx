'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import Link from 'next/link';
import { Calendar, Users, Check, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

type Meeting = {
  id: string;
  title: string;
  property: {
    name: string;
    id: string;
  };
  meeting_date: string;
  location: string;
  created_at: string;
};

export function MeetingList() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMeetings = async () => {
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
          setMeetings([]);
          return;
        }
        
        const propertyIds = properties.map(p => p.id);
        
        // Get meetings for these properties
        const { data, error: meetingsError } = await supabase
          .from('meetings')
          .select(`
            id,
            title,
            meeting_date,
            location,
            created_at,
            property:property_id(name, id)
          `)
          .in('property_id', propertyIds)
          .order('meeting_date', { ascending: false });
          
        if (meetingsError) {
          throw new Error(meetingsError.message);
        }
        
        setMeetings(data || []);
      } catch (err) {
        console.error('Error fetching meetings:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMeetings();
  }, [user]);

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const isMeetingUpcoming = (dateTimeString: string) => {
    const meetingDate = new Date(dateTimeString);
    const now = new Date();
    return meetingDate > now;
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading meetings...</div>;
  }

  if (error) {
    return (
      <div className="p-4 rounded-md bg-red-50 text-red-500">
        Error loading meetings: {error}
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium mb-4">No meetings found</h3>
        <p className="text-muted-foreground mb-6">You haven't scheduled any meetings yet.</p>
        <Link href="/dashboard/meetings/new">
          <Button>
            <Calendar className="mr-2 h-4 w-4" /> Schedule Your First Meeting
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Meetings</h2>
        <Link href="/dashboard/meetings/new">
          <Button>
            <Calendar className="mr-2 h-4 w-4" /> Schedule Meeting
          </Button>
        </Link>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>All Meetings</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meetings.map((meeting) => (
                <TableRow key={meeting.id}>
                  <TableCell className="font-medium">
                    {meeting.title}
                  </TableCell>
                  <TableCell>
                    <Link href={`/dashboard/properties/${meeting.property.id}`} className="hover:underline">
                      {meeting.property.name}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDateTime(meeting.meeting_date)}</TableCell>
                  <TableCell>{meeting.location}</TableCell>
                  <TableCell>
                    {isMeetingUpcoming(meeting.meeting_date) ? (
                      <Badge variant="outline" className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" /> Upcoming
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="flex items-center">
                        <Check className="h-3 w-3 mr-1" /> Past
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Link href={`/dashboard/meetings/${meeting.id}`}>
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
