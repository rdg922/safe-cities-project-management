import { getAuth } from "@clerk/nextjs/server";

import type { NextRequest } from "next/server";
import { TRPCError } from "@trpc/server";

/**
 * Retrieves the authenticated user from the Clerk auth object
 * Returns null if the user is not authenticated
 */
export const getAuthUser = (req: NextRequest | { headers: Headers }) => {
  // getAuth() returns the auth object from the request
  const authObject = getAuth(req);
  const { userId } = authObject;

  if (!userId) {
    return null;
  }

  return {
    ...authObject,
    userId,
  };
};

/**
 * Checks if the user is authenticated 
 * Throws a TRPC error if not
 */
export const validateAuth = (req: NextRequest | { headers: Headers }) => {
  const authUser = getAuthUser(req);
  
  if (!authUser) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action",
    });
  }

  return authUser;
};
