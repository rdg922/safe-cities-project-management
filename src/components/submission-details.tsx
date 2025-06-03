import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"

interface SubmissionDetailsProps {
    submission: {
        id: number
        createdAt: Date
        user?: { name: string | null; email: string | null } | null
        submitterName: string | null
        submitterEmail: string | null
        responses: Array<{
            field: {
                id: number
                label: string
                type: string
            }
            value: any
        }>
    }
}

export function SubmissionDetails({ submission }: SubmissionDetailsProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Submission Details</CardTitle>
                    <Badge variant="outline">
                        {new Date(submission.createdAt).toLocaleString()}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Submitter Info */}
                    <div className="rounded-lg border p-4">
                        <h3 className="font-medium mb-2">Submitter Information</h3>
                        <div className="text-sm text-muted-foreground">
                            <p>Name: {submission.submitterName || 'Anonymous'}</p>
                            <p>Email: {submission.submitterEmail || 'Not provided'}</p>
                        </div>
                    </div>

                    {/* Responses */}
                    <div className="rounded-lg border p-4">
                        <h3 className="font-medium mb-2">Responses</h3>
                        <div className="max-h-[300px] overflow-y-auto">
                            <div className="space-y-4">
                                {submission.responses.map((response) => (
                                    <div key={response.field.id} className="space-y-1">
                                        <p className="font-medium">{response.field.label}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {Array.isArray(response.value)
                                                ? response.value.join(', ')
                                                : String(response.value)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
} 