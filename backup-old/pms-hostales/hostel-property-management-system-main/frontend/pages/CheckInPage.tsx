import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, UserPlus, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { CreateGuestForm } from '../components/CreateGuestForm';
import backend from '~backend/client';

export function CheckInPage() {
  const [currentStep, setCurrentStep] = useState<'search' | 'guest-form' | 'confirm'>('search');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<any>(null);
  const [newGuest, setNewGuest] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search for reservation
  const { data: reservation, isLoading: searchLoading, error: searchError } = useQuery({
    queryKey: ['reservation', confirmationCode],
    queryFn: () => backend.reservations.findByConfirmation({ confirmationCode }),
    enabled: !!confirmationCode && confirmationCode.length >= 3,
    retry: false,
  });

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: (reservationId: string) => 
      backend.reservations.checkIn({ reservationId }),
    onSuccess: () => {
      toast({
        title: "Check-in successful!",
        description: "Guest has been checked in successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      setCurrentStep('search');
      setConfirmationCode('');
      setSelectedReservation(null);
    },
    onError: (error: any) => {
      console.error('Check-in error:', error);
      toast({
        variant: "destructive",
        title: "Check-in failed",
        description: error.message || "An error occurred during check-in.",
      });
    },
  });

  const handleSearch = () => {
    if (confirmationCode.trim()) {
      // The query will automatically trigger due to the enabled condition
    }
  };

  const handleConfirmCheckIn = () => {
    if (selectedReservation) {
      checkInMutation.mutate(selectedReservation.id);
    }
  };

  const handleWalkInGuest = () => {
    setCurrentStep('guest-form');
  };

  const handleGuestCreated = (guest: any) => {
    setNewGuest(guest);
    toast({
      title: "Guest created",
      description: "Now create a reservation for the walk-in guest.",
    });
    // In a complete implementation, you would proceed to room selection and reservation creation
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Check In</h1>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${currentStep === 'search' ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`w-3 h-3 rounded-full ${currentStep === 'guest-form' ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`w-3 h-3 rounded-full ${currentStep === 'confirm' ? 'bg-primary' : 'bg-muted'}`} />
        </div>
      </div>

      {currentStep === 'search' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Search existing reservation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="mr-2 h-5 w-5" />
                Find Existing Reservation
              </CardTitle>
              <CardDescription>
                Enter confirmation code to check in guest
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="confirmation">Confirmation Code</Label>
                <Input
                  id="confirmation"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value.toUpperCase())}
                  placeholder="RES12345678"
                  className="uppercase"
                />
              </div>
              <Button onClick={handleSearch} disabled={!confirmationCode.trim() || searchLoading}>
                {searchLoading ? "Searching..." : "Search Reservation"}
              </Button>

              {/* Search Results */}
              {reservation && (
                <div className="mt-4 p-4 bg-accent rounded-lg">
                  <h3 className="font-semibold text-foreground">
                    {reservation.guest.firstName} {reservation.guest.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Room: {reservation.room.name} ({reservation.room.number})
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Check-in: {new Date(reservation.checkInDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Status: <span className="capitalize">{reservation.status}</span>
                  </p>
                  <Button 
                    className="mt-3"
                    onClick={() => {
                      setSelectedReservation(reservation);
                      setCurrentStep('confirm');
                    }}
                    disabled={reservation.status !== 'confirmed'}
                  >
                    Proceed to Check-in
                  </Button>
                </div>
              )}

              {searchError && confirmationCode.length >= 3 && (
                <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg">
                  Reservation not found. Please check the confirmation code.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Walk-in guest */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserPlus className="mr-2 h-5 w-5" />
                Walk-in Guest
              </CardTitle>
              <CardDescription>
                Register a new guest without reservation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleWalkInGuest} variant="outline" className="w-full">
                Create New Guest
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {currentStep === 'guest-form' && (
        <Card>
          <CardHeader>
            <CardTitle>Create Guest Profile</CardTitle>
            <CardDescription>Enter guest information for walk-in</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateGuestForm onSuccess={handleGuestCreated} />
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setCurrentStep('search')}
            >
              Back to Search
            </Button>
          </CardContent>
        </Card>
      )}

      {currentStep === 'confirm' && selectedReservation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="mr-2 h-5 w-5" />
              Confirm Check-in
            </CardTitle>
            <CardDescription>Review details and complete check-in</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Guest Information</h3>
                <p className="text-sm text-muted-foreground">
                  Name: {selectedReservation.guest.firstName} {selectedReservation.guest.lastName}
                </p>
                <p className="text-sm text-muted-foreground">
                  Email: {selectedReservation.guest.email || 'Not provided'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Phone: {selectedReservation.guest.phone || 'Not provided'}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Reservation Details</h3>
                <p className="text-sm text-muted-foreground">
                  Room: {selectedReservation.room.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Check-in: {new Date(selectedReservation.checkInDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Check-out: {new Date(selectedReservation.checkOutDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total Amount: ${selectedReservation.totalAmount}
                </p>
              </div>
            </div>

            <div className="flex space-x-4">
              <Button 
                onClick={handleConfirmCheckIn}
                disabled={checkInMutation.isPending}
              >
                {checkInMutation.isPending ? "Processing..." : "Complete Check-in"}
              </Button>
              <Button 
                variant="outline"
                onClick={() => setCurrentStep('search')}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
