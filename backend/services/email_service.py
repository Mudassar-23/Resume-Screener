import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_candidate_email(to_email: str, subject: str, body: str) -> bool:
    """
    Attempts to send email via SMTP if configured.
    Otherwise, logs/mocks the email delivery in the console.
    """
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    smtp_from = os.getenv("SMTP_FROM", "")
    
    # If credentials are not configured, print to stdout (mock delivery)
    if not smtp_user or smtp_user == "your-email@gmail.com" or not smtp_password:
        print("\n" + "="*50)
        print("MOCK EMAIL SENT:")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(f"Body:\n{body}")
        print("="*50 + "\n")
        return True

    try:
        msg = MIMEMultipart()
        msg['From'] = smtp_from or smtp_user
        msg['To'] = to_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Connect to SMTP Server
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.sendmail(msg['From'], to_email, msg.as_string())
        server.close()
        print(f"SUCCESS: Email sent to {to_email}")
        return True
    except Exception as e:
        print(f"ERROR: Failed to send email to {to_email}: {e}")
        # Print fallback so the HR flow doesn't crash on bad SMTP config
        print("\n" + "="*50)
        print("FALLBACK MOCK EMAIL:")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(f"Body:\n{body}")
        print("="*50 + "\n")
        return False
