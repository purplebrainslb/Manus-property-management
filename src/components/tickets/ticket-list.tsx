'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import Link from 'next/link';
import { AlertCircle, CheckCircle, Clock, FileText, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Ticket = {
  id: string;
  title: string;
  description: string;
  property: {
    name: string;
    id: string;
  };
  category: string;
  priority: string;
  status: string;
  unit_number: string | null;
  created_at: string;
  updated_at: string;
};

export function TicketList() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  useEffect(() => {
    const fetchTickets = async () => {
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
          setTickets([]);
          return;
        }
        
        const propertyIds = properties.map(p => p.id);
        
        // Build query for tickets
        let query = supabase
          .from('tickets')
          .select(`
            id,
            title,
            description,
            category,
            priority,
            status,
            unit_number,
            created_at,
            updated_at,
            property:property_id(name, id)
          `)
          .in('property_id', propertyIds);
        
        // Apply filters
        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }
        
        if (categoryFilter !== 'all') {
          query = query.eq('category', categoryFilter);
        }
        
        if (priorityFilter !== 'all') {
          query = query.eq('priority', priorityFilter);
        }
        
        // Order by priority and creation date
        const { data, error: ticketsError } = await query
          .order('priority', { ascending: false })
          .order('created_at', { ascending: false });
          
        if (ticketsError) {
          throw new Error(ticketsError.message);
        }
        
        setTickets(data || []);
      } catch (err) {
        console.error('Error fetching tickets:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTickets();
  }, [user, statusFilter, categoryFilter, priorityFilter]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'high':
        return <Badge variant="destructive" className="bg-orange-500">High</Badge>;
      case 'medium':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline" className="flex items-center"><AlertCircle className="h-3 w-3 mr-1" /> Open</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="flex items-center"><Clock className="h-3 w-3 mr-1" /> In Progress</Badge>;
      case 'resolved':
        return <Badge variant="success" className="flex items-center"><CheckCircle className="h-3 w-3 mr-1" /> Resolved</Badge>;
      case 'closed':
        return <Badge className="flex items-center bg-gray-500"><CheckCircle className="h-3 w-3 mr-1" /> Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'maintenance':
        return 'Maintenance';
      case 'complaint':
        return 'Complaint';
      case 'request':
        return 'Request';
      case 'other':
        return 'Other';
      default:
        return category.charAt(0).toUpperCase() + category.slice(1);
    }
  };

  const truncateText = (text: string, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading tickets...</div>;
  }

  if (error) {
    return (
      <div className="p-4 rounded-md bg-red-50 text-red-500">
        Error loading tickets: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Tickets</h2>
        <Link href="/dashboard/tickets/new">
          <Button>
            <FileText className="mr-2 h-4 w-4" /> Create Ticket
          </Button>
        </Link>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>All Tickets</CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select 
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Select 
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="complaint">Complaint</SelectItem>
                    <SelectItem value="request">Request</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Select 
                  value={priorityFilter}
                  onValueChange={setPriorityFilter}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-center p-8">
              <h3 className="text-lg font-medium mb-4">No tickets found</h3>
              <p className="text-muted-foreground mb-6">
                {statusFilter !== 'all' || categoryFilter !== 'all' || priorityFilter !== 'all'
                  ? 'Try changing your filters to see more results.'
                  : 'There are no tickets in the system yet.'}
              </p>
              <Link href="/dashboard/tickets/new">
                <Button>
                  <FileText className="mr-2 h-4 w-4" /> Create Your First Ticket
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">
                      {ticket.title}
                      {ticket.unit_number && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Unit: {ticket.unit_number}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {truncateText(ticket.description)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/properties/${ticket.property.id}`} className="hover:underline">
                        {ticket.property.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {getCategoryLabel(ticket.category)}
                    </TableCell>
                    <TableCell>
                      {getPriorityBadge(ticket.priority)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(ticket.status)}
                    </TableCell>
                    <TableCell>
                      {formatDate(ticket.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Link href={`/dashboard/tickets/${ticket.id}`}>
                          <Button variant="outline" size="sm">View</Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
