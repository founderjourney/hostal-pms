import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, CreditCard, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import backend from '~backend/client';

export function CheckOutPage() {
  const [currentStep, setCurrentStep] = useState<'search' | 'review' | 'payment'>('search');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<any>(null);
  const [folio, setFolio] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search for reservation
  const { data: reservation, isLoading: searchLoading, error: searchError } = useQuery({
    queryKey: ['reservation', confirmationCode],
    queryFn: () => backend.reservations.findByConfirmation({ confirmationCode }),
    enabled: !!confirmationCode && confirmationCode.length >= 3,
    retry: false,
  });

  // Check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: (reservationId: string) => 
      backend.reservations.checkOut({ reservationId }),
    onSuccess: () => {
      toast({
        title: "Check-out successful!",
        description: "Guest has been checked out successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      setCurrentStep('search');
      setConfirmationCode('');
      setSelectedReservation(null);
      setFolio(null);
    },
    onError: (error: any) => {
      console.error('Check-out error:', error);
      toast({
        variant: "destructive",
        title: "Check-out failed",
        description: error.message || "An error occurred during check-out.",
      });
    },
  });

  const handleSearch = () => {
    if (confirmationCode.trim()) {
      // The query will automatically trigger due to the enabled condition
    }
  };

  const handleProceedToReview = async () => {
    if (reservation) {
      // In a complete implementation, fetch the folio here
      setSelectedReservation(reservation);
      setCurrentStep('review');
    }
  };

  const handleCompleteCheckOut = () => {
    if (selectedReservation) {
      checkOutMutation.mutate(selectedReservation.id);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Check Out</h1>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${currentStep === 'search' ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`w-3 h-3 rounded-full ${currentStep === 'review' ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`w-3 h-3 rounded-full ${currentStep === 'payment' ? 'bg-primary' : 'bg-muted'}`} />
        </div>
      </div>

      {currentStep === 'search' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="mr-2 h-5 w-5" />
              Find Guest to Check Out
            </CardTitle>
            <CardDescription>
              Enter confirmation code to check out guest
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
                  Check-out Date: {new Date(reservation.checkOutDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Status: <span className="capitalize">{reservation.status}</span>
                </p>
                <Button 
                  className="mt-3"
                  onClick={handleProceedToReview}
                  disabled={reservation.status !== 'checked_in'}
                >
                  Proceed to Review
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
      )}

      {currentStep === 'review' && selectedReservation && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Review Folio
              </CardTitle>
              <CardDescription>Review charges and payments before check-out</CardDescription>
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
                  <h3 className="font-semibold mb-2">Stay Information</h3>
                  <p className="text-sm text-muted-foreground">
                    Room: {selectedReservation.room.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Check-in: {new Date(selectedReservation.checkInDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Check-out: {new Date(selectedReservation.checkOutDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Folio Items */}
              <div>
                <h3 className="font-semibold mb-2">Charges & Payments</h3>
                <div className="border rounded-lg">
                  <div className="p-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Room Charge</span>
                      <span>${selectedReservation.totalAmount}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>Total Balance</span>
                      <span>${selectedReservation.totalAmount}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <Button 
                  onClick={handleCompleteCheckOut}
                  disabled={checkOutMutation.isPending}
                >
                  {checkOutMutation.isPending ? "Processing..." : "Complete Check-out"}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setCurrentStep('search')}
                >
                  Back to Search
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
