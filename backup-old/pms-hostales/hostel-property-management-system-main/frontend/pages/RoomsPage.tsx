import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bed, Users, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import backend from '~backend/client';

const statusColors = {
  occupied: 'bg-red-500',
  clean: 'bg-green-500',
  dirty: 'bg-yellow-500',
  maintenance: 'bg-orange-500',
  out_of_order: 'bg-gray-500',
};

const statusLabels = {
  occupied: 'Occupied',
  clean: 'Clean',
  dirty: 'Dirty',
  maintenance: 'Maintenance',
  out_of_order: 'Out of Order',
};

export function RoomsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: roomsData, isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => backend.rooms.list(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const updateBedStatusMutation = useMutation({
    mutationFn: ({ bedId, status }: { bedId: string; status: keyof typeof statusLabels }) =>
      backend.rooms.updateBedStatus({ bedId, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      toast({
        title: "Status updated",
        description: "Bed status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Update bed status error:', error);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message || "Failed to update bed status.",
      });
    },
  });

  const handleStatusChange = (bedId: string, newStatus: string) => {
    updateBedStatusMutation.mutate({ bedId, status: newStatus as keyof typeof statusLabels });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const rooms = roomsData?.rooms || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Rooms & Beds</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Occupied</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>Needs Cleaning</span>
          </div>
        </div>
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {rooms.map((room) => (
          <Card key={room.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Room {room.number}
                </CardTitle>
                <Badge variant="outline" className="capitalize">
                  {room.roomType}
                </Badge>
              </div>
              <CardDescription className="flex items-center justify-between">
                <span>{room.name}</span>
                <span className="flex items-center">
                  <DollarSign className="w-4 h-4 mr-1" />
                  {room.basePrice}/night
                </span>
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Room Stats */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <Bed className="w-4 h-4 mr-1" />
                  {room.beds.length} beds
                </div>
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  {room.occupiedBeds}/{room.capacity} occupied
                </div>
              </div>

              {/* Bed Grid */}
              <div className="grid grid-cols-2 gap-2">
                {room.beds.map((bed) => (
                  <div
                    key={bed.id}
                    className="p-3 border rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Bed {bed.number}
                      </span>
                      <div className={`w-3 h-3 rounded-full ${statusColors[bed.status]}`} />
                    </div>
                    
                    <Select
                      value={bed.status}
                      onValueChange={(value) => handleStatusChange(bed.id, value)}
                      disabled={updateBedStatusMutation.isPending}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Room Amenities */}
              {room.amenities && room.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {room.amenities.slice(0, 3).map((amenity) => (
                    <Badge key={amenity} variant="secondary" className="text-xs">
                      {amenity}
                    </Badge>
                  ))}
                  {room.amenities.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{room.amenities.length - 3} more
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
