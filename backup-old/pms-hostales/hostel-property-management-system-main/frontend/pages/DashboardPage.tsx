import { useQuery } from '@tanstack/react-query';
import { Bed, Users, Clock, AlertTriangle, DollarSign, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import backend from '~backend/client';

export function DashboardPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => backend.dashboard.overview(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stats = [
    {
      name: 'Occupied Beds',
      value: overview?.occupiedBeds || 0,
      icon: Bed,
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-950',
    },
    {
      name: 'Available Beds',
      value: overview?.availableBeds || 0,
      icon: Bed,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950',
    },
    {
      name: 'Total Guests',
      value: overview?.totalGuests || 0,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      name: 'Today Check-ins',
      value: overview?.todayCheckIns || 0,
      icon: Clock,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
    },
    {
      name: 'Pending Payments',
      value: overview?.pendingPayments || 0,
      icon: DollarSign,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950',
    },
    {
      name: 'Low Stock Items',
      value: overview?.lowStockProducts || 0,
      icon: Package,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
    },
  ];

  const quickActions = [
    { name: 'Check In Guest', href: '/check-in', color: 'bg-green-600 hover:bg-green-700' },
    { name: 'Check Out Guest', href: '/check-out', color: 'bg-blue-600 hover:bg-blue-700' },
    { name: 'View Rooms', href: '/rooms', color: 'bg-purple-600 hover:bg-purple-700' },
    { name: 'POS System', href: '/pos', color: 'bg-orange-600 hover:bg-orange-700' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <div className="text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="flex items-center p-6">
              <div className={`p-3 rounded-full ${stat.bgColor} mr-4`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.name}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Button key={action.name} asChild className={action.color}>
                <Link to={action.href}>
                  {action.name}
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {((overview?.dirtyBeds || 0) > 0 || (overview?.lowStockProducts || 0) > 0) && (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-600">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(overview?.dirtyBeds || 0) > 0 && (
              <p className="text-sm text-muted-foreground">
                {overview?.dirtyBeds || 0} beds need cleaning
              </p>
            )}
            {(overview?.lowStockProducts || 0) > 0 && (
              <p className="text-sm text-muted-foreground">
                {overview?.lowStockProducts || 0} products are low in stock
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
