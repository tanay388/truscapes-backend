import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { FirebaseService } from '../../../providers/firebase/firebase.service';

@Injectable()
export class FirebaseUserMiddlewareExtractor implements NestMiddleware {
  constructor(private firebaseService: FirebaseService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    if (req.headers.authorization) {
      await this.firebaseService
        .getUserProfile(req.headers.authorization.replace('Bearer ', ''))
        .then((v) => {
          (req as any).user = v;
        })
        .catch((e) => {
          //
        });
    }

    next();
  }
}
