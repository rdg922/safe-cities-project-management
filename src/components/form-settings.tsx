'use client'

import { useState } from 'react'
import { toast } from '~/hooks/use-toast'
import { api } from '~/trpc/react'
import { Button } from '~/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Switch } from '~/components/ui/switch'
import { Separator } from '~/components/ui/separator'
import { Badge } from '~/components/ui/badge'
import {
    Settings,
    Globe,
    Lock,
    Download,
    RefreshCw,
    Archive,
    Trash2,
    ExternalLink,
    Copy,
    Eye,
    EyeOff,
} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '~/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '~/components/ui/alert-dialog'

interface FormSettingsProps {
    form: {
        id: number
        title: string
        description: string | null
        isPublished: boolean
        acceptingResponses: boolean
        showProgressBar: boolean
        allowAnonymous: boolean
        requireLogin: boolean
        oneResponsePerUser: boolean
        fields: Array<any>
        file: {
            id: number
            name: string
        }
    }
    onUpdate: () => void
}

export function FormSettings({ form, onUpdate }: FormSettingsProps) {
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [formSettings, setFormSettings] = useState({
        title: form.title,
        description: form.description || '',
        isPublished: form.isPublished,
        acceptingResponses: form.acceptingResponses,
        showProgressBar: form.showProgressBar,
        allowAnonymous: form.allowAnonymous,
        requireLogin: form.requireLogin,
        oneResponsePerUser: form.oneResponsePerUser,
    })

    const updateSettingsMutation = api.forms.updateSettings.useMutation({
        onSuccess: () => {
            toast({ title: 'Form settings updated successfully' })
            onUpdate()
        },
        onError: (error) => {
            toast({
                title: 'Error updating settings',
                description: error.message,
                variant: 'destructive',
            })
        },
    })

    const exportMutation = api.forms.exportToSheet.useMutation({
        onSuccess: (data) => {
            toast({
                title: 'Form exported successfully!',
                description: `Data exported to ${data.sheetFile.name}. ${data.totalSubmissions} submissions included.`,
            })
            setIsExportDialogOpen(false)
        },
        onError: (error) => {
            toast({
                title: 'Export failed',
                description: error.message,
                variant: 'destructive',
            })
        },
    })

    const handleUpdateSettings = () => {
        updateSettingsMutation.mutate({
            formId: form.id,
            ...formSettings,
        })
    }

    const handleExport = () => {
        exportMutation.mutate({
            formId: form.id,
            sheetName: `${form.title} - Submissions`,
            parentId: form.file.parentId || undefined,
        })
    }

    const getFormUrl = () => {
        return `${window.location.origin}/forms/${form.id}/submit`
    }

    const copyFormUrl = async () => {
        try {
            await navigator.clipboard.writeText(getFormUrl())
            toast({ title: 'Form URL copied to clipboard!' })
        } catch (error) {
            toast({
                title: 'Failed to copy URL',
                variant: 'destructive',
            })
        }
    }

    const openFormInNewTab = () => {
        window.open(getFormUrl(), '_blank')
    }

    return (
        <div className="space-y-6">
            {/* Basic Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Basic Settings
                    </CardTitle>
                    <CardDescription>
                        Configure the basic properties of your form
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="form-title">Form Title</Label>
                        <Input
                            id="form-title"
                            value={formSettings.title}
                            onChange={(e) =>
                                setFormSettings((prev) => ({
                                    ...prev,
                                    title: e.target.value,
                                }))
                            }
                            placeholder="Enter form title"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="form-description">Description</Label>
                        <Textarea
                            id="form-description"
                            value={formSettings.description}
                            onChange={(e) =>
                                setFormSettings((prev) => ({
                                    ...prev,
                                    description: e.target.value,
                                }))
                            }
                            placeholder="Optional description for your form"
                            rows={3}
                        />
                    </div>

                    <Button
                        onClick={handleUpdateSettings}
                        disabled={updateSettingsMutation.isPending}
                    >
                        {updateSettingsMutation.isPending ? (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            'Update Settings'
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Visibility & Access */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Visibility & Access
                    </CardTitle>
                    <CardDescription>
                        Control who can access and submit your form
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label htmlFor="is-published">Published</Label>
                            <p className="text-sm text-muted-foreground">
                                Make the form available to users
                            </p>
                        </div>
                        <Switch
                            id="is-published"
                            checked={formSettings.isPublished}
                            onCheckedChange={(checked: boolean) =>
                                setFormSettings((prev) => ({
                                    ...prev,
                                    isPublished: checked,
                                }))
                            }
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label htmlFor="accepting-responses">
                                Accepting Responses
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Allow new form submissions
                            </p>
                        </div>
                        <Switch
                            id="accepting-responses"
                            checked={formSettings.acceptingResponses}
                            onCheckedChange={(checked: boolean) =>
                                setFormSettings((prev) => ({
                                    ...prev,
                                    acceptingResponses: checked,
                                }))
                            }
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label htmlFor="allow-anonymous">
                                Allow Anonymous Submissions
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Users can submit without logging in
                            </p>
                        </div>
                        <Switch
                            id="allow-anonymous"
                            checked={formSettings.allowAnonymous}
                            onCheckedChange={(checked: boolean) =>
                                setFormSettings((prev) => ({
                                    ...prev,
                                    allowAnonymous: checked,
                                }))
                            }
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label htmlFor="one-response">
                                One Response Per User
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Limit users to one submission each
                            </p>
                        </div>
                        <Switch
                            id="one-response"
                            checked={formSettings.oneResponsePerUser}
                            onCheckedChange={(checked: boolean) =>
                                setFormSettings((prev) => ({
                                    ...prev,
                                    oneResponsePerUser: checked,
                                }))
                            }
                        />
                    </div>

                    <Button
                        onClick={handleUpdateSettings}
                        disabled={updateSettingsMutation.isPending}
                    >
                        {updateSettingsMutation.isPending ? (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            'Update Settings'
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Display Options */}
            <Card>
                <CardHeader>
                    <CardTitle>Display Options</CardTitle>
                    <CardDescription>
                        Customize how your form appears to users
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label htmlFor="show-progress">
                                Show Progress Bar
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Display completion progress to users
                            </p>
                        </div>
                        <Switch
                            id="show-progress"
                            checked={formSettings.showProgressBar}
                            onCheckedChange={(checked: boolean) =>
                                setFormSettings((prev) => ({
                                    ...prev,
                                    showProgressBar: checked,
                                }))
                            }
                        />
                    </div>

                    <Button
                        onClick={handleUpdateSettings}
                        disabled={updateSettingsMutation.isPending}
                    >
                        {updateSettingsMutation.isPending ? (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            'Update Settings'
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Share & Access */}
            <Card>
                <CardHeader>
                    <CardTitle>Share Form</CardTitle>
                    <CardDescription>
                        Share your form with others using the public URL
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Form URL</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                value={getFormUrl()}
                                readOnly
                                className="font-mono text-sm"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={copyFormUrl}
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={openFormInNewTab}
                            >
                                <ExternalLink className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge
                            variant={
                                formSettings.isPublished
                                    ? 'default'
                                    : 'secondary'
                            }
                        >
                            {formSettings.isPublished ? (
                                <>
                                    <Eye className="mr-1 h-3 w-3" />
                                    Published
                                </>
                            ) : (
                                <>
                                    <EyeOff className="mr-1 h-3 w-3" />
                                    Draft
                                </>
                            )}
                        </Badge>
                        <Badge
                            variant={
                                formSettings.acceptingResponses
                                    ? 'default'
                                    : 'destructive'
                            }
                        >
                            {formSettings.acceptingResponses
                                ? 'Accepting Responses'
                                : 'Closed'}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Data Export */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Download className="h-5 w-5" />
                        Export Data
                    </CardTitle>
                    <CardDescription>
                        Export form responses to external formats
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Dialog
                        open={isExportDialogOpen}
                        onOpenChange={setIsExportDialogOpen}
                    >
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Download className="mr-2 h-4 w-4" />
                                Export to Sheet
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Export Form Data</DialogTitle>
                                <DialogDescription>
                                    This will export all form responses to a
                                    spreadsheet format. The export will include
                                    all submitted data and timestamps.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="rounded-lg border p-4">
                                    <h4 className="font-medium mb-2">
                                        Export will include:
                                    </h4>
                                    <ul className="text-sm text-muted-foreground space-y-1">
                                        <li>• All form responses</li>
                                        <li>• Submission timestamps</li>
                                        <li>
                                            • Submitter information (if
                                            provided)
                                        </li>
                                        <li>• Field labels and values</li>
                                    </ul>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsExportDialogOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleExport}
                                    disabled={exportMutation.isPending}
                                >
                                    {exportMutation.isPending ? (
                                        <>
                                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                            Exporting...
                                        </>
                                    ) : (
                                        'Export Data'
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <Trash2 className="h-5 w-5" />
                        Danger Zone
                    </CardTitle>
                    <CardDescription>
                        Irreversible actions that will permanently affect your
                        form
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AlertDialog
                        open={isDeleteDialogOpen}
                        onOpenChange={setIsDeleteDialogOpen}
                    >
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Form
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    Are you absolutely sure?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will
                                    permanently delete the form "{form.title}"
                                    and all associated responses.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => {
                                        toast({
                                            title: 'Form deletion',
                                            description:
                                                'Form deletion will be implemented in a future update',
                                        })
                                        setIsDeleteDialogOpen(false)
                                    }}
                                >
                                    Delete Form
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
        </div>
    )
}
