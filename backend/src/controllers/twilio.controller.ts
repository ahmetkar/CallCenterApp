import {
  Request,
  Response,
} from 'express';

import dotenv from 'dotenv';
import { TwilioAdapter } from '../integrations/telephony/twilio.adapter';
dotenv.config();



export class TwilioController {
  /**
   * TwilioAdapter'ı constructor'da
   * oluşturuyoruz.
   */
  private twilio =
    new TwilioAdapter();


    async streamStatus(
  req: Request,
  res: Response
): Promise<void> {
  console.log(
    '========== TWILIO STREAM STATUS =========='
  );

  console.log(
    JSON.stringify(
      req.body,
      null,
      2
    )
  );

  console.log(
    '=========================================='
  );

  res.sendStatus(200);
}



  /**
   * INBOUND CALL
   *
   * Telefon → Twilio → bu endpoint
   */



  async incomingCall(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const streamUrl =
        process.env.TWILIO_STREAM_URL;

      if (!streamUrl) {
        throw new Error(
          'TWILIO_STREAM_URL is missing'
        );
      }

      const twiml =
        this.twilio
          .generateMediaStreamResponse(
            streamUrl
          );

      console.log(
        'Twilio incoming call'
      );

      console.log(
        'Media Stream:',
        streamUrl
      );

      res
        .status(200)
        .type('text/xml')
        .send(twiml);

    } catch (err) {
      console.error(
        'Twilio incoming call error:',
        err
      );

      res
        .status(500)
        .send(
          'Unable to process call'
        );
    }
  }

  /**
   * OUTBOUND CALL
   *
   * Backend → Twilio → telefon
   */
 async outboundCall(
  req: Request,
  res: Response
) {
  try {

    console.log(
      '========== OUTBOUND CALL =========='
    );

    console.log(
      'Request body:',
      req.body
    );

    console.log(
      'To:',
      req.body?.to
    );

    console.log(
      'TWILIO_INCOMING_URL:',
      process.env.TWILIO_INCOMING_URL
    );

    const {
      to
    } = req.body;

    if (!to) {
      res.status(400).json({
        success: false,
        error:
          'to number is required',
      });

      return;
    }

    const call =
      await this.twilio.createCall(
        to,
        process.env
          .TWILIO_INCOMING_URL!
      );

    console.log(
      'Twilio call created:',
      call.sid
    );

    res.status(200).json({
      success: true,
      sid: call.sid,
    });

  } catch (err: any) {

    console.error(
      '========== TWILIO OUTBOUND ERROR =========='
    );

    console.error(
      'Message:',
      err?.message
    );

    console.error(
      'Code:',
      err?.code
    );

    console.error(
      'Status:',
      err?.status
    );

    console.error(
      'More info:',
      err?.moreInfo
    );

    console.error(
      'Response:',
      err?.response?.data
    );

    console.error(
      '============================================'
    );

    res.status(
      err?.status ?? 500
    ).json({
      success: false,
      error:
        err?.message ??
        'Unable to make call',
      code:
        err?.code,
    });
  }
}

}