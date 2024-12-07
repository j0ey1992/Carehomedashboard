declare module '@sendgrid/mail' {
  export interface MailDataRequired {
    to: string;
    from: string;
    subject: string;
    text?: string;
    html?: string;
    templateId?: string;
    dynamicTemplateData?: Record<string, any>;
  }

  export function setApiKey(apiKey: string): void;
  export function send(data: MailDataRequired | MailDataRequired[]): Promise<[{
    statusCode: number;
    headers: any;
    body: any;
  }, {}]>;
}
