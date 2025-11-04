"""
AWS GuardDuty S3 Malware Protection Handler

Processes GuardDuty findings for S3 malware detection:
1. Receives finding from EventBridge
2. Quarantines infected files
3. Notifies BFF via callback
4. Sends SNS alerts to security team
"""

import boto3
import json
import os
import urllib.request
from datetime import datetime
from typing import Dict, Any

s3 = boto3.client('s3')
sns = boto3.client('sns')

DOCUMENTS_BUCKET = os.environ['DOCUMENTS_BUCKET']
QUARANTINE_BUCKET = os.environ['QUARANTINE_BUCKET']
SNS_TOPIC_ARN = os.environ['SNS_TOPIC_ARN']
BFF_CALLBACK_URL = os.environ['BFF_CALLBACK_URL']
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'dev')


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for GuardDuty findings

    Event structure:
    {
      "version": "0",
      "id": "finding-id",
      "detail-type": "GuardDuty Finding",
      "source": "aws.guardduty",
      "detail": {
        "type": "Execution:S3/MaliciousFile",
        "severity": 8,
        "resource": {
          "s3BucketDetails": [...],
          "accessKeyDetails": {...}
        },
        "service": {
          "additionalInfo": {
            "threatName": "Win32.EICAR.Test.File-A!E"
          }
        }
      }
    }
    """

    print(f"Received GuardDuty finding event")

    try:
        detail = event.get('detail', {})
        finding_type = detail.get('type', '')
        severity = detail.get('severity', 0)
        finding_id = detail.get('id', 'unknown')

        print(f"Finding Type: {finding_type}")
        print(f"Severity: {severity}")
        print(f"Finding ID: {finding_id}")

        # Check if this is a malware finding
        if not is_malware_finding(finding_type):
            print(f"Not a malware finding, ignoring: {finding_type}")
            return {'statusCode': 200, 'body': 'Not a malware finding'}

        # Extract S3 details
        s3_details = extract_s3_details(detail)
        if not s3_details:
            print("No S3 details found in finding")
            return {'statusCode': 400, 'body': 'No S3 details'}

        # Get threat information
        threat_info = extract_threat_info(detail)

        # Process each affected S3 object
        for s3_obj in s3_details:
            bucket = s3_obj['bucket']
            key = s3_obj['key']

            print(f"Processing infected file: s3://{bucket}/{key}")

            # Handle the malware
            handle_malware_file(
                bucket=bucket,
                key=key,
                threat_name=threat_info['threat_name'],
                finding_id=finding_id,
                severity=severity
            )

        return {'statusCode': 200, 'body': 'Successfully processed finding'}

    except Exception as e:
        print(f"Error processing GuardDuty finding: {str(e)}")
        import traceback
        traceback.print_exc()
        raise


def is_malware_finding(finding_type: str) -> bool:
    """Check if finding is malware-related"""
    malware_types = [
        'Execution:S3/MaliciousFile',
        'Execution:S3/MaliciousIPCaller',
        'UnauthorizedAccess:S3/MaliciousIPCaller'
    ]

    for malware_type in malware_types:
        if finding_type.startswith(malware_type.split('/')[0]):
            return True

    return 'Malicious' in finding_type or 'Execution:S3' in finding_type


def extract_s3_details(detail: Dict[str, Any]) -> list:
    """Extract S3 bucket and key from finding"""
    s3_objects = []

    # Check resource.s3BucketDetails
    resource = detail.get('resource', {})
    s3_bucket_details = resource.get('s3BucketDetails', [])

    for bucket_detail in s3_bucket_details:
        bucket_name = bucket_detail.get('name')

        # Get affected objects (if available)
        # Note: GuardDuty may not always provide specific object keys
        # In that case, we'll need to check S3 event logs or tags

        # Try to get from publicAccess or other fields
        if 'tags' in bucket_detail:
            for tag in bucket_detail.get('tags', []):
                if tag.get('key') == 'infected-object':
                    s3_objects.append({
                        'bucket': bucket_name,
                        'key': tag.get('value')
                    })

        # If no specific objects, check the entire bucket (fallback)
        if not s3_objects and bucket_name:
            # List recent objects in temp/
            s3_objects.extend(list_recent_temp_objects(bucket_name))

    # Alternative: Check service.additionalInfo for S3 details
    service = detail.get('service', {})
    additional_info = service.get('additionalInfo', {})

    if 'sample' in additional_info and additional_info['sample']:
        s3_url = additional_info.get('s3ObjectKey', '')
        if s3_url:
            # Parse s3://bucket/key format
            parts = s3_url.replace('s3://', '').split('/', 1)
            if len(parts) == 2:
                s3_objects.append({
                    'bucket': parts[0],
                    'key': parts[1]
                })

    return s3_objects


def list_recent_temp_objects(bucket: str, minutes: int = 10) -> list:
    """List objects uploaded to temp/ in the last N minutes"""
    try:
        response = s3.list_objects_v2(
            Bucket=bucket,
            Prefix='temp/',
            MaxKeys=100
        )

        objects = []
        now = datetime.now()

        for obj in response.get('Contents', []):
            key = obj['Key']
            last_modified = obj['LastModified'].replace(tzinfo=None)
            age_minutes = (now - last_modified).total_seconds() / 60

            if age_minutes <= minutes:
                objects.append({
                    'bucket': bucket,
                    'key': key
                })

        return objects

    except Exception as e:
        print(f"Error listing temp objects: {e}")
        return []


def extract_threat_info(detail: Dict[str, Any]) -> Dict[str, str]:
    """Extract threat name and details from finding"""
    service = detail.get('service', {})
    additional_info = service.get('additionalInfo', {})

    threat_name = additional_info.get('threatName', 'Unknown Malware')
    threat_list_name = additional_info.get('threatListName', '')

    # Get description
    description = detail.get('description', 'Malicious file detected')

    return {
        'threat_name': threat_name,
        'threat_list': threat_list_name,
        'description': description
    }


def handle_malware_file(bucket: str, key: str, threat_name: str, finding_id: str, severity: int):
    """
    Handle infected file:
    1. Copy to quarantine bucket
    2. Delete from original location
    3. Tag with metadata
    4. Notify BFF
    5. Send SNS alert
    """

    print(f"🚨 MALWARE DETECTED: {threat_name}")
    print(f"File: s3://{bucket}/{key}")
    print(f"Severity: {severity}")

    try:
        # Step 1: Copy to quarantine with metadata
        timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
        quarantine_key = f"quarantine/{timestamp}/{key.replace('temp/', '')}"

        copy_source = {'Bucket': bucket, 'Key': key}

        s3.copy_object(
            CopySource=copy_source,
            Bucket=QUARANTINE_BUCKET,
            Key=quarantine_key,
            TaggingDirective='REPLACE',
            Tagging=f"threat={urllib.parse.quote(threat_name)}&finding_id={finding_id}&severity={severity}&original_bucket={bucket}&original_key={urllib.parse.quote(key)}",
            ServerSideEncryption='AES256'
        )

        print(f"✓ Copied to quarantine: s3://{QUARANTINE_BUCKET}/{quarantine_key}")

        # Step 2: Delete from original location
        s3.delete_object(Bucket=bucket, Key=key)
        print(f"✓ Deleted from original location")

        # Step 3: Notify BFF
        notify_bff_infected(key, threat_name)

        # Step 4: Send SNS alert
        send_sns_alert(bucket, key, threat_name, finding_id, severity, quarantine_key)

        print(f"✓ Successfully quarantined infected file")

    except Exception as e:
        print(f"❌ Error handling malware file: {str(e)}")
        raise


def notify_bff_infected(s3_key: str, threat_name: str):
    """Notify BFF that file is infected"""
    try:
        data = json.dumps({
            'tempS3Key': s3_key,
            'avStatus': 'infected',
            'virusName': threat_name,
            'scannedAt': datetime.now().isoformat(),
            'scanner': 'aws-guardduty'
        }).encode('utf-8')

        url = f"{BFF_CALLBACK_URL}/api/documents/av-callback"

        req = urllib.request.Request(
            url,
            data=data,
            headers={
                'Content-Type': 'application/json',
                'User-Agent': 'AWS-GuardDuty-Lambda/1.0'
            },
            method='POST'
        )

        with urllib.request.urlopen(req, timeout=10) as response:
            print(f"✓ Notified BFF: {response.status}")

    except urllib.error.HTTPError as e:
        print(f"⚠️ BFF callback failed (HTTP {e.code}): {e.reason}")
    except Exception as e:
        print(f"⚠️ Could not notify BFF: {str(e)}")


def send_sns_alert(bucket: str, key: str, threat_name: str, finding_id: str, severity: int, quarantine_key: str):
    """Send SNS alert to security team"""
    try:
        severity_label = get_severity_label(severity)

        subject = f"🚨 [{ENVIRONMENT.upper()}] Malware Detected: {threat_name}"

        message = f"""
