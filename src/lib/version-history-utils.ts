import { eq, and } from 'drizzle-orm'
import { pageVersionHistory } from '~/server/db/schema'
import { db } from '~/server/db'

/**
 * Saves content to version history, updating timestamp if content already exists
 * instead of creating duplicate entries
 */
export async function saveVersionHistoryWithDeduplication(
    database: typeof db,
    {
        fileId,
        content,
        version,
        createdBy,
        changeDescription = 'Auto-saved version',
    }: {
        fileId: number
        content: string
        version: number
        createdBy: string
        changeDescription?: string
    }
) {
    try {
        // Check if this exact content already exists for this file
        const existingVersion = await database.query.pageVersionHistory.findFirst({
            where: and(
                eq(pageVersionHistory.fileId, fileId),
                eq(pageVersionHistory.content, content)
            ),
            columns: { id: true, createdAt: true },
        })

        if (existingVersion) {
            // Update the timestamp of the existing version instead of creating a duplicate
            await database
                .update(pageVersionHistory)
                .set({
                    createdAt: new Date(),
                    createdBy,
                    changeDescription,
                })
                .where(eq(pageVersionHistory.id, existingVersion.id))
            
            return { updated: true, versionId: existingVersion.id }
        } else {
            // Create new version history entry
            const [newVersion] = await database
                .insert(pageVersionHistory)
                .values({
                    fileId,
                    content,
                    version,
                    createdBy,
                    changeDescription,
                })
                .returning({ id: pageVersionHistory.id })
            
            return { updated: false, versionId: newVersion?.id }
        }
    } catch (error) {
        // If there's a unique constraint violation (should be rare with our pre-check),
        // fall back to updating the existing record
        if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
            const existingVersion = await database.query.pageVersionHistory.findFirst({
                where: and(
                    eq(pageVersionHistory.fileId, fileId),
                    eq(pageVersionHistory.content, content)
                ),
                columns: { id: true },
            })

            if (existingVersion) {
                await database
                    .update(pageVersionHistory)
                    .set({
                        createdAt: new Date(),
                        createdBy,
                        changeDescription,
                    })
                    .where(eq(pageVersionHistory.id, existingVersion.id))
                
                return { updated: true, versionId: existingVersion.id }
            }
        }
        
        // Re-throw if it's not a duplicate constraint error
        throw error
    }
}
