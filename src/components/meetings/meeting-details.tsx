'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Calendar, Users, Check, Clock, Building, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type Meeting = {
  id: string;
  title: string;
  description: string;
  property: {
    name: string;
    id: string;
  };
  meeting_date: string;
  location: string;
  created_at: string;
};

type MeetingAttendee = {
  id: string;
  resident: {
    id: string;
    unit_number: string;
    user: {
      first_name: string;
      last_name: string;
      email: string;
    };
  };
};

type MeetingItem = {
  id: string;
  type: 'complaint' | 'decision' | 'note';
  content: string;
  created_at: string;
};

export function MeetingDetails() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [attendees, setAttendees] = useState<MeetingAttendee[]>([]);
  const [items, setItems] = useState<MeetingItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMeetingDetails = async () => {
      if (!user || !id) return;
      
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
          throw new Error('No properties found');
        }
        
        const propertyIds = properties.map(p => p.id);
        
        // Get meeting details
        const { data: meetingData, error: meetingError } = await supabase
          .from('meetings')
          .select(`
            id,
            title,
            description,
            meeting_date,
            location,
            created_at,
            property:property_id(name, id)
          `)
          .eq('id', id)
          .in('property_id', propertyIds)
          .single();
          
        if (meetingError) {
          throw new Error(meetingError.message);
        }
        
        if (!meetingData) {
          throw new Error('Meeting not found');
        }
        
        setMeeting(meetingData);
        
        // Get meeting attendees
        const { data: attendeesData, error: attendeesError } = await supabase
          .from('meeting_attendees')
          .select(`
            id,
            resident:resident_id(
              id,
              unit_number,
              user:user_id(
                first_name,
                last_name,
                email
              )
            )
          `)
          .eq('meeting_id', id);
          
        if (attendeesError) {
          throw new Error(attendeesError.message);
        }
        
        setAttendees(attendeesData || []);
        
        // Get meeting items
        const { data: itemsData, error: itemsError } = await supabase
          .from('meeting_items')
          .select(`
            id,
            type,
            content,
            created_at
          `)
          .eq('meeting_id', id)
          .order('created_at');
          
        if (itemsError) {
          throw new Error(itemsError.message);
        }
        
        setItems(itemsData || []);
      } catch (err) {
        console.error('Error fetching meeting details:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMeetingDetails();
  }, [user, id]);

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

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading meeting details...</div>;
  }

  if (error) {
    return (
      <div className="p-4 rounded-md bg-red-50 text-red-500">
        Error loading meeting details: {error}
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium mb-4">Meeting not found</h3>
        <p className="text-muted-foreground mb-6">The meeting you're looking for doesn't exist or you don't have access to it.</p>
        <Link href="/dashboard/meetings">
          <Button>
            <Calendar className="mr-2 h-4 w-4" /> Back to Meetings
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{meeting.title}</h2>
          <p className="text-muted-foreground">
            {formatDateTime(meeting.meeting_date)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/meetings/edit/${meeting.id}`}>
            <Button variant="outline">Edit Meeting</Button>
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Property</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Building className="h-4 w-4 mr-2 text-muted-foreground" />
              <Link href={`/dashboard/properties/${meeting.property.id}`} className="text-lg font-medium hover:underline">
                {meeting.property.name}
              </Link>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isMeetingUpcoming(meeting.meeting_date) ? (
              <Badge variant="outline" className="flex items-center">
                <Clock className="h-3 w-3 mr-1" /> Upcoming
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center">
                <Check className="h-3 w-3 mr-1" /> Past
              </Badge>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>{meeting.location}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {meeting.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{meeting.description}</p>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Attendees</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {attendees.length === 0 ? (
            <p className="text-muted-foreground">No attendees for this meeting.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {attendees.map((attendee) => (
                <div key={attendee.id} className="flex items-center space-x-2 border rounded-md p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {getInitials(attendee.resident.user.first_name, attendee.resident.user.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{attendee.resident.user.first_name} {attendee.resident.user.last_name}</p>
                    <p className="text-xs text-muted-foreground">Unit {attendee.resident.unit_number}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Meeting Items</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-muted-foreground">No items recorded for this meeting.</p>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="border-b pb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge variant={
                      item.type === 'complaint' ? 'destructive' : 
                      item.type === 'decision' ? 'default' : 
                      'outline'
                    }>
                      {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </Badge>
                  </div>
                  <p>{item.content}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
