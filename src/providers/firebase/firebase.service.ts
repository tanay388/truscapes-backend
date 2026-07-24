import { Injectable } from '@nestjs/common';

import * as admin from 'firebase-admin';

import DecodedIdToken = admin.auth.DecodedIdToken;
import Auth = admin.auth.Auth;
import { UserRecord } from 'firebase-admin/lib/auth/user-record';
export type FirebaseUser = DecodedIdToken;

type CachedToken = {
  user: FirebaseUser;
  expiresAtMs: number;
};

@Injectable()
export class FirebaseService {
  auth: Auth;
  app: admin.app.App;
  messaging: admin.messaging.Messaging;

  /** Avoid re-verifying the same Bearer token on every API call in a session. */
  private readonly tokenCache = new Map<string, CachedToken>();
  private readonly tokenCacheMaxEntries = 500;

  constructor() {
    if (admin.apps.length === 0) {
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.GOOGLE_PROJECT_ID,
          clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
          privateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
    } else {
      this.app = admin.app();
    }

    this.auth = admin.auth();
    this.messaging = admin.messaging();
  }

  async getUserProfile(token: string): Promise<FirebaseUser> {
    try {
      if (token.startsWith('id')) {
        const user = await this.auth.getUser(token.replace('id ', ''));
        return await this.transformUserRecordToTokenFormat(user);
      }

      const cached = this.tokenCache.get(token);
      if (cached && cached.expiresAtMs > Date.now()) {
        return cached.user;
      }

      // checkRevoked=false: verify JWT locally with cached Google public keys.
      const value = await this.auth.verifyIdToken(token, false);

      // Cache until just before JWT expiry (cap at 5 minutes).
      const jwtExpMs = (value.exp || 0) * 1000;
      const expiresAtMs = Math.min(jwtExpMs - 30_000, Date.now() + 5 * 60_000);
      if (expiresAtMs > Date.now()) {
        if (this.tokenCache.size >= this.tokenCacheMaxEntries) {
          const firstKey = this.tokenCache.keys().next().value;
          if (firstKey) this.tokenCache.delete(firstKey);
        }
        this.tokenCache.set(token, { user: value, expiresAtMs });
      }

      return value;
    } catch (e) {
      this.tokenCache.delete(token);
      console.error(e);
      throw e;
    }
  }

  async transformUserRecordToTokenFormat(
    userRecord: UserRecord,
  ): Promise<DecodedIdToken> {
    try {
      const userProfile: DecodedIdToken = {
        name: userRecord.displayName,
        picture: userRecord.photoURL,
        iss: 'https://securetoken.google.com/' + process.env.GOOGLE_PROJECT_ID,
        aud: process.env.GOOGLE_PROJECT_ID,
        auth_time: Math.floor(Date.now() / 1000),
        user_id: userRecord.uid,
        sub: userRecord.uid,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        email: userRecord.email,
        email_verified: userRecord.emailVerified,
        firebase: {
          identities: {
            'google.com': [[]],
            email: [[]],
          },
          sign_in_provider: 'google.com',
        },
        uid: userRecord.uid,
      };

      return userProfile;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async getAccessToken(): Promise<string> {
    const accessToken = await this.app.options.credential.getAccessToken();
    return accessToken.access_token;
  }
}