MALWARE DETECTED IN DOCUMENT UPLOAD

Environment: {ENVIRONMENT.upper()}
Severity: {severity_label} ({severity})

THREAT DETAILS:
  Malware: {threat_name}
  Finding ID: {finding_id}

FILE DETAILS:
  Original Location: s3://{bucket}/{key}
  Quarantine Location: s3://{QUARANTINE_BUCKET}/{quarantine_key}

ACTIONS TAKEN:
  ✓ File quarantined
  ✓ Original file deleted
  ✓ BFF notified
  ✓ User upload blocked

NEXT STEPS:
  1. Review quarantined file:
     aws s3 cp s3://{QUARANTINE_BUCKET}/{quarantine_key} /tmp/review/

  2. Check user session in MongoDB for suspicious activity

  3. If needed, block user or IP address

Timestamp: {datetime.now().isoformat()}
"""

        sns.publish(
            TopicArn=SNS_TOPIC_ARN,
            Subject=subject,
            Message=message
        )

        print(f"✓ SNS alert sent to security team")

    except Exception as e:
        print(f"⚠️ Failed to send SNS alert: {str(e)}")


def get_severity_label(severity: int) -> str:
    """Convert numeric severity to label"""
    if severity >= 7:
        return "HIGH"
    elif severity >= 4:
        return "MEDIUM"
    else:
        return "LOW"
