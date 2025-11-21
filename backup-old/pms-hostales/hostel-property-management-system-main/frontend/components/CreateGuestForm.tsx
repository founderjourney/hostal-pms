import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import backend from '~backend/client';

interface CreateGuestFormProps {
  onSuccess?: (guest: any) => void;
}

export function CreateGuestForm({ onSuccess }: CreateGuestFormProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    nationality: '',
    passportNumber: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    dietaryRestrictions: '',
    notes: '',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createGuestMutation = useMutation({
    mutationFn: (data: any) => backend.guests.create(data),
    onSuccess: (guest) => {
      toast({
        title: "Guest created successfully",
        description: `${guest.firstName} ${guest.lastName} has been added to the system.`,
      });
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      onSuccess?.(guest);
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        nationality: '',
        passportNumber: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        dietaryRestrictions: '',
        notes: '',
      });
    },
    onError: (error: any) => {
      console.error('Create guest error:', error);
      toast({
        variant: "destructive",
        title: "Failed to create guest",
        description: error.message || "An error occurred while creating the guest.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert empty strings to undefined for optional fields
    const data = Object.fromEntries(
      Object.entries(formData).map(([key, value]) => [
        key,
        key === 'dateOfBirth' && value ? new Date(value) : value || undefined
      ])
    );

    createGuestMutation.mutate(data);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => handleChange('lastName', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Input
            id="dateOfBirth"
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => handleChange('dateOfBirth', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="nationality">Nationality</Label>
          <Input
            id="nationality"
            value={formData.nationality}
            onChange={(e) => handleChange('nationality', e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="passportNumber">Passport Number</Label>
        <Input
          id="passportNumber"
          value={formData.passportNumber}
          onChange={(e) => handleChange('passportNumber', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
          <Input
            id="emergencyContactName"
            value={formData.emergencyContactName}
            onChange={(e) => handleChange('emergencyContactName', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
          <Input
            id="emergencyContactPhone"
            value={formData.emergencyContactPhone}
            onChange={(e) => handleChange('emergencyContactPhone', e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="dietaryRestrictions">Dietary Restrictions</Label>
        <Textarea
          id="dietaryRestrictions"
          value={formData.dietaryRestrictions}
          onChange={(e) => handleChange('dietaryRestrictions', e.target.value)}
          rows={2}
        />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={3}
        />
      </div>

      <Button
        type="submit"
        disabled={createGuestMutation.isPending}
        className="w-full"
      >
        {createGuestMutation.isPending ? "Creating..." : "Create Guest"}
      </Button>
    </form>
  );
}
