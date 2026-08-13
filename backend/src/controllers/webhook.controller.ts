

import { Request, Response } from 'express';

import { WebhookService } from '../services/webhook.service';

export class WebhookController {
  private webhooks =
    new WebhookService();

  async uberWebhook(
    req: Request,
    res: Response
  ) {
    try {
      const signature =
        req.headers[
          'x-uber-signature'
        ] as string;

      const externalStoreId =
        req.headers[
          'x-store-id'
        ] as string;

      await this.webhooks.handleUberWebhook(
        externalStoreId,
        signature,
        req.body
      );

      res.status(200).json({
        success: true,
      });
    } catch (err) {
      console.error(
        'Uber webhook error',
        err
      );

      res.status(400).json({
        success: false,
      });
    }
  }

  async deliveryHeroWebhook(
    req: Request,
    res: Response
  ) {
    try {
      const signature =
        req.headers[
          'x-dh-signature'
        ] as string;

      const externalStoreId =
        req.headers[
          'x-store-id'
        ] as string;

      await this.webhooks.handleDeliveryHeroWebhook(
        externalStoreId,
        signature,
        req.body
      );

      res.status(200).json({
        success: true,
      });
    } catch (err) {
      console.error(
        'Delivery Hero webhook error',
        err
      );

      res.status(400).json({
        success: false,
      });
    }
  }
}

