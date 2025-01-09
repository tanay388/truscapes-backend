import { Injectable } from '@nestjs/common';

import * as admin from 'firebase-admin';

import DecodedIdToken = admin.auth.DecodedIdToken;
import Auth = admin.auth.Auth;
import { ConfigService } from '@nestjs/config';
import { UserRecord } from 'firebase-admin/lib/auth/user-record';
import axios from 'axios';
export type FirebaseUser = DecodedIdToken;

@Injectable()
export class FirebaseService {
  auth: Auth;
  app: admin.app.App;
  messaging: admin.messaging.Messaging;
  //   webApiKey: String;

  /**
   * Initializes the FirebaseService.
   * If the Firebase app has not been initialized, it initializes it with the provided
   * configuration. If the app has already been initialized, it just returns the existing
   * app.
   */
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
        // console.log(token)
        const user = await this.auth.getUser(token.replace('id ', ''));
        // token = user;
        const user_decoded_id =
          await this.transformUserRecordToTokenFormat(user);
        // console.log(user_decoded_id);
        return user_decoded_id;
      }
      const value = await this.auth.verifyIdToken(token, true);
      // const v2= await this.auth.verifynm

      return value;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async transformUserRecordToTokenFormat(
    userRecord: UserRecord,
  ): Promise<DecodedIdToken> {
    try {
      // Assuming displayName and photoURL are present in the userRecord
      const userProfile: DecodedIdToken = {
        name: userRecord.displayName,
        picture: userRecord.photoURL,
        iss: 'https://securetoken.google.com/' + process.env.GOOGLE_PROJECT_ID,
        aud: process.env.GOOGLE_PROJECT_ID,
        auth_time: Math.floor(Date.now() / 1000),
        user_id: userRecord.uid,
        sub: userRecord.uid,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // Set expiration time (1 hour from now)
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
