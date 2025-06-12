'use client'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Separator } from '~/components/ui/separator'
import {
    CheckCircle,
    Clock,
    Mail,
    Shield,
    Building2,
    Users,
} from 'lucide-react'
import { api } from '~/trpc/react'
import { useUser, SignOutButton } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function OnboardingPage() {
    const { user } = useUser()
    const router = useRouter()
    const updateUserRole = api.user.updateUserRole.useMutation({
        onSuccess: () => {
            console.log('Role updated successfully!')
            // Refresh the page to update the user's session
            router.push('/dashboard')
        },
        onError: (error) => {
            console.error('Failed to update role:', error)
        },
    })
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
            <div className="w-full max-w-full sm:max-w-xl space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                            <Building2 className="w-6 h-6 text-primary" />
                        </div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Safe Cities
                        </h1>
                    </div>
                    <p className="text-muted-foreground">
                        Project Management Platform
                    </p>
                </div>

                {/* Main Content */}
                <div className="space-y-4">
                    {/* Status Card */}
                    <Card className="relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                        <CardHeader className="relative">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-warning/10">
                                    <Clock className="w-5 h-5 text-warning" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl">
                                        Account Under Review
                                    </CardTitle>
                                    <CardDescription>
                                        Your account is being verified by our
                                        team
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="relative space-y-6">
                            <div className="space-y-4">
                                <Badge variant="secondary" className="gap-2">
                                    <Shield className="w-3 h-3" />
                                    Security verification in progress
                                </Badge>

                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    To ensure platform security and integrity,
                                    all new accounts require manual verification
                                    by our administration team before gaining
                                    full access.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Process Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                Verification Process
                            </CardTitle>
                            <CardDescription>
                                What happens during account review
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 mt-0.5">
                                        <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-medium">
                                            Account Created
                                        </h4>
                                        <p className="text-xs text-muted-foreground">
                                            Your account has been successfully
                                            created and submitted for review
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 mt-0.5">
                                        <Clock className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-medium">
                                            Under Review
                                        </h4>
                                        <p className="text-xs text-muted-foreground">
                                            Our team is currently reviewing your
                                            account details and credentials
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 mt-0.5">
                                        <Mail className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-medium">
                                            Email Notification
                                        </h4>
                                        <p className="text-xs text-muted-foreground">
                                            You'll receive email confirmation
                                            once your account is approved
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <h4 className="text-sm font-medium">
                                    Need Help?
                                </h4>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    size="sm"
                                    onClick={() => window.open('mailto:safecitiessa@aol.com')}
                                >
                                    <Mail className="w-4 h-4 mr-2" />
                                    Contact Support
                                </Button>
                                <SignOutButton>
                                    <Button
                                        variant="destructive"
                                        className="w-full hover:bg-destructive/90"
                                        size="sm"  
                                    >
                                        <LogOut
                                            size={16}
                                            className="w-4 h-4 mr-2"
                                        />
                                        Sign Out
                                    </Button>
                                </SignOutButton>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
