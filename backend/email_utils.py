import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from dotenv import load_dotenv

load_dotenv()

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

EMAIL_ADDRESS = os.environ.get("EMAIL_ADDRESS")
EMAIL_APP_PASSWORD = os.environ.get("EMAIL_APP_PASSWORD")


def send_email(to_address, subject, html_body):
    if not EMAIL_ADDRESS or not EMAIL_APP_PASSWORD:
        return False, (
            "EMAIL_ADDRESS / EMAIL_APP_PASSWORD not set. "
            "Copy .env.example to .env and fill in real values."
        )

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = EMAIL_ADDRESS
    message["To"] = to_address
    message.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(EMAIL_ADDRESS, EMAIL_APP_PASSWORD)
            server.sendmail(EMAIL_ADDRESS, to_address, message.as_string())
        return True, None
    except smtplib.SMTPAuthenticationError:
        return False, (
            "Gmail rejected the login. Double-check EMAIL_APP_PASSWORD is a "
            "16-character App Password, not your normal Gmail password, and "
            "that 2-Step Verification is turned on for this account."
        )
    except Exception as error:
        return False, str(error)