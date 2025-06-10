'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '~/hooks/use-toast'
import { api } from '~/trpc/react'
import { navigateToFile } from '~/lib/navigation-utils'
import { FILE_TYPES } from '~/server/db/schema'
import { ultraFastInvalidateFileCaches } from '~/lib/streamlined-cache-invalidation'
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
    CheckCircle,
    AlertTriangle,
    Ban,
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
        oneResponsePerUser: boolean
        fields: Array<any>
        file: {
            id: number
            name: string
        }
    }
    onUpdate: () => void
    onSavingStatusChange?: (status: 'idle' | 'saving' | 'saved') => void
}

export function FormSettings({ form, onUpdate, onSavingStatusChange }: FormSettingsProps) {
    const router = useRouter()
    const utils = api.useUtils()
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [disableSyncDialogId, setDisableSyncDialogId] = useState<
        number | null
    >(null)
    const [formSettings, setFormSettings] = useState({
        title: form.title,
        description: form.description || '',
        isPublished: form.isPublished,
        acceptingResponses: form.acceptingResponses,
        showProgressBar: form.showProgressBar,
        oneResponsePerUser: form.oneResponsePerUser,
    })

    const updateSettingsMutation = api.forms.updateSettings.useMutation({
        onMutate: () => {
            onSavingStatusChange?.('saving')
        },
        onSuccess: () => {
            onSavingStatusChange?.('saved')
            setTimeout(() => onSavingStatusChange?.('idle'), 2000)
            onUpdate()
        },
        onError: (error) => {
            onSavingStatusChange?.('idle')
            toast({
                title: 'Error updating settings',
                description: error.message,
                variant: 'destructive',
            })
        },
    })

    const syncMutation = api.forms.syncToSheet.useMutation({
        onMutate: () => {
            onSavingStatusChange?.('saving')
        },
        onSuccess: (data) => {
            onSavingStatusChange?.('saved')
            setTimeout(() => onSavingStatusChange?.('idle'), 2000)
            toast({
                title: 'Form synced successfully!',
                description: `Live sync enabled to ${data.sheetFile.name}. ${data.totalSubmissions} submissions included.`,
            })
            setIsExportDialogOpen(false)
            // Refetch sync status
            syncStatus.refetch()
            // Invalidate file tree cache to update sidebar
            ultraFastInvalidateFileCaches(utils)
        },
        onError: (error) => {
            onSavingStatusChange?.('idle')
            toast({
                title: 'Sync failed',
                description: error.message,
                variant: 'destructive',
            })
        },
    })

    const disableSyncMutation = api.forms.disableSync.useMutation({
        onMutate: () => {
            onSavingStatusChange?.('saving')
        },
        onSuccess: () => {
            onSavingStatusChange?.('saved')
            setTimeout(() => onSavingStatusChange?.('idle'), 2000)
            toast({
                title: 'Sync disabled',
                description: 'Form is no longer syncing to sheet.',
            })
            syncStatus.refetch()
            setDisableSyncDialogId(null)
        },
        onError: (error) => {
            onSavingStatusChange?.('idle')
            toast({
                title: 'Failed to disable sync',
                description: error.message,
                variant: 'destructive',
            })
            setDisableSyncDialogId(null)
        },
    })

    const syncStatus = api.forms.getSyncStatus.useQuery({ formId: form.id })

    // Query the file information to get parentId
    const fileInfo = api.files.getById.useQuery({ id: form.file.id })

    const handleUpdateSettings = () => {
        updateSettingsMutation.mutate({
            formId: form.id,
            ...formSettings,
        })
    }

    const handleSync = () => {
        syncMutation.mutate({
            formId: form.id,
            sheetName: `${form.title} - Live Sync`,
            parentId: fileInfo.data?.parentId ?? undefined,
        })
    }

    const handleDisableSync = (syncId: number) => {
        setDisableSyncDialogId(syncId)
    }

    const confirmDisableSync = () => {
        if (disableSyncDialogId) {
            disableSyncMutation.mutate({ syncId: disableSyncDialogId })
        }
    }

    const handleGoToSheet = (sheetId: number) => {
        navigateToFile(router, sheetId, FILE_TYPES.SHEET)
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

            {/* Live Sync */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Download className="h-5 w-5" />
                        Live Sync to Sheet
                    </CardTitle>
                    <CardDescription>
                        Create live-syncing sheets that automatically update
                        when new form submissions are received
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {syncStatus.data?.isSync ? (
                        <div className="space-y-4">
                            <div className="rounded-lg border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-4 dark:border-emerald-800 dark:from-emerald-950 dark:to-green-950">
                                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-medium mb-2">
                                    <CheckCircle className="h-5 w-5" />
                                    Live Sync Active
                                    <Badge
                                        variant="secondary"
                                        className="ml-2 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                                    >
                                        {syncStatus.data.syncedSheets.length}{' '}
                                        sheet
                                        {syncStatus.data.syncedSheets.length !==
                                        1
                                            ? 's'
                                            : ''}
                                    </Badge>
                                </div>
                                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                                    This form is automatically syncing
                                    submissions to the following sheets. New
                                    responses will appear in real-time.
                                </p>
                            </div>

                            {syncStatus.data.syncedSheets.map((sync) => (
                                <div
                                    key={sync.id}
                                    className="flex items-center justify-between p-4 border rounded-lg bg-card"
                                >
                                    <div className="space-y-1">
                                        <p className="font-medium">
                                            {sync.sheetName}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Last synced:{' '}
                                            {sync.lastSyncAt
                                                ? new Date(
                                                      sync.lastSyncAt
                                                  ).toLocaleString()
                                                : 'Never'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                handleGoToSheet(sync.sheetId)
                                            }
                                            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950 dark:border-blue-800"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                            Go To Sheet
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                handleDisableSync(sync.id)
                                            }
                                            disabled={
                                                disableSyncMutation.isPending
                                            }
                                            className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950 dark:border-red-800"
                                        >
                                            {disableSyncMutation.isPending ? (
                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Ban className="h-4 w-4" />
                                            )}
                                            Disable Sync
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Dialog
                            open={isExportDialogOpen}
                            onOpenChange={setIsExportDialogOpen}
                        >
                            <DialogTrigger asChild>
                                <Button variant="outline">
                                    <Download className="mr-2 h-4 w-4" />
                                    Sync to Sheet
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>
                                        Create Live Sync Sheet
                                    </DialogTitle>
                                    <DialogDescription>
                                        This will create a live-syncing sheet
                                        that automatically updates whenever new
                                        form submissions are received. The form
                                        data columns will be protected from
                                        editing.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="rounded-lg border p-4">
                                        <h4 className="font-medium mb-2">
                                            Live sync will include:
                                        </h4>
                                        <ul className="text-sm text-muted-foreground space-y-1">
                                            <li>
                                                • All current and future form
                                                responses
                                            </li>
                                            <li>
                                                • Automatic updates when new
                                                submissions arrive
                                            </li>
                                            <li>
                                                • Protected form data columns
                                                (non-editable)
                                            </li>
                                            <li>
                                                • Additional editable columns
                                                for your notes
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            setIsExportDialogOpen(false)
                                        }
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSync}
                                        disabled={syncMutation.isPending}
                                    >
                                        {syncMutation.isPending ? (
                                            <>
                                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                                Creating Sync...
                                            </>
                                        ) : (
                                            'Create Live Sync'
                                        )}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
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

            {/* Disable Sync Confirmation Modal */}
            <AlertDialog
                open={disableSyncDialogId !== null}
                onOpenChange={(open) => !open && setDisableSyncDialogId(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Disable Live Sync
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                            <p>
                                Are you sure you want to disable live sync for
                                this sheet? This action will stop automatic
                                updates when new form submissions are received.
                            </p>
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950 dark:border-amber-800">
                                <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                                    ⚠️ Important: Once disabled, this sheet
                                    cannot be resynced automatically. You would
                                    need to create a new sheet to restore live
                                    sync functionality.
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={confirmDisableSync}
                            disabled={disableSyncMutation.isPending}
                        >
                            {disableSyncMutation.isPending ? (
                                <>
                                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                    Disabling...
                                </>
                            ) : (
                                <>
                                    <Ban className="h-4 w-4 mr-2" />
                                    Disable Sync
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
