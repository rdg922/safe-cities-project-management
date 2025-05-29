import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { db } from '~/server/db'
import { users } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
    try {
        const evt = await verifyWebhook(req)

        const { id } = evt.data
        const eventType = evt.type
        console.log(
            `Received webhook with ID ${id} and event type of ${eventType}`
        )

        // Handle user creation and updates
        if (eventType === 'user.created') {
            const {
                id: userId,
                email_addresses,
                first_name,
                last_name,
            } = evt.data

            // Get primary email
            const primaryEmail = email_addresses.find(
                (email: any) => email.id === evt.data.primary_email_address_id
            )

            if (userId && primaryEmail) {
                console.log(
                    `Creating new user: ${userId} with email: ${primaryEmail.email_address}`
                )

                try {
                    // Check if user already exists
                    const existingUser = await db.query.users.findFirst({
                        where: eq(users.id, userId),
                    })

                    if (!existingUser) {
                        // Insert new user
                        await db.insert(users).values({
                            id: userId,
                            name:
                                first_name + (last_name ? ' ' + last_name : ''),
                            email: primaryEmail.email_address,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        })
                        console.log(`User ${userId} created successfully`)
                    } else {
                        console.log(`User ${userId} already exists in database`)
                    }
                } catch (error) {
                    console.error('Error creating user in database:', error)
                }
            }
        }
        // Handle email updates
        else if (eventType === 'user.updated') {
            const { id: userId, email_addresses } = evt.data

            // Get primary email
            const primaryEmail = email_addresses.find(
                (email: any) => email.id === evt.data.primary_email_address_id
            )

            if (userId && primaryEmail) {
                console.log(
                    `Updating user: ${userId} with email: ${primaryEmail.email_address}`
                )

                try {
                    await db
                        .update(users)
                        .set({
                            email: primaryEmail.email_address,
                            updatedAt: new Date(),
                        })
                        .where(eq(users.id, userId))
                    console.log(`User ${userId} updated successfully`)
                } catch (error) {
                    console.error('Error updating user in database:', error)
                }
            }
        }
        // Handle user deletion
        else if (eventType === 'user.deleted') {
            const userId = id

            if (userId) {
                console.log(`Deleting user: ${userId}`)

                try {
                    await db.delete(users).where(eq(users.id, userId))
                    console.log(`User ${userId} deleted successfully`)
                } catch (error) {
                    console.error('Error deleting user from database:', error)
                }
            }
        }

        return new Response('Webhook processed', { status: 200 })
    } catch (err) {
        console.error('Error verifying webhook:', err)
        return new Response('Error verifying webhook', { status: 400 })
    }
}
