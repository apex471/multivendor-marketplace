// Dummy database configuration for Firebase migration backwards compatibility.
// Firebase handles connection pooling and singletons internally via firebase-admin.

export async function connectDB(): Promise<any> {
  return null;
}

export async function disconnectDB(): Promise<void> {
  // No-op
}
