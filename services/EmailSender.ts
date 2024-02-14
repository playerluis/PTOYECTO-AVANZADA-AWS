import nodemailer from 'nodemailer';

export default class EmailSender {
	private transporter: nodemailer.Transporter;
	
	constructor() {
		this.transporter = nodemailer.createTransport({
			service: 'gmail',
			auth: {
				user: 'luidmidev@gmail.com',
				pass: 'jcog zgcn nygp llsi',
			},
		});
	}
	
	async send(to: string, subject: string, text: string): Promise<void> {
		await this.transporter.sendMail({
			from: 'luidmidev@gmail.com',
			to,
			subject,
			text
		});
	}
	
	async sendHtml(to: string, subject: string, html: string): Promise<void> {
		await this.transporter.sendMail({
			from: 'luidmidev@gmail.com',
			to,
			subject,
			html
		});
	}
}
