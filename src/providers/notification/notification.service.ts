import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { User } from '../../models/user/entities/user.entity';
import { FindOptionsWhere } from 'typeorm/find-options/FindOptionsWhere';
import { FirebaseService } from '../firebase/firebase.service';
import { HttpService } from '@nestjs/axios';
import { NotificationToken } from './entities/notificationToken.entity';

@Injectable()
export class NotificationService {
  constructor(
    private readonly firebase: FirebaseService,
    private axios: HttpService,
  ) {}

  async updateToken(uid: string, token?: string, isShop?: boolean) {
    if (!token) return;

    const value = await NotificationToken.update(
      { user: { id: uid }, token: token },
      { isShop: isShop },
    );

    // getRepository().update(
    //   { token: token, user: { id: uid } },
    //   { updateAt: new Date() },
    // );

    /// there are no token in database
    if (value.affected == 0) {
      await NotificationToken.save({
        user: { id: uid },
        token: token,
        isShop: isShop,
      });
    }
  }

  async sendNotificationToUser(params: {
    notification: admin.messaging.NotificationMessagePayload;
    hyperLink?: string;
    imageUrl?: string;
    user?: FindOptionsWhere<User>;
    isShop?: boolean;
  }): Promise<void> {
    const { notification, hyperLink, user, imageUrl, isShop } = params;

    const tokens = await NotificationToken.getRepository().find({
      where: { user: user, isShop: isShop },
    });

    const tokensArray = tokens.map((token) => token.token);

    // console.log(tokensArray);

    if (tokensArray.length == 0) return;

    return await this.sendNotification({
      notification: notification,
      hyperLink: hyperLink,
      token: tokensArray,
      imageUrl: imageUrl,
    });
  }

  async sendNotification(params: {
    notification: admin.messaging.NotificationMessagePayload;
    hyperLink?: string;
    imageUrl?: string;
    token: string | string[];
  }): Promise<void> {
    const { notification, token, imageUrl, hyperLink } = params;

    try {
      // const accessToken = await this.firebase.getAccessToken();
      const message = {
        notification: notification,
        android: {
          notification: {
            imageUrl: imageUrl,
          },
        },
        apns: {
          payload: {
            aps: {
              'mutable-content': 1,
            },
          },
          fcm_options: {
            image: imageUrl,
          },
        },
        token: Array.isArray(token) ? undefined : token,
        tokens: Array.isArray(token) ? token : undefined,
        data: { hyperLink, imageUrl },
      };

      this.firebase.messaging
        .sendEachForMulticast(message)
        .then(async (response) => {
          console.log('Notification sent successfully:', response.responses);

          if (response.failureCount > 0) {
            const failedTokens: string[] = [];
            response.responses.forEach((resp, index) => {
              if (!resp.success) {
                failedTokens.push(message.tokens[index]);
              }
            });

            await NotificationToken.getRepository().query(`
            DELETE FROM notification_token WHERE token IN (${failedTokens
              .map((t) => `'${t}'`)
              .join(',')})
          `);
          }
        })
        .catch((error) => {
          console.error('Error sending notification:', error);
        });

      // const response = await this.axios.post(
      //   `https://fcm.googleapis.com/v1/projects/${this.firebase.app.options.projectId}/messages:send`,
      //   message,
      //   {
      //     headers: {
      //       Authorization: `Bearer ${accessToken}`,
      //       'Content-Type': 'application/json',
      //     },
      //   },
      // );

      // console.log('Notification sent successfully:', response);
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }
}
