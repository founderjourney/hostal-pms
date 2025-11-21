import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, UserPlus, Mail, Phone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CreateGuestForm } from '../components/CreateGuestForm';
import backend from '~backend/client';

export function GuestsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: guestsData, isLoading } = useQuery({
    queryKey: ['guests', searchQuery],
    queryFn: () => backend.guests.search({ query: searchQuery }),
    enabled: searchQuery.length >= 2,
  });

  const handleGuestCreated = () => {
    setShowCreateForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Guests</h1>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <UserPlus className="w-4 h-4 mr-2" />
          {showCreateForm ? 'Cancel' : 'Add Guest'}
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Guest</CardTitle>
            <CardDescription>Add a new guest to the system</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateGuestForm onSuccess={handleGuestCreated} />
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="w-5 h-5 mr-2" />
            Search Guests
          </CardTitle>
          <CardDescription>
            Search by name, email, or phone number
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Input
              placeholder="Enter guest name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchQuery.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (guestsData?.guests?.length || 0) > 0 ? (
              <div className="space-y-4">
                {guestsData?.guests?.map((guest) => (
                  <div
                    key={guest.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="space-y-1">
                      <h3 className="font-semibold">
                        {guest.firstName} {guest.lastName}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        {guest.email && (
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-1" />
                            {guest.email}
                          </div>
                        )}
                        {guest.phone && (
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-1" />
                            {guest.phone}
                          </div>
                        )}
                      </div>
                      {guest.nationality && (
                        <p className="text-sm text-muted-foreground">
                          Nationality: {guest.nationality}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Total stays: {guest.totalStays} | 
                        Member since: {new Date(guest.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                      <Button size="sm">
                        Create Reservation
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No guests found matching your search.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
