import { Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { useUserProfile } from '../hooks/useUserProfile';
import { auth } from '../lib/firebase';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { 
  ArrowRightOnRectangleIcon,
  HeartIcon,
  ChartBarIcon,
  UserGroupIcon,
  ClockIcon,
  StarIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

export default function LandingPage() {
  const { isAuthenticated, profile } = useUserProfile();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const features = [
    {
      icon: HeartIcon,
      title: 'Wellness Tracking',
      description: 'Monitor your health metrics, goals, and progress with comprehensive tracking tools.'
    },
    {
      icon: ChartBarIcon,
      title: 'Progress Analytics',
      description: 'Visualize your wellness journey with detailed charts and insights.'
    },
    {
      icon: UserGroupIcon,
      title: 'Expert Support',
      description: 'Connect with certified wellness practitioners and get personalized guidance.'
    },
    {
      icon: ClockIcon,
      title: 'Flexible Scheduling',
      description: 'Book appointments and sessions that fit your busy lifestyle.'
    }
  ];

  const benefits = [
    'Track health metrics and wellness goals',
    'Schedule appointments with practitioners',
    'Access personalized wellness programs',
    'Monitor progress with detailed analytics',
    'Secure data management and privacy',
    '24/7 platform availability'
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-soft border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">LA</span>
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900">Life Arrow</span>
                <p className="text-xs text-gray-500 hidden sm:block">Wellness Management Platform</p>
              </div>
            </div>
            <nav className="flex items-center space-x-4">
              {isAuthenticated && profile ? (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-xs">
                        {profile?.firstName?.[0]}{profile?.lastName?.[0]}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {profile?.firstName} {profile?.lastName}
                    </span>
                  </div>
                  <Link to={profile.role === 'client' ? '/client/dashboard' : '/admin/dashboard'}>
                    <Button variant="outline" size="sm">Dashboard</Button>
                  </Link>
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <ArrowRightOnRectangleIcon className="h-4 w-4" />
                    <span>Logout</span>
                  </Button>
                </div>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost">Sign In</Button>
                  </Link>
                  <Link to="/signup">
                    <Button className="bg-primary-500 hover:bg-primary-600">Get Started</Button>
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative">
        {/* Hero Background */}
        <div className="relative bg-gradient-to-br from-primary-50 via-white to-primary-50 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-transparent"></div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div className="space-y-4">
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                    Your Wellness Journey
                    <span className="text-primary-500 block">Starts Here</span>
                  </h1>
                  <p className="text-xl text-gray-600 leading-relaxed max-w-2xl">
                    Connect with wellness practitioners, track your progress, and achieve your health goals with our comprehensive platform designed for your success.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  {!isAuthenticated ? (
                    <>
                      <Link to="/register">
                        <Button size="lg" className="w-full sm:w-auto bg-primary-500 hover:bg-primary-600 text-lg px-8 py-4">
                          Register as Client
                        </Button>
                      </Link>
                      <Link to="/login">
                        <Button variant="outline" size="lg" className="w-full sm:w-auto text-lg px-8 py-4">
                          Sign In
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <Link to={profile?.role === 'client' ? '/client/dashboard' : '/admin/dashboard'}>
                      <Button size="lg" className="w-full sm:w-auto bg-primary-500 hover:bg-primary-600 text-lg px-8 py-4">
                        Go to Dashboard
                      </Button>
                    </Link>
                  )}
                </div>

                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <CheckIcon className="h-5 w-5 text-green-500" />
                    <span>Free to get started</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckIcon className="h-5 w-5 text-green-500" />
                    <span>Secure & private</span>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="relative z-10 bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
                  <div className="space-y-6">
                    <div className="flex items-center space-x-3">
                      <div className="h-12 w-12 bg-primary-500 rounded-lg flex items-center justify-center">
                        <HeartIcon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Wellness Dashboard</h3>
                        <p className="text-sm text-gray-500">Track your health metrics</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">85%</div>
                        <div className="text-xs text-green-700">Health Score</div>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">7/10</div>
                        <div className="text-xs text-blue-700">Goals Met</div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Next Appointment</span>
                        <span className="font-medium text-gray-900">Tomorrow 2:00 PM</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Active Programs</span>
                        <span className="font-medium text-gray-900">2 Programs</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Floating elements */}
                <div className="absolute -top-4 -right-4 h-16 w-16 bg-orange-100 rounded-full flex items-center justify-center">
                  <StarIcon className="h-8 w-8 text-orange-500" />
                </div>
                <div className="absolute -bottom-4 -left-4 h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <ChartBarIcon className="h-6 w-6 text-purple-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Everything you need for wellness success
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Our platform provides comprehensive tools for both clients and practitioners to manage and track wellness journeys effectively.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="text-center group">
                    <div className="h-16 w-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary-500 transition-colors duration-300">
                      <Icon className="h-8 w-8 text-primary-600 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                    Built for your wellness success
                  </h2>
                  <p className="text-xl text-gray-600 mb-8">
                    Whether you're a client starting your wellness journey or a practitioner managing multiple clients, our platform adapts to your needs.
                  </p>
                </div>

                <div className="grid gap-4">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="h-6 w-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckIcon className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="text-gray-700">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <Card className="card-hover">
                  <CardHeader>
                    <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                      <UserGroupIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-lg">For Clients</CardTitle>
                    <CardDescription>
                      Track your wellness journey and connect with practitioners
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• Personal dashboard</li>
                      <li>• Goal tracking</li>
                      <li>• Appointment booking</li>
                      <li>• Progress analytics</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="card-hover mt-8">
                  <CardHeader>
                    <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                      <ChartBarIcon className="h-6 w-6 text-purple-600" />
                    </div>
                    <CardTitle className="text-lg">For Practitioners</CardTitle>
                    <CardDescription>
                      Manage clients and track their progress effectively
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• Client management</li>
                      <li>• Admin dashboard</li>
                      <li>• Progress monitoring</li>
                      <li>• User role management</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        {!isAuthenticated && (
          <section className="py-20 bg-gradient-to-r from-primary-500 to-primary-600">
            <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
                Ready to start your wellness journey?
              </h2>
              <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
                Join thousands of users who are already achieving their wellness goals with Life Arrow.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/signup">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto text-lg px-8 py-4 bg-white text-primary-600 hover:bg-gray-50">
                    Get Started Free
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-4 border-white text-white hover:bg-primary-400">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-sidebar-800 text-sidebar-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-primary-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">LA</span>
                </div>
                <span className="text-lg font-bold text-white">Life Arrow</span>
              </div>
              <p className="text-sm">
                Your comprehensive wellness management platform for clients and practitioners.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookies</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-sidebar-700 text-center text-sm">
            <p>&copy; 2024 Life Arrow. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 