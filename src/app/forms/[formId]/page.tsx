'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import { toast } from '~/hooks/use-toast'
import { FileHeader } from '~/components/file-header'
import { FormBuilder } from '~/components/form-builder'
import { FormPreview } from '~/components/form-preview'
import { FormSettings } from '~/components/form-settings'
import { api } from '~/trpc/react'
import { Button } from '~/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Eye, Edit, Settings, BarChart3, Download } from 'lucide-react'

type Permission = 'view' | 'comment' | 'edit'

export default function FormView() {
    const params = useParams()
    const formId = Number(params.formId)
    const [activeTab, setActiveTab] = useState('builder')

    const {
        data: formData,
        isLoading,
        error,
        refetch,
    } = api.forms.getByFileId.useQuery(
        { fileId: formId },
        { enabled: !!formId && !isNaN(formId) }
    )

    const { data: userPermission } = api.permissions.getUserPermission.useQuery(
        { fileId: formData?.file.id || 0 },
        { enabled: !!formData?.file.id }
    )

    const { data: stats } = api.forms.getStatistics.useQuery(
        { formId: formData?.id || 0 },
        { enabled: !!formData?.id && activeTab === 'analytics' }
    )

    const { data: submissions } = api.forms.getSubmissions.useQuery(
        { formId: formData?.id || 0 },
        { enabled: !!formData?.id && activeTab === 'analytics' }
    )

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Loading form...
                    </p>
                </div>
            </div>
        )
    }

    if (error || !formData) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <p className="text-lg font-semibold text-destructive">
                        Error loading form
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {error?.message || 'Form not found'}
                    </p>
                </div>
            </div>
        )
    }

    const canEdit = userPermission === 'edit'

    return (
        <div className="flex h-screen flex-col">
            <FileHeader
                filename={formData.file.name}
                fileId={formData.file.id}
                permission={userPermission as Permission}
                savingStatus="idle"
            />

            <div className="flex-1 overflow-hidden">
                <div className="h-full p-6">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">
                                {formData.title}
                            </h1>
                            {formData.description && (
                                <p className="mt-1 text-muted-foreground">
                                    {formData.description}
                                </p>
                            )}
                            <div className="mt-2 flex items-center gap-2">
                                <Badge
                                    variant={
                                        formData.isPublished
                                            ? 'default'
                                            : 'secondary'
                                    }
                                >
                                    {formData.isPublished
                                        ? 'Published'
                                        : 'Draft'}
                                </Badge>
                                <Badge
                                    variant={
                                        formData.acceptingResponses
                                            ? 'default'
                                            : 'destructive'
                                    }
                                >
                                    {formData.acceptingResponses
                                        ? 'Accepting Responses'
                                        : 'Closed'}
                                </Badge>
                                {stats && (
                                    <Badge variant="outline">
                                        {stats.totalSubmissions} responses
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    <Tabs
                        value={activeTab}
                        onValueChange={setActiveTab}
                        className="h-full"
                    >
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger
                                value="builder"
                                className="flex items-center gap-2"
                            >
                                <Edit size={16} />
                                Builder
                            </TabsTrigger>
                            <TabsTrigger
                                value="preview"
                                className="flex items-center gap-2"
                            >
                                <Eye size={16} />
                                Preview
                            </TabsTrigger>
                            <TabsTrigger
                                value="analytics"
                                className="flex items-center gap-2"
                            >
                                <BarChart3 size={16} />
                                Analytics
                            </TabsTrigger>
                            <TabsTrigger
                                value="settings"
                                className="flex items-center gap-2"
                            >
                                <Settings size={16} />
                                Settings
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="builder" className="mt-6 h-full">
                            {canEdit ? (
                                <FormBuilder
                                    form={formData}
                                    onUpdate={() => refetch()}
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center">
                                    <p className="text-muted-foreground">
                                        You don't have permission to edit this
                                        form
                                    </p>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="preview" className="mt-6 h-full">
                            <FormPreview
                                form={{
                                    ...formData,
                                    isPublished: formData.isPublished ?? false,
                                    acceptingResponses:
                                        formData.acceptingResponses ?? false,
                                    showProgressBar:
                                        formData.showProgressBar ?? false,
                                    allowAnonymous:
                                        formData.allowAnonymous ?? false,
                                    oneResponsePerUser:
                                        formData.oneResponsePerUser ?? false,
                                }}
                            />
                        </TabsContent>

                        <TabsContent
                            value="analytics"
                            className="mt-6 space-y-6"
                        >
                            <div className="grid gap-6 md:grid-cols-3">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            Total Responses
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {stats?.totalSubmissions || 0}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            Form Fields
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {formData.fields.length}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            Completion Rate
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {formData.fields.length > 0
                                                ? '100%'
                                                : '0%'}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {submissions && submissions.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            Recent Submissions
                                        </CardTitle>
                                        <CardDescription>
                                            Latest responses to your form
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {submissions
                                                .slice(0, 5)
                                                .map((submission) => (
                                                    <div
                                                        key={submission.id}
                                                        className="flex items-center justify-between border-b pb-2"
                                                    >
                                                        <div>
                                                            <p className="font-medium">
                                                                {submission.user
                                                                    ?.name ||
                                                                    submission.submitterName ||
                                                                    'Anonymous'}
                                                            </p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {new Date(
                                                                    submission.createdAt
                                                                ).toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <Badge variant="outline">
                                                            {
                                                                submission
                                                                    .responses
                                                                    .length
                                                            }{' '}
                                                            responses
                                                        </Badge>
                                                    </div>
                                                ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        <TabsContent value="settings" className="mt-6">
                            {canEdit ? (
                                <FormSettings
                                    form={formData}
                                    onUpdate={() => refetch()}
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center">
                                    <p className="text-muted-foreground">
                                        You don't have permission to modify
                                        settings
                                    </p>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}
