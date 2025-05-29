import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Button } from "~/components/ui/button"
import { CheckCircle, Clock, Mail, Shield } from "lucide-react"

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Main Card */}
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="mx-auto w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
              <Clock className="w-10 h-10 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">
              Account Under Review
            </CardTitle>
            <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
              Your Safe Cities account is currently being verified by our team
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-8">
            {/* Status Message */}
            <div className="text-center space-y-4">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Thank you for signing up with Safe Cities! To ensure the security and integrity of our platform, 
                all new accounts must be manually verified by our administration team before gaining full access.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-full">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Security verification in progress
                </span>
              </div>
            </div>

            {/* Verification Steps */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white text-center">
                What happens next?
              </h3>
              
              <div className="grid gap-4">
                <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Account Created</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Your account has been successfully created and submitted for review.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Under Review</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Our team is currently reviewing your account details and credentials.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Email Notification</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      You'll receive an email confirmation once your account is approved.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Expected Timeline */}
            <div className="text-center space-y-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <h4 className="font-medium text-gray-900 dark:text-white">Expected Timeline</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Account verification typically takes <strong>1-3 business days</strong>. 
                We appreciate your patience during this process.
              </p>
            </div>

            {/* Contact Support */}
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Have questions about your account verification?
              </p>
              <Button variant="outline" className="w-full sm:w-auto">
                <Mail className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Safe Cities Project Management Platform</p>
          <p className="mt-1">Securing communities through verified partnerships</p>
        </div>
      </div>
    </div>
  )
}